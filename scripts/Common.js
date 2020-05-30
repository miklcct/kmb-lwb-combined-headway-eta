'use strict';

const Common = {
    PROXY_URL : 'https://miklcct.com/proxy/',
    SECRET_URL : 'https://miklcct.com/NwfbSecret.json',
    BASE_URL : 'https://mobile02.nwstbus.com.hk/api6/',
    API_ENDPOINT : 'http://search.kmb.hk/KMBWebSite/Function/FunctionRequest.ashx',

    /**
     * Get a callback for AJAX to call the NWFB mobile API and process through handler
     *
     * @param {function(!Array<!Array<string>>)} handler The handler for tokenised data
     * @param {function(string)=} preprocess If specified, preprocess the returned string before tokenising it
     * @return {function(string)}
     */
    getCallbackForMobileApi : function (handler, preprocess) {
        /**
         * @return {function(string)}
         */
        return function (data) {
            if (preprocess !== undefined) {
                data = preprocess(data);
            }
            handler(
                data.split('<br>').filter(
                    function (line) {
                        return line !== '';
                    }
                ).map(
                    function (line) {
                        return line.split('||').map(s => s.replace(/^\|+|\|+$/g, ''));
                    }
                )
            );
        };
    },

    /**
     * Call the KMB API
     *
     * @param {Object<string, string>} query The query string parameters, except the common "syscode" and "l"
     * @param {function(object)} callback The handler for the returned JSON
     */
    callApi : function (query, callback) {
        $.get(Common.PROXY_URL + Common.API_ENDPOINT, query, callback);
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

    secret : null,
};

/**
 * Convert string to title case
 *
 * FIXME: this is English only
 * @returns {string}
 */
String.prototype.toTitleCase = function () {
    return this.toLowerCase().replace(/((^|[^a-z0-9])+)(.)/g,  (match, p1, p2, p3) => p1 + p3.toUpperCase());
}
