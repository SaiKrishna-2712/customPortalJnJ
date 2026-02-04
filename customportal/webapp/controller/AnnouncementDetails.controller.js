sap.ui.define([
    "com/incture/customportal/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",

], function (BaseController, JSONModel, Filter, FilterOperator, MessageToast, Fragment) {
    "use strict";

    return BaseController.extend("com.incture.customportal.controller.AnnouncementDetails", {

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

            let aAnnouncements = allAnnouncements.filter(item => item.isActive === true && that._hasAnnouncementType(item.announcementType, "Process") && item.announcementStatus === "PUBLISHED");

            aAnnouncements = aAnnouncements.map(item => {
                const tags = (item.toTypes || [])
                    .map(typeObj => typeObj.type?.name || "")
                    .filter(name => name !== "");

                return {
                    id: item.announcementId,
                    title: item.title || "No Title",
                    description: that._parseRichText(item.description),
                    date: that.formatter.timeAgo(item.startAnnouncement),
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
            oModel.setProperty("/showAnnouncementBusy", false);
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

        onAnnouncementSearchLive: function (oEvent) {
            var that = this;
            var sQuery = oEvent.getParameter("newValue");
            if (!sQuery || !sQuery.trim()) {
            // Search cleared → reload full list
            that.getAnnouncementsBySearch(sQuery);
            return;
            }
        },

        onAnnouncementSearch: function (oEvent) {
            var searchFilter = oEvent.getParameter("query") ;
            searchFilter = searchFilter.toLowerCase();
            this.getAnnouncementsBySearch(searchFilter);
        },

        getAnnouncementsBySearch: function (sQuery) {
            var oDataModel = this.getOwnerComponent().getModel("announcementModel");
            var oAnnouncementDetailsModel = this.getView().getModel("announcementDetailsModel");
            var that = this;
            oAnnouncementDetailsModel.setProperty("/showAnnouncementBusy", true);

            var oFilter = [];
                oFilter.push(new Filter("title", FilterOperator.Contains, sQuery));
				oFilter.push(new Filter("isActive", FilterOperator.EQ, true));
                oFilter.push(new Filter("announcementStatus", FilterOperator.EQ, "PUBLISHED"));
            
            oDataModel.read("/Announcements", {
                filters: oFilter,
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

                    that._processProcessAnnouncements(allAnnouncements, oAnnouncementDetailsModel);
                },
                error: function (oError) {
                    console.error("Failed to load announcements from OData V2 API", oError);
                    oAnnouncementDetailsModel.setProperty("/announcements", []);
                    oAnnouncementDetailsModel.setProperty("/showAnnouncementBusy", false);
                }
            });
        }

    });
});