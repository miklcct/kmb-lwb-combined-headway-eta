'use strict';

class StopRoute {
    constructor(/** Stop */ stop, /** Variant */ variant, /** int */ sequence) {
        this.stop = stop;
        this.variant = variant;
        this.sequence = sequence;
    }
}

/**
 * Get the list of routes serving a particular stop
 * @param {!Stop} stop
 * @param {function(array<string>)} callback
 */
StopRoute.get = function (stop, callback) {
    Common.callApi(
        {
            action : 'getRoutesInStop',
            bsiCode : stop.id
        }
        /**
         * @param {array<string>} json.data
         */
        , function (json) {
            callback(json.data.map(item => item.trim()));
        }
    );
};

