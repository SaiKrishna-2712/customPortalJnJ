sap.ui.define([
    "com/incture/customportal/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment"
], function (BaseController, JSONModel, Filter, FilterOperator, MessageToast, Fragment) {
    "use strict";

    return BaseController.extend("com.incture.customportal.controller.AnnouncementDetails", {

        getBaseURL: function () {
            var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
            var appPath = appId.replaceAll(".", "/");
            var appModulePath = jQuery.sap.getModulePath(appPath);
            return appModulePath;
        },

        getCurrentUserDetails: async function () {
            try {
                const url = this.getBaseURL() + "/user-api/currentUser";
                const oModel = new sap.ui.model.json.JSONModel();
                await oModel.loadData(url);

                const data = oModel.getData();
                if (data && data.email) {
                    return data;
                } else {
                    throw new Error("User details not found in response");
                }
            } catch (error) {
                console.error("Failed to fetch current user:", error.message);
                return null;
            }
        },

        onInit: function () {
            // Initialize filter model
            var oFilterModel = new JSONModel({
                general: false,
                reporting: false,
                planning: false,
                a2r: false
            });
            this.getView().setModel(oFilterModel, "filterModel");

            // Initialize announcement details model
            var oAnnouncementDetailsModel = new JSONModel({
                announcements: []
            });
            this.getView().setModel(oAnnouncementDetailsModel, "announcementDetailsModel");

            // Load announcements using OData V2
            this._loadAnnouncementsODataV2();

            // Fetch current user and update avatar
            this.getCurrentUserDetails().then((oUser) => {
                if (oUser) {
                    const initials = `${oUser.firstname?.[0] || ""}${oUser.lastname?.[0] || ""}`.toUpperCase();

                    const oAvatar = this.byId("idAnnouncementUserAvtr");
                    if (oAvatar) {
                        oAvatar.setInitials(initials);
                    }

                    // Create and set user model
                    const oUserModel = new JSONModel({
                        fullName: `${oUser.firstname || ""} ${oUser.lastname || ""}`,
                        email: oUser.email || "",
                        initials: initials
                    });
                    this.getView().setModel(oUserModel, "userModel");
                }
            });
        },

        /**
         * Load announcements using OData V2 (same approach as App.controller.js)
         */
        _loadAnnouncementsODataV2: function () {
            var that = this;
            var oAnnouncementDetailsModel = this.getView().getModel("announcementDetailsModel");

            var oGlobalAnnouncementDetailModel = new JSONModel();
            this.getView().setModel(oGlobalAnnouncementDetailModel, "globalAnnouncementDetailModel");


            // Get the OData V2 model from manifest
            var oDataModel = this.getOwnerComponent().getModel("announcementModel");

            if (!oDataModel) {
                console.error("announcementModel not found in manifest");
                oAnnouncementDetailsModel.setProperty("/announcements", []);
                return;
            }

            // Read announcements with expand (OData V2 syntax)
            oDataModel.read("/Announcements", {
                urlParameters: {
                    "$expand": "toTypes/type"
                },
                success: function (oData) {
                    var allAnnouncements = oData.results || [];

                    // Transform the OData response to match expected format
                    allAnnouncements = allAnnouncements.map(function (item) {
                        return {
                            announcementId: item.announcementId,
                            title: item.title,
                            description: item.description,
                            announcementType: item.announcementType,
                            isRead: item.isRead,
                            isActive: item.isActive,
                            startAnnouncement: item.startAnnouncement,
                            endAnnouncement: item.endAnnouncement,
                            publishedBy: item.publishedBy,
                            publishedAt: item.publishedAt,
                            announcementStatus: item.announcementStatus,
                            toTypes: item.toTypes ? item.toTypes.results || item.toTypes : []
                        };
                    });

                    // Process announcements
                    that._processProcessAnnouncements(allAnnouncements, oAnnouncementDetailsModel);
                    that._processGlobalAnnouncements(allAnnouncements, oGlobalAnnouncementDetailModel);
                },
                error: function (oError) {
                    console.error("Failed to load announcements from OData V2 API", oError);
                    oAnnouncementDetailsModel.setProperty("/announcements", []);
                }
            });
        },

        /**
         * Process PROCESS type announcements (from App.controller.js)
         */
        _processProcessAnnouncements: function (allAnnouncements, oModel) {
            var that = this;
            const getRelativeTime = function (dateString) {
                if (!dateString) return "";
                // Handle OData date format /Date(timestamp)/ or /Date(timestamp+offset)/
                var timestamp = dateString;
                if (typeof dateString === "string" && dateString.indexOf("/Date(") === 0) {
                    var matches = dateString.match(/\/Date\((\d+)(?:[+-]\d+)?\)\//);
                    if (matches && matches[1]) {
                        timestamp = parseInt(matches[1]);
                    }
                }
                const date = new Date(timestamp);
                const now = new Date();
                const diffMs = now - date;
                const sec = Math.floor(diffMs / 1000);
                const min = Math.floor(sec / 60);
                const hr = Math.floor(min / 60);
                const day = Math.floor(hr / 24);

                if (sec < 60) return sec + " second" + (sec !== 1 ? "s" : "") + " ago";
                if (min < 60) return min + " minute" + (min !== 1 ? "s" : "") + " ago";
                if (hr < 24) return hr + " hour" + (hr !== 1 ? "s" : "") + " ago";
                return day + " day" + (day !== 1 ? "s" : "") + " ago";
            };

            const hasProcessType = function (announcementType) {
                if (!announcementType) return false;
                return announcementType.split(",").map(t => t.trim()).includes("Process");
            };

            let aAnnouncements = allAnnouncements.filter(item => item.isActive === true && hasProcessType(item.announcementType) && item.announcementStatus === "PUBLISHED");


            aAnnouncements = aAnnouncements.map(item => {
                const tags = (item.toTypes || [])
                    .map(typeObj => typeObj.type?.name || "")
                    .filter(name => name !== "");

                return {
                    id: item.announcementId,
                    title: item.title || "No Title",
                    description: that._parseRichText(item.description),
                    date: getRelativeTime(item.startAnnouncement),
                    tags: tags,
                    announcementType: item.announcementType || "",
                    read: item.isRead || false,
                    expanded: false,
                    previousExpanded: false,
                    startDate: item.startAnnouncement,
                    endDate: item.endAnnouncement,
                    isActive: item.isActive
                };
            });

            // Sort by start date (newest first)
            aAnnouncements.sort((a, b) => {
                var dateA = this._parseODataDate(a.startDate);
                var dateB = this._parseODataDate(b.startDate);
                return dateB - dateA;
            });

            oModel.setProperty("/announcements", aAnnouncements);

            setTimeout(() => {
                this._updateAnnouncementStyles();
            }, 100);

            console.log("Loaded " + aAnnouncements.length + " active Process announcements");
        },

        _processGlobalAnnouncements: function (allAnnouncements, oModel) {
            // UPDATED: Add status filter for PUBLISHED
            let aAnnouncements = allAnnouncements.filter(item => {
                return item.isActive !== false &&
                    !this._isExpired(item.endAnnouncement) &&
                    this._hasAnnouncementType(item.announcementType, "Planned Scheduled") &&
                    item.announcementStatus === "PUBLISHED";
            });

            if (aAnnouncements.length > 0) {
                aAnnouncements.sort((a, b) => {
                    var dateA = this._parseODataDate(a.startAnnouncement);
                    var dateB = this._parseODataDate(b.startAnnouncement);
                    return dateB - dateA;
                });

                oModel.setProperty("/announcements", aAnnouncements);
                oModel.setProperty("/currentIndex", 0);
                oModel.setProperty("/totalCount", aAnnouncements.length);

                this._updateGlobalAnnouncementText();

                if (aAnnouncements.length > 1) {
                    this._startGlobalAnnouncementRotation();
                }
            } else {
                const oToolbar = this.byId("idGlobalAnnouncementDetailTlbr");
                if (oToolbar) oToolbar.setVisible(false);
            }
        },

        _updateGlobalAnnouncementText: function () {
            const oModel = this.getView().getModel("globalAnnouncementDetailModel");
            const aAnnouncements = oModel.getProperty("/announcements");
            const iCurrentIndex = oModel.getProperty("/currentIndex");

            if (!aAnnouncements || aAnnouncements.length === 0) return;

            const oCurrentAnnouncement = aAnnouncements[iCurrentIndex];
            const oText = this.byId("idGlobalAnnouncementDetailTxt");

            if (oText && oCurrentAnnouncement) {
                // Remove and re-add the marquee class to restart animation
                const oDomRef = oText.getDomRef();
                if (oDomRef) {
                    oDomRef.style.animation = 'none';
                    setTimeout(() => {
                        oDomRef.style.animation = '';
                    }, 10);
                }

                // Set the new text
                oText.setText(oCurrentAnnouncement.title);
            }
        },

        /**
         * Start automatic rotation of global announcements
         */
        _startGlobalAnnouncementRotation: function () {
            // Clear any existing interval
            if (this._globalAnnouncementInterval) {
                clearInterval(this._globalAnnouncementInterval);
            }

            // Rotate every 8 seconds (adjust as needed)
            this._globalAnnouncementInterval = setInterval(function () {
                const oModel = this.getView().getModel("globalAnnouncementDetailModel");
                const iTotalCount = oModel.getProperty("/totalCount");
                let iCurrentIndex = oModel.getProperty("/currentIndex");

                // Move to next announcement (loop back to 0 after last)
                iCurrentIndex = (iCurrentIndex + 1) % iTotalCount;
                oModel.setProperty("/currentIndex", iCurrentIndex);

                // Update display
                this._updateGlobalAnnouncementText();
            }.bind(this), 8000); // 8 seconds delay
        },

        /**
         * Stop the global announcement rotation (call on exit/destroy)
         */
        _stopGlobalAnnouncementRotation: function () {
            if (this._globalAnnouncementInterval) {
                clearInterval(this._globalAnnouncementInterval);
                this._globalAnnouncementInterval = null;
            }
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

        _hasAnnouncementType: function (announcementType, typeToCheck) {
            if (!announcementType) return false;
            const types = announcementType.split(',').map(type => type.trim());
            return types.includes(typeToCheck);
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

        onTopicFilterChange: function () {
            var oFilterModel = this.getView().getModel("filterModel");
            var oList = this.byId("idAnnouncementDetailsList");
            var aFilters = [];

            // Get filter states
            var bGeneral = oFilterModel.getProperty("/general");
            var bReporting = oFilterModel.getProperty("/reporting");
            var bPlanning = oFilterModel.getProperty("/planning");
            var bA2R = oFilterModel.getProperty("/a2r");

            // Build array of selected topics
            var aSelectedTopics = [];
            if (bGeneral) aSelectedTopics.push("General");
            if (bReporting) aSelectedTopics.push("Reporting");
            if (bPlanning) {
                aSelectedTopics.push("Planning");
                aSelectedTopics.push("Forecasting");
            }
            if (bA2R) aSelectedTopics.push("A2R");

            // If any filters are selected, create custom filter
            if (aSelectedTopics.length > 0) {
                var oFilter = new Filter({
                    path: "tags",
                    test: function (aTags) {
                        if (!aTags || !Array.isArray(aTags)) {
                            return false;
                        }
                        // Check if any tag matches any selected topic
                        return aTags.some(function (tag) {
                            return aSelectedTopics.some(function (topic) {
                                return tag.indexOf(topic) !== -1;
                            });
                        });
                    }
                });
                aFilters.push(oFilter);
            }

            // Apply filters to the list
            var oBinding = oList.getBinding("items");
            if (oBinding) {
                oBinding.filter(aFilters);
            }
        },

        onResetFilters: function () {
            var oFilterModel = this.getView().getModel("filterModel");

            // Reset all filter checkboxes
            oFilterModel.setProperty("/general", false);
            oFilterModel.setProperty("/reporting", false);
            oFilterModel.setProperty("/planning", false);
            oFilterModel.setProperty("/a2r", false);

            // Clear filters from list
            var oList = this.byId("idAnnouncementDetailsList");
            var oBinding = oList.getBinding("items");
            oBinding.filter([]);

            MessageToast.show("Filters reset");
        },

        onAnnouncementItemPress: function (oEvent) {
            const oItem = oEvent.getSource();
            const oCtx = oItem.getBindingContext("announcementDetailsModel");
            const sPath = oCtx.getPath();
            const oModel = oCtx.getModel();

            const announcements = oModel.getProperty("/announcements");
            const clicked = oModel.getProperty(sPath);

            // Toggle expanded state
            clicked.expanded = !clicked.expanded;
            if (clicked.expanded) {
                clicked.read = true;
                clicked.previousExpanded = false;
            } else {
                clicked.previousExpanded = true;
            }

            oModel.setProperty("/announcements", announcements);
            this._updateAnnouncementStyles();
        },

        /**
         * Update announcement styles for read/unread state
         */
        _updateAnnouncementStyles: function () {
            const oList = this.byId("idAnnouncementDetailsList");
            if (!oList) return;

            const oModel = this.getView().getModel("announcementDetailsModel");
            const aItems = oList.getItems();

            aItems.forEach(oItem => {
                const oCtx = oItem.getBindingContext("announcementDetailsModel");
                if (!oCtx) return;

                const data = oModel.getProperty(oCtx.getPath());
                if (!data) return;

                const oMainHBox = oItem.getContent()[0];
                const oContainerBox = oMainHBox.getItems()[1]; // content VBox
                const oLineVBox = oMainHBox.getItems()[0].getItems()[0]; // vertical line

                // Update line styles
                oLineVBox.removeStyleClass("lineBlue");
                oLineVBox.removeStyleClass("lineLightGray");
                oLineVBox.addStyleClass(data.read ? "lineLightGray" : "lineBlue");

                // Recursive style application for nested elements
                const applyStyle = ctrl => {
                    if (!ctrl) return;
                    ctrl.removeStyleClass("announcementTextUnread");
                    ctrl.removeStyleClass("announcementTextRead");
                    ctrl.addStyleClass(data.read ? "announcementTextRead" : "announcementTextUnread");

                    if (ctrl.getItems && typeof ctrl.getItems === "function") {
                        ctrl.getItems().forEach(applyStyle);
                    }
                };

                if (oContainerBox && oContainerBox.getItems) {
                    oContainerBox.getItems().forEach(applyStyle);
                }
            });
        },

        onManageTopics: function () {
            MessageToast.show("Manage Topics functionality coming soon");
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHome");
        },

        onLogoPress: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHome");
        },

        onAvatarPress: function (oEvent) {
            var oButton = oEvent.getSource(),
                oView = this.getView();

            if (!this._pPopover) {
                this._pPopover = Fragment.load({
                    id: oView.getId(),
                    name: "com.incture.customportal.fragments.UserProfilePopover",
                    controller: this
                }).then(function (oPopover) {
                    oView.addDependent(oPopover);
                    return oPopover;
                });
            }

            this._pPopover.then(function (oPopover) {
                if (oPopover.isOpen()) {
                    oPopover.close();
                } else {
                    oPopover.openBy(oButton);
                }
            });
        },

        onShellSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            if (sQuery) {
                MessageToast.show("Searching for: " + sQuery);
                // Implement search functionality
            }
        },

        onPrivacyPress: function () {
            MessageToast.show("Privacy Policy");
        },

        onTermsPress: function () {
            MessageToast.show("Terms of Use");
        },

        onReleasePress: function () {
            MessageToast.show("Release Notes");
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
        }

    });
});