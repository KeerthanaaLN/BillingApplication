sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], (Controller, JSONModel) => {
    "use strict";

    return Controller.extend("billing.controller.billingHome", {

        onInit() {
            // Sample dealer data - replace with your actual data source / OData call
            const oData = {
                Dealer: [
                    {
                        dealerID: "D001",
                        dealerName: "AutoHub Motors",
                        fundAvailability: "5,00,000",
                        limitAvailability: "3,50,000",
                        infOtherAmount: "75,000"
                    },
                    {
                        dealerID: "D002",
                        dealerName: "SpeedWheels Pvt Ltd",
                        fundAvailability: "8,00,000",
                        limitAvailability: "6,00,000",
                        infOtherAmount: "1,20,000"
                    },
                    {
                        dealerID: "D003",
                        dealerName: "City Bikes & Co",
                        fundAvailability: "2,50,000",
                        limitAvailability: "1,80,000",
                        infOtherAmount: "40,000"
                    }
                ],

                // Selected dealer fields (bound to the input fields)
                dealerName: "",
                fundAvailability: "",
                limitAvailability: "",
                infOtherAmount: "",

                Model: []
            };

            const oModel = new JSONModel(oData);
            this.getView().setModel(oModel);
        },

        onDealerSelect(oEvent) {
            const oModel = this.getView().getModel();
            const oDealerList = oModel.getProperty("/Dealer");

            // Get the selected key from the Select control
            const sSelectedKey = oEvent.getSource().getSelectedKey();

            // Find the matching dealer object
            const oSelectedDealer = oDealerList.find(
                (dealer) => dealer.dealerID === sSelectedKey
            );

            if (oSelectedDealer) {
                // Update the model properties — inputs will auto-refresh via binding
                oModel.setProperty("/dealerName", oSelectedDealer.dealerName);
                oModel.setProperty("/fundAvailability", oSelectedDealer.fundAvailability);
                oModel.setProperty("/limitAvailability", oSelectedDealer.limitAvailability);
                oModel.setProperty("/infOtherAmount", oSelectedDealer.infOtherAmount);
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