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

        getBaseURL: function () {
            var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
            var appPath = appId.replaceAll(".", "/");
            var appModulePath = jQuery.sap.getModulePath(appPath);
            return appModulePath;
        },

        doAjax: function (sUrl, sMethod, oData, rSuccess, rError, oHeaders) {
            var that = this;
            sUrl = sap.ui.require.toUrl("com/incture/customportal/") + sUrl;
            var headers = {
                "Content-Type": "application/json"
            };
            if (oData) {
                oData = JSON.stringify(oData);
            }
            if (oHeaders) {
                if (oHeaders["Content-Type"]) {
                    headers = oHeaders;
                } else {
                    Object.assign(headers, oHeaders);
                }
            }

            var tempJsonModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(tempJsonModel, "tempJsonModel");
            tempJsonModel.loadData(sUrl, oData, true, sMethod, false, false, headers);
            tempJsonModel.attachRequestCompleted(function (oEvent) {
                rSuccess(oEvent.getSource().getData());
            }.bind(rSuccess));
            tempJsonModel.attachRequestFailed(function (oEvent) {
                rError(oEvent);
            }.bind(rError));
        },

        _parseRichText: function (sHtml) {
            if (!sHtml) {
                return "";
            }

            const oParser = new DOMParser();
            const oDoc = oParser.parseFromString(sHtml, "text/html");

            // Optional cleanup
            oDoc.querySelectorAll("script, style").forEach(el => el.remove());

            return oDoc.body.innerHTML;
        },

        /**
         * Helper: Parse OData date format
        */
        _parseODataDate: function (dateString) {
            if (!dateString) return new Date(0);

            if (typeof dateString === "string" && dateString.indexOf("/Date(") === 0) {
                var matches = dateString.match(/\/Date\((\d+)(?:[+-]\d+)?\)\//);
                if (matches && matches[1]) {
                    return new Date(parseInt(matches[1]));
                }
            }
            return new Date(dateString);
        },

        /**
         * Helper: Check if announcement is expired
        */
        _isExpired: function (endDateString) {
            if (!endDateString) return false;
            var timestamp = endDateString;
            if (typeof endDateString === "string" && endDateString.indexOf("/Date(") === 0) {
                timestamp = parseInt(endDateString.replace("/Date(", "").replace(")/", ""));
            }
            const endDate = new Date(timestamp);
            const now = new Date();
            return now > endDate;
        },

        /**
         * Helper: Check if announcement type contains specified type
        */
        _hasAnnouncementType: function (announcementType, typeToCheck) {
            if (!announcementType) return false;
            const types = announcementType.split(',').map(type => type.trim());
            return types.includes(typeToCheck);
        },



    });
})