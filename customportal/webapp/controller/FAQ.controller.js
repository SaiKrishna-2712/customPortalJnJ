sap.ui.define([
    "com/incture/customportal/controller/BaseController",
    "sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
    "use strict";

    return BaseController.extend("com.incture.customportal.controller.FAQ", {
        onInit: function () {
            var oData = {
                faqs: [
                    { question: "What is DHO?", answer: "DHO stands for ...", expanded: false },
                    { question: "What does Virtual vs. Persistent Model mean?", answer: "Virtual model is ... Persistent model is ...", expanded: false },
                    { question: "How do I convert to Constant Currency or As Reported Currency?", answer: "You can convert using ...", expanded: false },
                    { question: "What is changing relating to data with DHO optimization?", answer: "With optimization ...", expanded: false }
                ]
            };
            this.getView().setModel(new sap.ui.model.json.JSONModel(oData), "faqModel");

            this.getView().addEventDelegate({
                onAfterRendering: () => {
                    const oBtn = this.byId("faqBtnUI5");
                    if (oBtn) {
                        this._makeDraggable(oBtn.getDomRef());
                    }
                }
            });
        },

        onToggleFAQ: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("faqModel");
            var bExpanded = oCtx.getProperty("expanded");

            // Toggle expanded flag
            oCtx.getModel().setProperty(oCtx.getPath() + "/expanded", !bExpanded);
        },

        onOpenFAQ: function (oEvent) {
            var oPopover = this.byId("faqPopover");

            if (oPopover.isOpen()) {
                oPopover.close();
            } else {
                oPopover.openBy(this.byId("faqBtnUI5"));
            }
        },


        _makeDraggable: function (el) {
            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            el.onmousedown = dragMouseDown;

            function dragMouseDown(e) {
                e.preventDefault();
                pos3 = e.clientX;
                pos4 = e.clientY;
                document.onmouseup = closeDragElement;
                document.onmousemove = elementDrag;
            }

            function elementDrag(e) {
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;

                el.style.top = (el.offsetTop - pos2) + "px";
                el.style.left = (el.offsetLeft - pos1) + "px";
                el.style.bottom = "auto"; // prevent snapping back
                el.style.right = "auto";
            }

            function closeDragElement() {
                document.onmouseup = null;
                document.onmousemove = null;
            }
        }
    });
});
