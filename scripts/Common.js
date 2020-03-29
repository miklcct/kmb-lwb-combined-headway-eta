'use strict';

const Common = {
    PROXY_URL : 'https://miklcct.com/proxy/',
    BASE_URL : 'https://mobile02.nwstbus.com.hk/api6/',

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

    getSyscode5 : function () {
        return '15854612224137f8e48d633e7aa12016b89af696f2b0e26597133';
    },

    getAppid : function () {
        return 'fc-5eb1he4ia-b6';
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
                    //syscode : Common.getSyscode(),
                    syscode5 : Common.getSyscode5(),
                    appid : Common.getAppid(),
                    p : 'android',
                    l : 1,
                    ui_v2 : 'Y',
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
    }
};