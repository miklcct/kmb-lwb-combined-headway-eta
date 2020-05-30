'use strict';

class Stop {
    constructor(/** string */ id, /** ?string */ name, /** string */ direction, /** int */ sequence) {
        this.id = id;
        this.name = name;
        this.direction = direction;
        this.sequence = sequence;
    }
}

Stop.get = function (/** Variant */ variant, /** Function */ callback) {
    Common.callApi(
        {
            action : 'getstops',
            route : variant.route.number,
            bound : variant.route.bound,
            serviceType : variant.serviceType
        }
        /**
         * @param {array<object>} json.data.routeStops
         */
        , function (json) {
            callback(
                json.data.routeStops.map(
                    /**
                     * @param {string} item.BSICode
                     * @param {string} item.EName
                     * @param {string} item.Direction
                     * @param {string} item.Seq
                     * @returns {!Stop}
                     */
                    item => new Stop(item.BSICode, item.EName, item.Direction.trim(), Number(item.Seq))
                )
            );
        }
    );
};
