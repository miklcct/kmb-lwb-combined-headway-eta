'use strict';

const Common = {
    PROXY_URL : 'https://cors-anywhere.herokuapp.com/',
    BASE_URL : 'https://mobile.nwstbus.com.hk/api6/',

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
                        return line.split('||');
                    }
                )
            );
        };
    },
    /**
     * Get the "syscode" query parameter common to all NWFB mobile API calls
     * @return {string}
     */
    getSyscode : function () {
        const timestamp = Math.round(Date.now() / 1000);
        const timestamp_string = String(timestamp);
        const random = Math.floor(Math.random() * 1000);
        let random_string = String(random);
        while (random_string.length < 4) {
            random_string = '0' + random_string;
        }
        const source_string = timestamp_string.substr(0, timestamp_string.length - 6) + random_string;
        return source_string + md5(source_string + 'firstbusmwymwy');
    },
    /**
     * Call the NWFB mobile API
     *
     * @param {string} file The file name of the API endpoint to be called, the directory is added automatically
     * @param {Object<string, string>} query The query string parameters, except the common "syscode" and "l"
     * @param {function(!Array<!Array<string>>)} callback The handler for tokenised data
     * @param {function(string)=} preprocess If specified, preprocess the returned string before tokenising it
     */
    callApi : function (file, query, callback, preprocess) {
        $.get(
            Common.PROXY_URL + Common.BASE_URL + file
            , Object.assign(
                {
                    syscode : Common.getSyscode(),
                    l : 1,
                }
                , query
            )
            , Common.getCallbackForMobileApi(callback, preprocess)
        );
    },
    /**
     * Get the stop ID in the query string
     * @return {?int}
     */
    getQueryStopId : function () {
        const stop_id = (new URLSearchParams(window.location.search)).get('stop');
        return stop_id === null ? null : Number(stop_id);
    },
    /**
     * Get the selected route IDs in the query string
     * @return {string[]}
     */
    getQuerySelections : function () {
        return (new URLSearchParams(window.location.search)).getAll('selections');
    }
};