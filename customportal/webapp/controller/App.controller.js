sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/GenericTile",
    "sap/m/TileContent",
    "sap/m/ImageContent",
    "sap/ui/layout/GridData"
], function (Controller, Fragment, MessageToast, JSONModel, GenericTile, TileContent, ImageContent, GridData) {
    "use strict";

    return Controller.extend("com.incture.customportal.controller.App", {

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
            var that = this;
            // Initialize iframe timeout variable
            this._iframeLoadTimeout = null;

            // Tiles data - Added more tiles for testing scroll functionality
            var oTilesData = {
                tiles: [
                    {
                        ID: "1",
                        title: "Google",
                        subtitle: "Search Engine",
                        url: "https://www.google.com",
                        icon: "sap-icon://world",
                        embedMode: "newtab",
                        active: true
                    },
                    {
                        ID: "2",
                        title: "SAP",
                        subtitle: "SAP Official",
                        url: "https://www.sap.com",
                        icon: "sap-icon://hint",
                        embedMode: "iframe",
                        active: true
                    },
                    {
                        ID: "3",
                        title: "Topas Cherrywork",
                        subtitle: "Timesheet",
                        url: "https://topas.cherrywork.com/home/dashboard",
                        icon: "sap-icon://employee",
                        embedMode: "newtab",
                        active: true
                    },
                    {
                        ID: "4",
                        title: "Microsoft",
                        subtitle: "Productivity Suite",
                        url: "https://www.microsoft.com",
                        icon: "sap-icon://collaborate",
                        embedMode: "newtab",
                        active: true
                    },
                    {
                        ID: "5",
                        title: "Analytics",
                        subtitle: "Data Insights",
                        url: "https://www.analytics.com",
                        icon: "sap-icon://business-objects-experience",
                        embedMode: "newtab",
                        active: true
                    },
                    {
                        ID: "6",
                        title: "CRM System",
                        subtitle: "Customer Management",
                        url: "https://www.crm.com",
                        icon: "sap-icon://customer",
                        embedMode: "iframe",
                        active: true
                    },
                    {
                        ID: "7",
                        title: "Knowledge Base",
                        subtitle: "Documentation",
                        url: "https://www.kb.com",
                        icon: "sap-icon://database",
                        embedMode: "newtab",
                        active: true
                    },
                    {
                        ID: "8",
                        title: "Project Manager",
                        subtitle: "Task Management",
                        url: "https://www.projectmanager.com",
                        icon: "sap-icon://task",
                        embedMode: "newtab",
                        active: true
                    },
                ]
            };
            var oTilesModel = new JSONModel(oTilesData);
            this.getView().setModel(oTilesModel, "tilesModel");

            //  Fetch Quick Links from API
            // var oQuickLinksModel = new sap.ui.model.json.JSONModel();
            // this.getView().setModel(oQuickLinksModel, "quickLinksModel");

            // oQuickLinksModel.loadData(
            //     "/JnJ_Workzone_Portal_Destination_Java/odata/v4/QuickLinkService/QuickLinks",
            //     null,
            //     true,
            //     "GET",
            //     false,
            //     false,
            //     {
            //         "Content-Type": "application/json"
            //     }
            // );

            // oQuickLinksModel.attachRequestCompleted(function (oEvent) {
            //     const oData = oEvent.getSource().getData();

            //     // Handle both { value: [...] } and direct array response
            //     const rawData = oData.value || oData || [];

            //     // FIRST: Filter out deleted items
            //     const filteredData = rawData.filter(item => {
            //         return item.isDelete !== true;
            //     });

            //     // THEN: Map to the required structure
            //     const aQuickLinks = filteredData.map(item => ({
            //         text: item.linkTitle || "Untitled",
            //         action: item.linkURL || "",
            //         active: true
            //     }));

            //     oQuickLinksModel.setData({ links: aQuickLinks });
            // });

            // var oQuickLinksModel = new sap.ui.model.json.JSONModel();
            // this.getView().setModel(oQuickLinksModel, "quickLinksModel");

            // this.doAjax(
            //     "JnJ_Workzone_Portal_Destination_Java/odata/v4/QuickLinkService/QuickLinks",
            //     "GET",
            //     null,

            //     // ✅ SUCCESS
            //     function (data) {
            //         var rawData = data?.value || [];

            //         var aQuickLinks = rawData
            //             .filter(item => item.isDelete === false)
            //             .map(item => ({
            //                 text: item.linkTitle || "Untitled",
            //                 action: item.linkURL || "",
            //                 active: true
            //             }));

            //         // Guard: API returned only deleted / empty records
            //         if (!aQuickLinks.length) {
            //             aQuickLinks = that._getFallbackQuickLinks();
            //         }

            //         oQuickLinksModel.setData({ links: aQuickLinks });
            //     },

            //     // ❌ ERROR
            //     function () {
            //         console.log("Quick Links API failed – loading fallback data");
            //         oQuickLinksModel.setData({
            //             links: that._getFallbackQuickLinks()
            //         });
            //     }
            // );
            
            this.getQuickLinks();

            // Create tiles programmatically
            this._createTiles();

            // SINGLE API CALL FOR ALL ANNOUNCEMENTS (Emergency, Global, Process)
            this._fetchAllAnnouncements();

            console.log("Tiles Model:", oTilesModel);

            // Set up responsive scroll container behavior
            this._setupResponsiveScrollContainer();

            // Initialize knowledge articles
            this._initializeKnowledgeArticles();

            // Initialize banner model with responsive data
            var oBannerModel = new sap.ui.model.json.JSONModel({
                dateTemp: "",
                userName: ""
            });
            this.getView().setModel(oBannerModel, "bannerModel");

            //  Fetch current user and update models
            this.getCurrentUserDetails().then((oUser) => {
                if (oUser) {
                    // Create initials
                    const initials = `${oUser.firstname?.[0] || ""}${oUser.lastname?.[0] || ""}`.toUpperCase();

                    // Update banner
                    oBannerModel.setProperty("/userName", `${oUser.lastname || ""} ${oUser.firstname || ""}`);

                    // Create and set user model
                    const oUserModel = new sap.ui.model.json.JSONModel({
                        fullName: `${oUser.firstname || ""} ${oUser.lastname || ""}`,
                        email: oUser.email || "",
                        initials: initials
                    });
                    this.getView().setModel(oUserModel, "userModel");

                    // Update avatar initials dynamically
                    const oAvatar = this.byId("idUserProfileAvtr");
                    if (oAvatar) {
                        oAvatar.setInitials(initials);
                    }
                }
            });

            this.getView().setModel(oBannerModel, "bannerModel");

            this._setDateAndTemp(oBannerModel);

            // Handle window resize for responsive behavior
            this._attachResizeHandler();
        },

        getQuickLinks: function () {
            var that = this;
            var oQuickLinksModel = this.getOwnerComponent().getModel("quickLinkModel");
            var oQuickLinksDataModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(oQuickLinksDataModel, "quickLinksDataModel");
            oQuickLinksDataModel.setData({
                        links: that._getFallbackQuickLinks()
                    });


            // oQuickLinksModel.read("/QuickLinks", {
            //     success: function (oData) {
            //         var oQuickLinks = oData.results || [];

            //     },
            //     error: function (oError) {
                    
            //     }
            // });

        },

        _getFallbackQuickLinks: function () {
            return {
                value: [
                    {
                        linkTitle: "Learning  Development Hub updated",
                        linkURL: "https://learn.jnj.com",
                        isDelete: false
                    },
                    {
                        linkTitle: "Ethics and Compliance Portal",
                        linkURL: "https://ethics.jnj.com",
                        isDelete: false
                    },
                    {
                        linkTitle: "Health  Wellness Center",
                        linkURL: "https://wellness.jnj.com",
                        isDelete: false
                    }
                ]
            };
        },



        /**
 * SINGLE ODATA CALL - Fetch all announcements and distribute to different sections
 */
        _fetchAllAnnouncements: function () {
            var that = this;

            // Initialize all three models
            var oProcessAnnouncementsModel = new JSONModel();
            var oGlobalAnnouncementModel = new JSONModel();

            this.getView().setModel(oProcessAnnouncementsModel, "announcementsModel");
            this.getView().setModel(oGlobalAnnouncementModel, "globalAnnouncementModel");

            // Get the OData model from manifest
            var oDataModel = this.getOwnerComponent().getModel("announcementModel");

            if (!oDataModel) {
                console.error("announcementModel not found in manifest");
                //oProcessAnnouncementsModel.setProperty("/announcements", []);
                const oToolbar = this.byId("idGlobalAnnouncementTlbr");
                if (oToolbar) oToolbar.setVisible(false);
                return;
            }

            // Read announcements with expand
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

                    // Process all three types
                    that._processProcessAnnouncements(allAnnouncements, oProcessAnnouncementsModel);
                    that._processGlobalAnnouncements(allAnnouncements, oGlobalAnnouncementModel);
                    that._processEmergencyAnnouncements(allAnnouncements);
                },
                error: function (oError) {
                    console.error("Failed to load announcements from OData API", oError);
                    oProcessAnnouncementsModel.setProperty("/announcements", []);
                    const oToolbar = that.byId("idGlobalAnnouncementTlbr");
                    if (oToolbar) oToolbar.setVisible(false);
                }
            });
        },

        /**
         * Process PROCESS type announcements
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

            // UPDATED: Add status filter for PUBLISHED
            let aAnnouncements = allAnnouncements.filter(item =>
                item.isActive === true && 
                hasProcessType(item.announcementType) &&
                item.announcementStatus === "PUBLISHED"
            );

            aAnnouncements = aAnnouncements.map(item => {
                const tags = (item.toTypes || [])
                    .map(typeObj => typeObj.type?.name || "")
                    .filter(name => name !== "");

                return {
                    id: item.announcementId,
                    title: item.title || "No Title",
                    description: item.description || "",
                    htmlDescription: that._parseRichText(item.description), // UPDATED: Store original HTML
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

        /**
         * Process GLOBAL type announcements
         */
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
                const oToolbar = this.byId("idGlobalAnnouncementTlbr");
                if (oToolbar) oToolbar.setVisible(false);
            }
        },

        /**
        * Process EMERGENCY type announcements
        */
        _processEmergencyAnnouncements: function (allAnnouncements) {
            var that = this;
            const timeAgo = function (dateString) {
                var timestamp = dateString;
                if (typeof dateString === "string" && dateString.indexOf("/Date(") === 0) {
                    var matches = dateString.match(/\/Date\((\d+)(?:[+-]\d+)?\)\//);
                    if (matches && matches[1]) {
                        timestamp = parseInt(matches[1]);
                    }
                }
                const d = new Date(timestamp);
                const now = new Date();
                const diff = now - d;
                const mins = Math.floor(diff / 60000);
                const hrs = Math.floor(mins / 60);
                const days = Math.floor(hrs / 24);

                if (mins < 1) return "Just now";
                if (mins < 60) return mins + " minute" + (mins === 1 ? "" : "s") + " ago";
                if (hrs < 24) return hrs + " hour" + (hrs === 1 ? "" : "s") + " ago";
                return days + " day" + (days === 1 ? "" : "s") + " ago";
            };

            // UPDATED: Add status filter for PUBLISHED
            let aAnnouncements = allAnnouncements.filter(item =>
                item.isActive !== false &&
                this._hasAnnouncementType(item.announcementType, "Important Announcement") &&
                item.announcementStatus === "PUBLISHED"
            );

            if (aAnnouncements.length === 0) return;

            const transformed = aAnnouncements.map(item => ({
                id: item.announcementId,
                title: item.title,
                description: that._parseRichText(item.description),
                timeAgo: timeAgo(item.startAnnouncement)
            }));

            var oComponent = this.getOwnerComponent();
            // Execute ONLY for Home route and ONLY once
            if(oComponent._bHomeInitialized !== true) {
                oComponent._bHomeInitialized = true;
                this._showEmergencyDialog(transformed);
            }
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
         * Update the global announcement text display
         */
        _updateGlobalAnnouncementText: function () {
            const oModel = this.getView().getModel("globalAnnouncementModel");
            const aAnnouncements = oModel.getProperty("/announcements");
            const iCurrentIndex = oModel.getProperty("/currentIndex");

            if (!aAnnouncements || aAnnouncements.length === 0) return;

            const oCurrentAnnouncement = aAnnouncements[iCurrentIndex];
            const oText = this.byId("idGlobalAnnouncementTxt");

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
                const oModel = this.getView().getModel("globalAnnouncementModel");
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

        _showEmergencyDialog: function (aAnnouncements) {
            const oModel = new JSONModel({ announcements: aAnnouncements });
            this.getView().setModel(oModel, "emergencyModel");

            if (!this._oEmergencyDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "com.incture.customportal.fragments.EmergencyAnnouncements",
                    controller: this
                }).then(oDialog => {
                    this._oEmergencyDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    oDialog.open();
                });
            } else {
                this._oEmergencyDialog.open();
            }
        },

        onDismissAllEmergencyAnnouncements: function () {
            if (this._oEmergencyDialog) {
                this._oEmergencyDialog.close();
                MessageToast.show("All Important Announcements dismissed");
            }
        },

        onAfterCloseEmergencyDialog: function () {
            const oModel = this.getView().getModel("emergencyModel");
            if (oModel) {
                oModel.destroy();
                this.getView().setModel(null, "emergencyModel");
            }
        },

        /**
         * Override onExit to clean up interval
         */
        onExit: function () {
            this._stopGlobalAnnouncementRotation();

            // Clean up emergency dialog
            if (this._oEmergencyDialog) {
                this._oEmergencyDialog.destroy();
                this._oEmergencyDialog = null;
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

        /**
 * Helper: Check if announcement type contains specified type
 */
        _hasAnnouncementType: function (announcementType, typeToCheck) {
            if (!announcementType) return false;
            const types = announcementType.split(',').map(type => type.trim());
            return types.includes(typeToCheck);
        },

        // Optional: Add formatter for date display
        formatter: {
            formatDate: function (sDate) {
                if (!sDate) return "";
                const date = new Date(sDate);
                return date.toLocaleDateString("en-US", {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        },

        onQuickLinkPress: function (oEvent) {
            const sUrl = oEvent.getSource().data("action");
            if (sUrl) {
                window.open(sUrl, "_blank");
            } else {
                sap.m.MessageToast.show("No link configured.");
            }
        },

        /**
         * Sets up responsive behavior for the scroll container
         */
        _setupResponsiveScrollContainer: function () {
            var oScroll = this.byId("idApplicationsScrollContainer");
            var oGrid = this.byId("idApplicationsTileGrid");

            if (oScroll && oGrid) {
                // With 8 hard-coded tiles → exactly 2 rows, no scroll needed initially
                oScroll.setHeight("auto");

                // Check if we need scrolling based on tile count
                var iTileCount = oGrid.getContent().length;
                if (iTileCount > 8) {
                    // Fix height to 2 rows so scroll kicks in for additional tiles
                    oScroll.setHeight("20rem");
                }
            }
        },

        /**
         * Attach resize handler for responsive adjustments
         */
        _attachResizeHandler: function () {
            // Use SAP UI5's built-in resize handler
            sap.ui.core.ResizeHandler.register(this.getView(), this._onResize.bind(this));
        },

        /**
         * Handle window resize events for responsive behavior
         */
        _onResize: function () {
            // Refresh announcement styles on resize to ensure proper display
            setTimeout(() => {
                this._updateAnnouncementStyles();
            }, 100);
        },

        _setDateAndTemp: function (oBannerModel) {
            // Format current date
            var oDate = new Date();
            var options = { weekday: "short", month: "short", day: "numeric" };
            var sDateStr = oDate.toLocaleDateString("en-US", options);

            var sUrl = "https://api.openweathermap.org/data/2.5/weather?q=Delhi&units=metric&appid=581e55b2ebf99e5d813b59b77e2ea49b";

            jQuery.ajax({
                url: sUrl,
                method: "GET",
                success: function (oData) {
                    var sTemp = Math.round(oData.main.temp) + "°C";
                    oBannerModel.setProperty("/dateTemp", sDateStr);
                },
                error: function () {
                    // fallback if API fails
                    oBannerModel.setProperty("/dateTemp", sDateStr + " | 32°C");
                }
            });
        },

        _initializeKnowledgeArticles: function () {
            // Initialize with empty model first
            var oArticlesModel = new JSONModel({ values: [] });
            this.getView().setModel(oArticlesModel, "articlesModel");

            // Then load the hard-coded articles
            this._loadKnowledgeArticles();
        },

        _loadKnowledgeArticles: function () {
            var oArticlesModel = this.getView().getModel("articlesModel");

            var aArticles = [
                {
                    articleName: "How to Request Access using the New Vital Self Service Access Tool",
                    url: "https://jnjfinance.service-now.com/fsp?id=kb_article&sys_id=8cdb131ddb4c12106853676ed396193a",
                    views: "1906"
                },
                {
                    articleName: "Error While Loading AFO Reports? Try This!",
                    url: "https://jnjfinance.service-now.com/fsp?id=kb_article&sys_id=c12667b4db509e146853676ed39619dd",
                    views: "1599"
                },
                {
                    articleName: "System Enhancement Playbook",
                    url: "https://jnjfinance.service-now.com/fsp?id=kb_article&sys_id=system123",
                    views: "924"
                },
                {
                    articleName: "Virtual Report Access Removal",
                    url: "https://jnjfinance.service-now.com/fsp?id=kb_article&sys_id=b68a522b1b0fce5d99c9c9192a4bcbb1",
                    views: "640"
                },
                {
                    articleName: "SOX / Accuracy Controls Guidance for Enhancements and Deferred Defects in Vital Get Help",
                    url: "https://jnjfinance.service-now.com/fsp?id=kb_article&sys_id=4aef47c11b54961499c9c9192a4bcb58",
                    views: "516"
                }
            ];

            // Add sequential numbers
            aArticles.forEach(function (article, index) {
                article.number = (index + 1) + ".";
            });

            // Set the data
            oArticlesModel.setData({ values: aArticles });
            oArticlesModel.refresh(true);

            console.log("Articles model updated with numbered data");
        },

        /**
         * Creates tiles programmatically and adds them to the Grid
         */
        _createTiles: function () {
            var oGrid = this.byId("idApplicationsTileGrid");
            var oTilesModel = this.getView().getModel("tilesModel");
            var aTiles = oTilesModel.getProperty("/tiles");

            console.log(aTiles);

            // Clear existing tiles
            oGrid.removeAllContent();

            aTiles.forEach(function (tileData) {
                // Create ImageContent
                var oImageContent = new ImageContent({
                    src: tileData.icon
                });

                // Create TileContent
                var oTileContent = new TileContent({
                    content: oImageContent
                });

                // Create GenericTile
                var oTile = new GenericTile({
                    header: tileData.title,
                    subheader: tileData.subtitle,
                    tileContent: [oTileContent],
                    press: this.onTilePress.bind(this)
                });

                // Add custom data to identify the tile
                oTile.data("tileData", tileData);

                // Set responsive layout data
                // L3 = 4 tiles per row on large screens
                // M6 = 2 tiles per row on medium screens  
                // S12 = 1 tile per row on small screens
                oTile.setLayoutData(new GridData({
                    span: "L3 M6 S12"
                }));

                // Add standard SAP UI5 margin classes for proper spacing
                oTile.addStyleClass("sapUiTinyMargin");

                // Add tile to grid
                oGrid.addContent(oTile);
            }.bind(this));

            // Update scroll container behavior after tiles are created
            this._setupResponsiveScrollContainer();
        },

        /**
         * Handle tile press event with iframe loading and fallback to new tab
         * @param {sap.ui.base.Event} oEvent - The tile press event
         */
        // onTilePress: function(oEvent) {
        //     var oContext = oEvent.getSource().getBindingContext("tilesModel");
        //     if (!oContext) {
        //         MessageToast.show("No data found for this tile");
        //         return;
        //     }

        //     var oData = oContext.getObject();
        //     var sUrl = oData.url;
        //     var sEmbedMode = oData.embedMode;
        //     var sTitle = oData.title || "Application";

        //     if (!sUrl) {
        //         MessageToast.show("Application URL not found");
        //         return;
        //     }

        //     // Check if embed mode is explicitly set to "newtab"
        //     if (sEmbedMode === "newtab") {
        //         this._openInNewTab(sUrl, sTitle);
        //         return;
        //     }

        //     // Try to load in iframe, with fallback to new tab
        //     this._loadInIframe(sUrl, sTitle);
        // },
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

        onTilePress: function (oEvent) {
            var oTile = oEvent.getSource();
            var oData = oTile.data("tileData"); // <-- fetch from custom data

            if (!oData) {
                MessageToast.show("No data found for this tile");
                return;
            }

            var sUrl = oData.url;
            var sEmbedMode = oData.embedMode;
            var sTitle = oData.title || "Application";

            if (!sUrl) {
                MessageToast.show("Application URL not found");
                return;
            }

            if (sEmbedMode === "newtab") {
                this._openInNewTab(sUrl, sTitle);
                return;
            }

            this._loadInIframe(sUrl, sTitle);
        },

        /**
         * Load application in iframe with fallback mechanism
         * @param {string} sUrl - Application URL
         * @param {string} sTitle - Application title
         */
        // _loadInIframe: function (sUrl, sTitle) {
        //     // Hide tiles and show iframe container
        //     this.byId("idApplicationsTileContainerVBx").setVisible(false);

        //     var oVBox = this.byId("idIFrameContainerVBx");
        //     oVBox.removeAllItems();
        //     oVBox.setVisible(true);

        //     // Show loading indicator
        //     this._showLoadingMessage("Loading " + sTitle + "...");

        //     // Clear any existing timeout
        //     if (this._iframeLoadTimeout) {
        //         clearTimeout(this._iframeLoadTimeout);
        //     }

        //     var that = this;
        //     var bLoaded = false;
        //     var sIframeId = "idEmbeddediFrame_" + Date.now(); // Unique ID

        //     // Create iframe with enhanced attributes
        //     var sIframeContent = "<div style='position:relative;width:100%;height:90vh;'>" +
        //         "<iframe id='" + sIframeId + "' " +
        //         "src='" + sUrl + "' " +
        //         "style='width:100%;height:100%;border:none;' " +
        //         "sandbox='allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox' " +
        //         "loading='eager'>" +
        //         "<p>Your browser does not support iframes.</p>" +
        //         "</iframe>" +
        //         "<div id='loadingOverlay_" + sIframeId + "' style='position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;font-size:16px;'>Loading...</div>" +
        //         "</div>";

        //     var oIframe = new sap.ui.core.HTML({
        //         content: sIframeContent
        //     });
        //     oVBox.addItem(oIframe);

        //     // Set timeout for fallback (10 seconds)
        //     this._iframeLoadTimeout = setTimeout(function () {
        //         if (!bLoaded) {
        //             console.log("❌ Iframe timeout for: " + sUrl);
        //             MessageToast.show("Application failed to load. Opening in new tab...");
        //             that._openInNewTab(sUrl, sTitle);
        //         }
        //     }, 10000);

        //     // Wait for DOM to be ready, then attach event handlers
        //     setTimeout(function () {
        //         var iframe = document.getElementById(sIframeId);
        //         var loadingOverlay = document.getElementById('loadingOverlay_' + sIframeId);

        //         if (!iframe) {
        //             console.error("Iframe not found in DOM");
        //             that._openInNewTab(sUrl, sTitle);
        //             return;
        //         }

        //         // Success handler
        //         var fnOnLoad = function () {
        //             if (bLoaded) return; // Prevent multiple calls
        //             bLoaded = true;
        //             clearTimeout(that._iframeLoadTimeout);

        //             // Hide loading overlay
        //             if (loadingOverlay) {
        //                 loadingOverlay.style.display = 'none';
        //             }

        //             console.log("✅ Iframe loaded successfully: " + sUrl);
        //             MessageToast.show(sTitle + " loaded successfully");

        //             // Additional verification after a short delay
        //             setTimeout(function () {
        //                 that._verifyIframeContent(iframe, sUrl, sTitle);
        //             }, 2000);
        //         };

        //         // Error handler
        //         var fnOnError = function () {
        //             if (bLoaded) return; // Prevent multiple calls
        //             bLoaded = true;
        //             clearTimeout(that._iframeLoadTimeout);

        //             console.log("❌ Iframe error for: " + sUrl);
        //             MessageToast.show("Failed to load " + sTitle + ". Opening in new tab...");
        //             that._openInNewTab(sUrl, sTitle);
        //         };

        //         // Attach event handlers
        //         iframe.onload = fnOnLoad;
        //         iframe.onerror = fnOnError;

        //         // Additional error detection for blocked content
        //         iframe.addEventListener('load', function () {
        //             // Check if iframe was redirected to an error page
        //             setTimeout(function () {
        //                 try {
        //                     var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        //                     if (iframeDoc && iframeDoc.title &&
        //                         (iframeDoc.title.toLowerCase().includes('error') ||
        //                             iframeDoc.title.toLowerCase().includes('blocked'))) {
        //                         throw new Error('Error page detected');
        //                     }
        //                 } catch (e) {
        //                     // Cross-origin restrictions - this is expected for external sites
        //                     // Don't treat this as an error
        //                     console.log("Cross-origin iframe - cannot verify content");
        //                 }
        //             }, 1000);
        //         });

        //     }, 100);
        // },

        _loadInIframe: function (sUrl, sTitle) {
            // Reference the HTML control for the iframe
            var oHtml = this.byId("idApplicationFrameHtml");

            if (!oHtml) {
                console.error("idApplicationFrameHtml not found in the view");
                this._openInNewTab(sUrl, sTitle);
                return;
            }

            // Show loading indicator
            this._showLoadingMessage("Loading " + sTitle + "...");

            // Clear any existing timeout
            if (this._iframeLoadTimeout) {
                clearTimeout(this._iframeLoadTimeout);
            }

            var that = this;
            var bLoaded = false;
            var sIframeId = "idEmbeddediFrame_" + Date.now();

            // Create iframe + overlay
            var sIframeContent =
                "<div style='position:relative;width:100%;height:90vh;'>" +
                "<iframe id='" + sIframeId + "' " +
                "src='" + sUrl + "' " +
                "style='width:100%;height:100%;border:none;' " +
                "sandbox='allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox' " +
                "loading='eager'>" +
                "<p>Your browser does not support iframes.</p>" +
                "</iframe>" +
                "<div id='loadingOverlay_" + sIframeId + "' " +
                "style='position:absolute;top:0;left:0;width:100%;height:100%;" +
                "background:rgba(255,255,255,0.9);display:flex;" +
                "align-items:center;justify-content:center;font-size:16px;'>Loading...</div>" +
                "</div>";

            // Inject into core:HTML control
            oHtml.setContent(sIframeContent);

            // Timeout fallback (only for iframe mode)
            this._iframeLoadTimeout = setTimeout(function () {
                if (!bLoaded) {
                    console.log("Iframe timeout for: " + sUrl);
                    MessageToast.show("This site cannot be embedded. Opening in new tab...");
                    that._openInNewTab(sUrl, sTitle);
                }
            }, 10000);

            // Wait for DOM injection
            setTimeout(function () {
                var iframe = document.getElementById(sIframeId);
                var loadingOverlay = document.getElementById("loadingOverlay_" + sIframeId);

                if (!iframe) {
                    console.error("Iframe not found in DOM after injection");
                    that._openInNewTab(sUrl, sTitle);
                    return;
                }

                // Success handler
                iframe.onload = function () {
                    if (bLoaded) return;
                    bLoaded = true;
                    clearTimeout(that._iframeLoadTimeout);

                    if (loadingOverlay) {
                        loadingOverlay.style.display = "none";
                    }

                    console.log("Iframe loaded successfully: " + sUrl);
                    MessageToast.show(sTitle + " loaded successfully");

                    // Verify same-origin if possible
                    // setTimeout(function () {
                    //     that._verifyIframeContent(iframe, sUrl, sTitle);
                    // }, 2000);
                };

                // Error handler
                iframe.onerror = function () {
                    if (bLoaded) return;
                    bLoaded = true;
                    clearTimeout(that._iframeLoadTimeout);

                    console.log("Iframe error for: " + sUrl);
                    MessageToast.show("Failed to load " + sTitle + ". Opening in new tab...");
                    that._openInNewTab(sUrl, sTitle);
                };
            }, 200);
        },



        /**
         * Open application in new tab
         * @param {string} sUrl - Application URL
         * @param {string} sTitle - Application title
         */
        _openInNewTab: function (sUrl, sTitle) {
            try {
                var oNewWindow = window.open(sUrl, '_blank', 'noopener,noreferrer');

                if (!oNewWindow) {
                    MessageToast.show("Popup blocked. Please allow popups for this site and try again.");
                } else {
                    MessageToast.show("Opening " + sTitle + " in new tab...");
                }
            } catch (e) {
                MessageToast.show("Failed to open application: " + e.message);
            }
        },

        /**
         * Show loading message
         * @param {string} sMessage - Loading message to show
         */
        _showLoadingMessage: function (sMessage) {
            MessageToast.show(sMessage);
        },

        /**
         * Logo press handler - return to tiles view
         */
        onLogoPress: function () {
            this.byId("idApplicationsTileGrid").setVisible(true);

            const oVBox = this.byId("idIFrameContainerVBx");
            oVBox.removeAllItems();
            oVBox.setVisible(false);

            // Clear any pending timeouts
            if (this._iframeLoadTimeout) {
                clearTimeout(this._iframeLoadTimeout);
                this._iframeLoadTimeout = null;
            }
        },

        /**
         * Announcement press handler
         */
        onAnnouncementPress: function (oEvent) {
            const oItem = oEvent.getSource();
            const oCtx = oItem.getBindingContext("announcementsModel");
            const sPath = oCtx.getPath();
            const oModel = oCtx.getModel();

            const announcements = oModel.getProperty("/announcements");
            const clicked = oModel.getProperty(sPath);

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
         * Enhanced announcement styles update with responsive considerations
         */
        _updateAnnouncementStyles: function () {
            const oList = this.byId("idAnnouncementsLst");
            if (!oList) return;

            const oModel = this.getView().getModel("announcementsModel");
            const aItems = oList.getItems();

            aItems.forEach(oItem => {
                const oCtx = oItem.getBindingContext("announcementsModel");
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

        /**
         * View all announcements handler
         */
        onViewAllPress: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteAnnouncementDetails");
        },

        onViewAllArticles: function () {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteKnowledgeArticleDetails");
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
        }

    });
})