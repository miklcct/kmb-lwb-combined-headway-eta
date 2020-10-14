'use strict';

import {Common} from "./Common.js";

export class Stop {
    constructor(/** string */ id, /** ?string */ name, /** ?string */ direction, /** ?int */ sequence) {
        this.id = id;
        this.name = name ?? localStorage[id + '_' + Common.getLanguage()] ?? null;
        this.direction = direction;
        this.sequence = sequence;
        if (name !== null) {
            localStorage[id + '_' + Common.getLanguage()] = name;
        }
    }
}

Stop.prototype.getStreet = function () {
    return this.id.split('-')[0];
}

Stop.prototype.getDirection = function () {
    return this.id.split('-')[1];
}

/**
 * @param {Variant} variant
 * @returns {Promise<Stop[]>}
 */
Stop.get = async function (variant) {
    /**
     * @param {array<object>} json.data.routeStops
     */
    const json = await Common.callApi(
        {
            action : 'getstops',
            route : variant.route.number,
            bound : variant.route.bound,
            serviceType : variant.serviceType
        }
    );
    return json.data.routeStops.map(
        /**
         * @param {string} item.BSICode
         * @param {string} item.Direction
         * @param {string} item.Seq
         * @returns {!Stop}
         */
        item => new Stop(
            item.BSICode
            , item[
                {
                    'en' : 'EName',
                    'zh-hans' : 'SCName',
                    'zh-hant' : 'CName'
                }[Common.getLanguage()]
            ]
                .toTitleCase()
            , item.Direction.trim()
            , Number(item.Seq)
        )
    );
};
