'use strict';

const Common = {
    PROXY_URL : 'https://cors-anywhere.herokuapp.com/',
    BASE_URL : 'https://mobile.nwstbus.com.hk/api6/',
    getCallbackForMobileApi : function (/** Function */ handler) {
        return function (/** string */ data) {
            handler(
                data.split('<br>').filter(
                    function (/** String */ line) {
                        return line !== '';
                    }
                ).map(
                    function (/** String */ line) {
                        return line.split('||');
                    }
                )
            );
        };
    }
};