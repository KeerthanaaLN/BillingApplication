sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], (Controller, JSONModel) => {
    "use strict";

    return Controller.extend("billing.controller.billingHome", {

        onInit() {

            // UI State Model (only for selected dealer details)
            const oViewModel = new JSONModel({
                dealerName: "",
                fundAvailability: "",
                limitAvailability: "",
                infOtherAmount: "",
                Model: []
            });

            this.getView().setModel(oViewModel, "view");
        }
        ,

        onDealerSuggest(oEvent) {

            const sValue = oEvent.getParameter("suggestValue");
            const oInput = oEvent.getSource();
            const oBinding = oInput.getBinding("suggestionItems");

            if (!oBinding) return;

            if (!sValue) {
                oBinding.filter([]);
                return;
            }

            const Filter = sap.ui.model.Filter;
            const FilterOperator = sap.ui.model.FilterOperator;

            const oFilter = new Filter({
                filters: [
                    new Filter("dealerID", FilterOperator.Contains, sValue),
                    new Filter("dealerName", FilterOperator.Contains, sValue)
                ],
                and: false
            });

            oBinding.filter([oFilter]);
        },
        onDealerSelect(oEvent) {

            const oRow = oEvent.getParameter("selectedRow");
            if (!oRow) return;

            const oContext = oRow.getBindingContext();
            const oDealer = oContext.getObject();
            const sDealerID = oDealer.dealerID;

            const oModel = this.getView().getModel(); // OData V4 model
            const oViewModel = this.getView().getModel("view");

            // Bind selected dealer context (READ full entity)
            const sPath = `/Dealer('${sDealerID}')`;

            oModel.bindContext(sPath).requestObject().then((oFullDealer) => {

                oViewModel.setProperty("/dealerName", oFullDealer.dealerName);
                oViewModel.setProperty("/fundAvailability", oFullDealer.fundAvailability);
                oViewModel.setProperty("/limitAvailability", oFullDealer.limitAvailability);
                oViewModel.setProperty("/infOtherAmount", oFullDealer.infOtherAmount);

            });
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