sap.ui.define([
    "com/incture/customportal/util/formatter"
], (formatter) => {
    "use strict";

    return {
        formatAnnouncementTitle: function (sTitle, iCount) {
            return iCount > 0
                ? `${sTitle} (${iCount})`
                : sTitle;
        },

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
        },

        timeAgo: function (dateString) {
            if (!dateString) {
                return "";
            }

            let timestamp = dateString;

            // Handle OData /Date(...)/
            if (typeof dateString === "string" && dateString.indexOf("/Date(") === 0) {
                const matches = dateString.match(/\/Date\((\d+)(?:[+-]\d+)?\)\//);
                if (matches && matches[1]) {
                    timestamp = parseInt(matches[1], 10);
                }
            }

            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;

            const mins = Math.floor(diff / 60000);
            const hrs = Math.floor(mins / 60);
            const days = Math.floor(hrs / 24);

            if (mins < 1) return "Just now";
            if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
            if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
            return `${days} day${days === 1 ? "" : "s"} ago`;
        }
    };
});