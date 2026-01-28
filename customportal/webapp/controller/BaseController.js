sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/GenericTile",
    "sap/m/TileContent",
    "sap/m/ImageContent",
    "sap/ui/layout/GridData",
    "com/incture/customportal/util/formatter"
    ], function (Controller, Fragment, MessageToast, JSONModel, GenericTile, TileContent, ImageContent, GridData, formatter) {
        "use strict";
    return Controller.extend("com.incture.customportal.controller.BaseController", {
        formatter: formatter,
        

    });
})