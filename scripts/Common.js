'use strict';

export const Common = {
    PROXY_URL : 'https://miklcct.com/proxy/',
    API_ENDPOINT : 'https://search.kmb.hk/KMBWebSite/Function/FunctionRequest.ashx',

    /**
     * Call the KMB API
     *
     * @param {object<string, string>} query The query string parameters, except the common "syscode" and "l"
     * @return {Promise<object>}
     */
    callApi : async function (query) {
        return $.get(Common.API_ENDPOINT, query);
    },

    /**
     * Get the stop ID in the query string
     * @return {?string}
     */
    getQueryStopId : function () {
        return (new URLSearchParams(window.location.search)).get('stop');
    },
    /**
     * Get the selected route IDs and stop positions in the query string
     * @return {Array<Array<string|int>>}
     */
    getQuerySelections : function () {
        return (new URLSearchParams(window.location.search)).getAll('selections').map(
            function (/** String */ item) {
                const segments = item.split(':');
                return [segments[0], segments.length >= 2 ? Number(segments[1]) : null];
            }
        );
    },

    /**
     * Get if "one departure" mode is selected
     * @return {boolean}
     */
    getQueryOneDeparture : function () {
        return Boolean((new URLSearchParams(window.location.search)).get('one_departure'));
    },

    /**
     * Get the language used in the document
     * @returns {string}
     */
    getLanguage() {
        return $('html').attr('lang');
    },

    secret : null,
};

/**
 * Convert string to title case
 *
 * FIXME: this is English only
 * @returns {string}
 */
String.prototype.toTitleCase = function () {
    return this.toLowerCase().replace(/((^|[^a-z0-9'])+)(.)/g,  (match, p1, p2, p3) => p1 + p3.toUpperCase());
}
