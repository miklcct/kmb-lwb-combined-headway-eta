'use strict';

class Variant {
    /**
     * Create a route variant
     *
     * @param {!Route} route The route which the variant belongs to
     * @param {int} serviceType A number identifying the particular variant
     * @param {string} origin
     * @param {string} destination
     * @param {string} description The description of the variant, e.g. "Normal routeing"
     */
    constructor(route, serviceType, origin, destination, description) {
        this.route = route;
        this.serviceType = serviceType;
        this.origin = origin;
        this.destination = destination;
        this.description = description;
    }
}

/**
 * Get the list of variants from a route
 *
 * @param {Route} route
 * @param {function(array<!Variant>)} callback
 */
Variant.get = function (route, callback) {
    Common.callApi(
        {
            action : 'getSpecialRoute',
            route : route.number,
            bound : route.bound,
        }
        /**
         *
         * @param {object} json
         * @param {object} json.data
         * @param {int} json.data.CountSpecal
         * @param {array<object>>} json.data.routes
         * @param {boolean} json.result
         */
        , function (json) {
            callback(
                json.data.routes.map(
                    /**
                     * @param {object} item
                     * @param {string} item.ServiceType
                     * @param {string} item.Origin_ENG
                     * @param {string} item.Destination_ENG
                     * @param {string} item.Desc_ENG
                     * @returns {Variant}
                     */
                    item => new Variant(route, Number(item.ServiceType), item.Origin_ENG, item.Destination_ENG, item.Desc_ENG)
                )
            );
        }
    );
};

