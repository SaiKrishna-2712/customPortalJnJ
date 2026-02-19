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
            tempJsonModel.loadData(sUrl, oData, true, sMethod, false, true, headers);
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
            announcementType = announcementType.trim();
            return announcementType.includes(typeToCheck);
        },

        getCurrentUserDetails: function (controller) {
            var that = this;
            var sUrl = "user-api/currentUser";
            var oUserModel = this.getOwnerComponent().getModel("userModel");
            var oBannerModel = this.getOwnerComponent().getModel("bannerModel");

            this.doAjax(sUrl, "GET", null, function (oData) {
                // Create initials
                    const initials = `${oData.firstname?.[0] || ""}${oData.lastname?.[0] || ""}`.toUpperCase();

                    // Update banner
                    oBannerModel.setProperty("/userName", `${oData.lastname || ""} ${oData.firstname || ""}`);

                    // Create and set user model
                    var oUserData = {
                        fullName: `${oData.firstname || ""} ${oData.lastname || ""}`,
                        email: oData.email || "",
                        initials: initials
                    };
                    oUserModel.setData(oUserData);

                    controller.fetchAnnouncementsFlag = true;
                    controller.triggerUserDependentFunctions();

                    // Update avatar initials dynamically
                    const oAvatar = controller.byId("idUserProfileAvtr");
                    if (oAvatar) {
                        oAvatar.setInitials(initials);
                    }


                console.log(oData);

            }, function (oError) {
                console.log(oError);
            });        
        },

        /**
         * Process PROCESS type announcements
         */
        _processProcessAnnouncements: function (allAnnouncements, oModel, controller) {
            var that = controller;

            // UPDATED: Add status filter for PUBLISHED
            let aAnnouncements = allAnnouncements.filter(item =>
                that._hasAnnouncementType(item.announcementType, "Sidebar")
            );

            aAnnouncements = aAnnouncements.map(item => {
                const tags = (item.toTypes || [])
                    .map(typeObj => typeObj.type?.name || "")
                    .filter(name => name !== "");

                return {
                    announcementId: item.announcementId,
                    title: item.title || "No Title",
                    description: item.description || "",
                    htmlDescription: that._parseRichText(item.description), // UPDATED: Store original HTML
                    date: that.formatter.timeAgo(item.startAnnouncement),
                    tags: tags,
                    announcementType: item.announcementType || "",
                    isRead: item.isRead || false,
                    expanded: false,
                    previousExpanded: false,
                    startDate: item.startAnnouncement,
                    endDate: item.endAnnouncement,
                    isActive: item.isActive
                };
            });

            // Sort by start date (newest first)
            aAnnouncements.sort((a, b) => {
                var dateA = controller._parseODataDate(a.startDate);
                var dateB = controller._parseODataDate(b.startDate);
                return dateB - dateA;
            });

            oModel.setProperty("/announcements", aAnnouncements);

            setTimeout(() => {
                controller._updateAnnouncementStyles();
            }, 100);

            console.log("Loaded " + aAnnouncements.length + " active Process announcements");
        },

        _updateAnnouncementReadStatus: function (announcementId) {
            var oUserModel = this.getOwnerComponent().getModel("userModel");
            var userEmail = oUserModel.getProperty("/email");
            var oAnnouncementModel = this.getOwnerComponent().getModel("announcementModel");

            var oPayload = {
                "announcementId" : announcementId,
                "userEmail" : userEmail,
                "isRead" : true
            };

            oAnnouncementModel.create("/updateReadStatus", oPayload, {
                async: true,
                success: function (oData) {
                    console.log(oData);
                },
                error: function (oError) {
                    console.log(oError);
                }
            });
        }

    });
})