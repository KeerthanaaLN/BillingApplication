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

        async onDealerGo() {

    const oViewModel = this.getView().getModel("view");
    const oODataModel = this.getView().getModel();
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

    try {

        const oListBinding = oODataModel.bindList("/Model");
        const aContexts = await oListBinding.requestContexts();

        const aModels = aContexts.map(ctx => {

            const obj = ctx.getObject();

            return {
                ...obj,
                _context: ctx,           
                allocationQty: 0,
                orderValue: 0
            };
        });

        oViewModel.setProperty("/Model", aModels);

        oDealerStep.setValidated(true);
        oWizard.nextStep();

        this._calculateInitialTotals();

    } catch (err) {
        MessageBox.error("Error loading models.");
    }
}
,

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


            if (iQty < 0) {
                iQty = 0;
            }

            if (iQty > availableStock) {

                iQty = availableStock;

                sap.m.MessageToast.show(
                    "Allocation cannot exceed Available Stock (" + availableStock + ")"
                );
            }

            oModel.setProperty(sPath + "/allocationQty", iQty);

            const aModels = oModel.getProperty("/Model") || [];

            const hasValue = aModels.some(model =>
                parseInt(model.allocationQty, 10) > 0
            );

            oModel.setProperty("/calculateEnabled", hasValue);
        },

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


        async onSaveAllocation() {

            const oViewModel = this.getView().getModel("view");
            const oODataModel = this.getView().getModel();

            const aModels = oViewModel.getProperty("/Model") || [];
            const sDealerID = oViewModel.getProperty("/selectedDealerID");

            let dealerFund = parseFloat(oViewModel.getProperty("/fundAvailability")) || 0;

            if (!aModels.length) {
                MessageBox.error("No models available.");
                return;
            }

            let totalOrderValue = 0;

            try {

                for (let model of aModels) {

                    const qty = parseInt(model.allocationQty, 10) || 0;
                    if (qty <= 0) continue;

                    const price = parseFloat(model.perBikeValue) || 0;
                    const orderValue = qty * price;

                    totalOrderValue += orderValue;

                    model.allocatedQty = (parseInt(model.allocatedQty, 10) || 0) + qty;
                    model.depotStock = (parseInt(model.depotStock, 10) || 0) - qty;
                    model.availableStock = (parseInt(model.availableStock, 10) || 0) - qty;
                    model.fundRequired = model.availableStock * price;

                    model.allocationQty = 0;
                    model.orderValue = 0;

                    model._context.setProperty("allocatedQty", model.allocatedQty);
                    model._context.setProperty("depotStock", model.depotStock);
                    model._context.setProperty("availableStock", model.availableStock);
                    model._context.setProperty("fundRequired", model.fundRequired);
                }

                dealerFund = dealerFund - totalOrderValue;

                const oDealerBinding = oODataModel.bindContext(`/Dealer('${sDealerID}')`);
                await oDealerBinding.requestObject();

                const oDealerContext = oDealerBinding.getBoundContext();

                oDealerContext.setProperty("fundAvailability", dealerFund);

                await oODataModel.submitBatch("$auto");

                oViewModel.setProperty("/Model", aModels);
                oViewModel.setProperty("/fundAvailability", dealerFund);

                this._calculateInitialTotals();

                oViewModel.setProperty("/calculateEnabled", false);

                MessageToast.show("Allocation saved successfully.");

            } catch (error) {

                console.error(error);
                MessageBox.error("Error while saving allocation.");
            }
        }
    });
});
