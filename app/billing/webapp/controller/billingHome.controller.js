sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], (Controller, JSONModel, MessageBox) => {
    "use strict";

    return Controller.extend("billing.controller.billingHome", {

        onInit() {

            const oViewModel = new JSONModel({
                dealerName: "",
                fundAvailability: "",
                limitAvailability: "",
                infOtherAmount: "",
                Model: [],
                dealerSelected: false,   // ⭐ important

                totalStock: 0,
                totalAvailable: 0,
                // totalOrderQty: 0,
                totalFundRequired: 0,
                totalAllocationQty: 0,
                totalOrderValue: 0
            });



            this.getView().setModel(oViewModel, "view");
        }

        ,

        onDealerSuggest(oEvent) {

            const sValue = oEvent.getParameter("suggestValue")?.trim();
            const oInput = oEvent.getSource();
            const oBinding = oInput.getBinding("suggestionRows");

            if (!oBinding) return;

            if (!sValue) {
                oBinding.filter([]);
                oBinding.refresh();
                return;
            }

            const Filter = sap.ui.model.Filter;
            const FilterOperator = sap.ui.model.FilterOperator;

            const oFilter = new Filter({
                filters: [
                    new Filter("dealerID", FilterOperator.StartsWith, sValue),
                    new Filter("dealerName", FilterOperator.Contains, sValue)
                ],
                and: false
            });

            oBinding.filter([oFilter]);
            oBinding.refresh(); 
        },
        onDealerSelect(oEvent) {

            const oRow = oEvent.getParameter("selectedRow");
            if (!oRow) return;

            const oContext = oRow.getBindingContext();
            const oDealer = oContext.getObject();
            const sDealerID = oDealer.dealerID;

            const oModel = this.getView().getModel(); 
            const oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/dealerSelected", true);

            const sPath = `/Dealer('${sDealerID}')`;

            oModel.bindContext(sPath).requestObject().then((oFullDealer) => {

                oViewModel.setProperty("/dealerName", oFullDealer.dealerName);
                oViewModel.setProperty("/fundAvailability", oFullDealer.fundAvailability);
                oViewModel.setProperty("/limitAvailability", oFullDealer.limitAvailability);
                oViewModel.setProperty("/infOtherAmount", oFullDealer.infOtherAmount);
                oViewModel.setProperty("/infType", oFullDealer.infType);



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
                oViewModel.setProperty("/dealerSelected", false);
            }
        },


        onDealerGo() {

            const oViewModel = this.getView().getModel("view");
            const oWizard = this.byId("BillingWizard");
            const oDealerStep = this.byId("DealerStep");

            const sDealerType = oViewModel.getProperty("/infType");   // INF / NON-INF
            const fFund = parseFloat(oViewModel.getProperty("/fundAvailability")) || 0;
            const fLimit = parseFloat(oViewModel.getProperty("/limitAvailability")) || 0;

            const MIN_FUND = 200000; 

            if (!sDealerType) {
                MessageBox.error("Please select a dealer before proceeding.");
                return;
            }

            if (fFund <= MIN_FUND) {
                MessageBox.error("Fund Availability must be above 2 Lakhs.");
                return;
            }

            if (sDealerType === "INF" && fLimit !== 0) {
                MessageBox.error("INF dealer must have Limit Available = 0.");
                return;
            }

            if (sDealerType === "NON-INF" && fLimit === 0) {
                MessageBox.error("NON-INF dealer must have Limit Available greater than 0.");
                return;
            }

            oDealerStep.setValidated(true);
            oWizard.nextStep();
            setTimeout(() => {
                this._calculateTotals();
            }, 300);


        },

        _calculateTotals() {

            const oTable = this.byId("allocationTable");
            const aItems = oTable.getItems();

            let totalStock = 0;
            let totalAvailable = 0;
            // let totalOrderQty = 0;
            let totalFundRequired = 0;
            let totalAllocationQty = 0;
            let totalOrderValue = 0;

            aItems.forEach(item => {

                const oData = item.getBindingContext().getObject();

                totalStock += parseFloat(oData.depotStock) || 0;
                totalAvailable += parseFloat(oData.availableStock) || 0;
                // totalOrderQty += parseFloat(oData.orderQty) || 0;
                totalFundRequired += parseFloat(oData.fundRequired) || 0;
                totalAllocationQty += parseFloat(oData.allocationQty) || 0;
                totalOrderValue += (parseFloat(oData.allocationQty) || 0) *
                                (parseFloat(oData.perBikeValue) || 0);
            });

            const oViewModel = this.getView().getModel("view");

            oViewModel.setProperty("/totalStock", totalStock);
            oViewModel.setProperty("/totalAvailable", totalAvailable);
            // oViewModel.setProperty("/totalOrderQty", totalOrderQty);
            oViewModel.setProperty("/totalFundRequired", totalFundRequired);
            oViewModel.setProperty("/totalAllocationQty", totalAllocationQty);
            oViewModel.setProperty("/totalOrderValue", totalOrderValue);
        },


        onAllocationChange(oEvent) {

            const oInput = oEvent.getSource();
            const oContext = oInput.getBindingContext();
            const oModel = oContext.getModel();
            const sPath = oContext.getPath();

            let iQty = parseInt(oInput.getValue(), 10) || 0;

            oModel.setProperty(sPath + "/allocationQty", iQty);

            const perBike = parseFloat(oModel.getProperty(sPath + "/perBikeValue")) || 0;
            oModel.setProperty(sPath + "/orderValue", iQty * perBike);

            this._calculateTotals();
        },

        onModelPrevious() {
        },

        onSaveAllocation() {
        }
    });
});