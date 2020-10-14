'use strict';

import {Common} from "./Common.js";

export class Variant {
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

Variant.prototype.getOriginDestinationString = function () {
    return this.origin + ' → ' + this.destination;
}

/**
 * Get the list of variants from a route
 *
 * @param {Route} route
 * @return array<!Variant>)
 */
Variant.get = async function (route) {
    /**
     *
     * @param {object} json
     * @param {object} json.data
     * @param {int} json.data.CountSpecal
     * @param {array<object>>} json.data.routes
     * @param {boolean} json.result
     */
    const json = await Common.callApi(
        {
            action : 'getSpecialRoute',
            route : route.number,
            bound : route.bound,
        }
    );
    return json.data.routes.map(
        /**
         * @param {object} item
         * @param {string} item.ServiceType
         * @param {string} item.Origin_ENG
         * @param {string} item.Destination_ENG
         * @param {string} item.Desc_ENG
         * @returns {Variant}
         */
        item => new Variant(
            route
            , Number(item.ServiceType)
            , item[
                {
                    'en' : 'Origin_ENG',
                    'zh-hans' : 'Origin_CHI',
                    'zh-hant' : 'Origin_CHI'
                }[Common.getLanguage()]
            ]
                .toTitleCase()
            , item[
                {
                    'en' : 'Destination_ENG',
                    'zh-hans' : 'Destination_CHI',
                    'zh-hant' : 'Destination_CHI'
                }[Common.getLanguage()]
            ]
                .toTitleCase()
            , item[
                {
                    'en' : 'Desc_ENG',
                    'zh-hans' : 'Desc_CHI',
                    'zh-hant' : 'Desc_CHI'
                }[Common.getLanguage()]
            ]
        )
    );
};

