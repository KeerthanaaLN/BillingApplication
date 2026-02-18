sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, JSONModel, MessageBox, MessageToast, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("billing.controller.billingHome", {

        onInit() {

            const oViewModel = new JSONModel({
                dealerName: "",
                fundAvailability: "",
                limitAvailability: "",
                infOtherAmount: "",
                infType: "",
                selectedDealerID: "",
                dealerSelected: false,

                Model: [],

                totalStock: 0,
                totalAvailable: 0,
                totalFundRequired: 0,
                totalAllocationQty: 0,
                totalOrderValue: 0,

                modelDetails: [],
                showModelDetails: false,
                calculateEnabled: false

            });

            this.getView().setModel(oViewModel, "view");
        },

        onDealerSuggest(oEvent) {

            const sValue = oEvent.getParameter("suggestValue")?.trim();
            const oBinding = oEvent.getSource().getBinding("suggestionRows");

            if (!oBinding) return;

            if (!sValue) {
                oBinding.filter([]);
                return;
            }

            const oFilter = new Filter({
                filters: [
                    new Filter("dealerID", FilterOperator.StartsWith, sValue),
                    new Filter("dealerName", FilterOperator.Contains, sValue)
                ],
                and: false
            });

            oBinding.filter([oFilter]);
        },

        onDealerSelect(oEvent) {

            const oRow = oEvent.getParameter("selectedRow");
            if (!oRow) return;

            const oDealer = oRow.getBindingContext().getObject();
            const sDealerID = oDealer.dealerID;

            const oODataModel = this.getView().getModel();
            const oViewModel = this.getView().getModel("view");

            oViewModel.setProperty("/selectedDealerID", sDealerID);

            oODataModel.bindContext(`/Dealer('${sDealerID}')`)
                .requestObject()
                .then(oFullDealer => {

                    oViewModel.setProperty("/dealerName", oFullDealer.dealerName);
                    oViewModel.setProperty("/fundAvailability", oFullDealer.fundAvailability);
                    oViewModel.setProperty("/limitAvailability", oFullDealer.limitAvailability);
                    oViewModel.setProperty("/infOtherAmount", oFullDealer.infOtherAmount);
                    oViewModel.setProperty("/infType", oFullDealer.infType);
                    oViewModel.setProperty("/dealerSelected", true);
                });
        },


        /* ==========================================
           DEALER LIVE CHANGE
        ========================================== */
        onDealerLiveChange(oEvent) {

            const sValue = oEvent.getParameter("value");
            const oViewModel = this.getView().getModel("view");

            if (!sValue || sValue.trim() === "") {

                oViewModel.setProperty("/dealerName", "");
                oViewModel.setProperty("/fundAvailability", "");
                oViewModel.setProperty("/limitAvailability", "");
                oViewModel.setProperty("/infOtherAmount", "");
                oViewModel.setProperty("/infType", "");
                oViewModel.setProperty("/selectedDealerID", "");
                oViewModel.setProperty("/dealerSelected", false);
            }
            else {
                oViewModel.setProperty("/dealerSelected", false);
            }
        },


        /* ==========================================
           DEALER GO
        ========================================== */
        onDealerGo() {

            const oViewModel = this.getView().getModel("view");
            const oWizard = this.byId("BillingWizard");
            const oDealerStep = this.byId("DealerStep");

            const sDealerID = oViewModel.getProperty("/selectedDealerID");
            const sDealerType = oViewModel.getProperty("/infType");
            const fFund = parseFloat(oViewModel.getProperty("/fundAvailability")) || 0;
            const fLimit = parseFloat(oViewModel.getProperty("/limitAvailability")) || 0;

            const MIN_FUND = 200000;

            if (!sDealerID) {
                MessageBox.error("Please select a dealer.");
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

            /* Load ALL Models */
            const oODataModel = this.getView().getModel();
            const oListBinding = oODataModel.bindList("/Model");

            oListBinding.requestContexts().then(aContexts => {

                const aModels = aContexts.map(ctx => {
                    const obj = ctx.getObject();
                    obj.allocationQty = 0;
                    obj.orderValue = 0;
                    return obj;
                });

                oViewModel.setProperty("/Model", aModels);

                oDealerStep.setValidated(true);
                oWizard.nextStep();

                this._calculateInitialTotals();

            });
        },


        /* ==========================================
           ALLOCATION CHANGE (NO LIVE CALCULATION)
        ========================================== */
        onAllocationChange(oEvent) {

            const oInput = oEvent.getSource();
            const oContext = oInput.getBindingContext("view");
            const oModel = this.getView().getModel("view");

            if (!oContext) return;

            const sPath = oContext.getPath();

            let iQty = parseInt(oInput.getValue(), 10) || 0;

            const availableStock = parseInt(
                oModel.getProperty(sPath + "/availableStock"), 10
            ) || 0;

            /* ================= VALIDATION ================= */

            // Negative not allowed
            if (iQty < 0) {
                iQty = 0;
            }

            // Greater than available stock
            if (iQty > availableStock) {

                iQty = availableStock;

                sap.m.MessageToast.show(
                    "Allocation cannot exceed Available Stock (" + availableStock + ")"
                );
            }

            // Set corrected value
            oModel.setProperty(sPath + "/allocationQty", iQty);

            /* Enable Calculate Button Logic */
            const aModels = oModel.getProperty("/Model") || [];

            const hasValue = aModels.some(model =>
                parseInt(model.allocationQty, 10) > 0
            );

            oModel.setProperty("/calculateEnabled", hasValue);
        },


        /* ==========================================
           CALCULATE BUTTON
        ========================================== */
        onCalculateAllocation() {

            const oViewModel = this.getView().getModel("view");
            const aModels = oViewModel.getProperty("/Model") || [];
            const dealerFund = parseFloat(oViewModel.getProperty("/fundAvailability")) || 0;

            let totalStock = 0;
            let totalAvailable = 0;
            let totalFundRequired = 0;
            let totalAllocationQty = 0;
            let totalOrderValue = 0;

            aModels.forEach(model => {

                const qty = parseInt(model.allocationQty, 10) || 0;
                const price = parseFloat(model.perBikeValue) || 0;

                const orderValue = qty * price;

                model.orderValue = orderValue;

                totalStock += parseFloat(model.depotStock) || 0;
                totalAvailable += parseFloat(model.availableStock) || 0;
                totalFundRequired += parseFloat(model.fundRequired) || 0;
                totalAllocationQty += qty;
                totalOrderValue += orderValue;
            });

            if (totalOrderValue > dealerFund) {

                MessageBox.error(
                    "Total Order Value (" + totalOrderValue.toLocaleString() +
                    ") exceeds Dealer Fund (" + dealerFund.toLocaleString() + ")."
                );

                return;
            }

            oViewModel.setProperty("/Model", aModels);
            oViewModel.setProperty("/totalStock", totalStock);
            oViewModel.setProperty("/totalAvailable", totalAvailable);
            oViewModel.setProperty("/totalFundRequired", totalFundRequired);
            oViewModel.setProperty("/totalAllocationQty", totalAllocationQty);
            oViewModel.setProperty("/totalOrderValue", totalOrderValue);

            MessageToast.show("Allocation calculated successfully.");
        },


        /* ==========================================
           RESET TOTALS
        ========================================== */
        _resetTotals() {

            const oViewModel = this.getView().getModel("view");

            oViewModel.setProperty("/totalStock", 0);
            oViewModel.setProperty("/totalAvailable", 0);
            oViewModel.setProperty("/totalFundRequired", 0);
            oViewModel.setProperty("/totalAllocationQty", 0);
            oViewModel.setProperty("/totalOrderValue", 0);
        },

        _calculateInitialTotals() {

            const oViewModel = this.getView().getModel("view");
            const aModels = oViewModel.getProperty("/Model") || [];

            let totalStock = 0;
            let totalAvailable = 0;
            let fundRequired = 0;

            aModels.forEach(model => {

                totalStock += parseFloat(model.depotStock) || 0;
                totalAvailable += parseFloat(model.availableStock) || 0;
                fundRequired += parseFloat(model.fundRequired) || 0;
            });

            oViewModel.setProperty("/totalStock", totalStock);
            oViewModel.setProperty("/totalAvailable", totalAvailable);
            oViewModel.setProperty("/totalFundRequired", fundRequired);
            oViewModel.setProperty("/totalAllocationQty", 0);
            oViewModel.setProperty("/totalOrderValue", 0);
        },


        /* ==========================================
           MODEL DETAIL TOGGLE
        ========================================== */
        onModelSelect(oEvent) {

            const oContext = oEvent.getSource().getBindingContext("view");
            if (!oContext) return;

            const oSelected = oContext.getObject();
            const oViewModel = this.getView().getModel("view");

            const aCurrent = oViewModel.getProperty("/modelDetails") || [];

            if (aCurrent.length && aCurrent[0].modelCode === oSelected.modelCode) {
                oViewModel.setProperty("/showModelDetails", false);
                oViewModel.setProperty("/modelDetails", []);
                return;
            }

            oViewModel.setProperty("/modelDetails", [oSelected]);
            oViewModel.setProperty("/showModelDetails", true);
        },


        onModelPrevious() {
            this.byId("BillingWizard").previousStep();
        },


        onSaveAllocation() {
            MessageToast.show("Save logic to be implemented.");
        }

    });
});
