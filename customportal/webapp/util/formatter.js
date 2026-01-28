sap.ui.define([
    "com/incture/customportal/util/formatter"
], (formatter) => {
	"use strict";

	return {
        formatAnnouncementTitle: function (sTitle, iCount) {
            return iCount > 0
                ? `${sTitle} (${iCount})`
                : sTitle;
        }
    };
});