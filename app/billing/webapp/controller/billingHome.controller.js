sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], (Controller, JSONModel) => {
    "use strict";

    return Controller.extend("billing.controller.billingHome", {

        onInit() {

            const oViewModel = new JSONModel({
                dealerName: "",
                fundAvailability: "",
                limitAvailability: "",
                infOtherAmount: "",
                Model: [],
                dealerSelected: false   // ⭐ important
            });

            this.getView().setModel(oViewModel, "view");
        }

        ,

        onDealerSuggest(oEvent) {

            const sValue = oEvent.getParameter("suggestValue")?.trim();
            const oInput = oEvent.getSource();
            const oBinding = oInput.getBinding("suggestionRows");

            if (!oBinding) return;

            // nothing typed → show nothing
            if (!sValue) {
                oBinding.filter([]);
                oBinding.refresh();
                return;
            }

            const Filter = sap.ui.model.Filter;
            const FilterOperator = sap.ui.model.FilterOperator;

            // STRICT match (starts with or contains based on your choice)
            const oFilter = new Filter({
                filters: [
                    new Filter("dealerID", FilterOperator.StartsWith, sValue),
                    new Filter("dealerName", FilterOperator.Contains, sValue)
                ],
                and: false
            });

            oBinding.filter([oFilter]);
            oBinding.refresh(); // ⭐ force backend request
        },
        onDealerSelect(oEvent) {

            const oRow = oEvent.getParameter("selectedRow");
            if (!oRow) return;

            const oContext = oRow.getBindingContext();
            const oDealer = oContext.getObject();
            const sDealerID = oDealer.dealerID;

            const oModel = this.getView().getModel(); // OData V4 model
            const oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/dealerSelected", true);

            // Bind selected dealer context (READ full entity)
            const sPath = `/Dealer('${sDealerID}')`;

            oModel.bindContext(sPath).requestObject().then((oFullDealer) => {

                oViewModel.setProperty("/dealerName", oFullDealer.dealerName);
                oViewModel.setProperty("/fundAvailability", oFullDealer.fundAvailability);
                oViewModel.setProperty("/limitAvailability", oFullDealer.limitAvailability);
                oViewModel.setProperty("/infOtherAmount", oFullDealer.infOtherAmount);

                oViewModel.setProperty("/dealerSelected", true); // enable GO
            });

        },
        onDealerLiveChange(oEvent) {

            const sValue = oEvent.getParameter("value");
            const oViewModel = this.getView().getModel("view");

            if (!sValue || sValue.trim() === "") {

                oViewModel.setProperty("/dealerName", "");
                oViewModel.setProperty("/fundAvailability", "");
                oViewModel.setProperty("/limitAvailability", "");
                oViewModel.setProperty("/infOtherAmount", "");
                oViewModel.setProperty("/dealerSelected", false); // disable GO
            }
            else {
                // user typing → not a confirmed selection
                oViewModel.setProperty("/dealerSelected", false);
            }
        },


        onDealerGo() {
            // Your Go button logic here
        },

        onAllocationChange(oEvent) {
            // Your allocation change logic here
        },

        onModelPrevious() {
            // Your previous button logic here
        },

        onSaveAllocation() {
            // Your save logic here
        }
    });
});