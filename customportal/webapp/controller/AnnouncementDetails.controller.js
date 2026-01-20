sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment"
], function (Controller, JSONModel, Filter, FilterOperator, MessageToast, Fragment) {
    "use strict";

    return Controller.extend("com.incture.customportal.controller.AnnouncementDetails", {

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

            // Load announcements
            this._loadAnnouncements();

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

        _loadAnnouncements: function () {
            var oModel = this.getView().getModel("announcementDetailsModel");

            var sAnnouncementsUrl =
                "/JnJ_Workzone_Portal_Destination_Java/odata/v4/AnnouncementService/Announcements?$expand=toTypes($expand=type)";

            oModel.loadData(
                sAnnouncementsUrl,
                null,
                true,
                "GET",
                false,
                false,
                { "Content-Type": "application/json" }
            );

            oModel.attachRequestCompleted(function (oEvent) {
                const oData = oEvent.getSource().getData();
                let aAnnouncements = oData.value || oData || [];

                // Format date
                const formatDate = function (dateString) {
                    if (!dateString) return "";
                    const d = new Date(dateString);
                    return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
                };

                // Check if announcementType contains "Process"
                const hasProcessType = function (announcementType) {
                    if (!announcementType) return false;
                    return announcementType
                        .split(",")
                        .map(t => t.trim())
                        .includes("Process");
                };

                // ---------------------------------------------------------
                // FILTER 1: Active announcements
                // ---------------------------------------------------------
                aAnnouncements = aAnnouncements.filter(item => item.isActive === true);

                // ---------------------------------------------------------
                // FILTER 2: Process type announcements only
                // ---------------------------------------------------------
                aAnnouncements = aAnnouncements.filter(item => hasProcessType(item.announcementType));

                // ---------------------------------------------------------
                // TRANSFORM DATA
                // ---------------------------------------------------------
                aAnnouncements = aAnnouncements.map(item => {
                    const tags = (item.toTypes || [])
                        .map(t => t.type?.name || "")
                        .filter(n => n !== "");

                    return {
                        id: item.announcementId,
                        title: item.title || "No Title",
                        description: item.description || "",
                        date: formatDate(item.startAnnouncement),
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

                // Sort: newest first
                aAnnouncements.sort((a, b) => {
                    return new Date(b.startDate) - new Date(a.startDate);
                });

                oModel.setProperty("/announcements", aAnnouncements);

                setTimeout(() => {
                    this._updateAnnouncementStyles();
                }, 100);

                console.log("Loaded " + aAnnouncements.length + " active Process announcements");

            }.bind(this));

            oModel.attachRequestFailed(function () {
                console.error("Failed to load announcements from API");
                oModel.setProperty("/announcements", []);
            }.bind(this));
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
            oRouter.navTo("RouteApp");
        },

        onLogoPress: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteApp");
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
        }

    });
});