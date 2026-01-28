sap.ui.define([
    "com/incture/customportal/controller/BaseController"
], function (BaseController) {
    "use strict";

    return BaseController.extend("com.incture.customportal.controller.KnowledgeArticleDetails", {

        onInit: function () {
            // Initialize the view
        },

        onNavBack: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteHome");
        }

    });
});