'use strict';

import {Common} from "./Common.js";
import {Stop} from "./Stop.js";
import {Variant} from "./Variant.js";
import {Route} from "./Route.js";

export class StopRoute {
    constructor(/** Stop */ stop, /** Variant */ variant, /** int */ sequence) {
        this.stop = stop;
        this.variant = variant;
        this.sequence = sequence;
    }
}

/**
 * Get the list of route variants serving a particular stop
 * @param {Stop} stop
 * @param {function(int)|undefined} update_count Specify this to update the progress of how many routes are remaining
 * @return {Promise<object<string, array<StopRoute>>>}
 */
StopRoute.get = async function (stop, update_count) {
    const cached = sessionStorage.getItem(stop.id + '_' + Common.getLanguage());
    if (cached !== null) {
        const result = JSON.parse(cached);
        Object.entries(result).forEach(
            entry => {
                result[entry[0]] = entry[1].map(
                    item => new StopRoute(
                        new Stop(item.stop.id, item.stop.name, item.stop.direction, item.stop.sequence)
                        , new Variant(
                            new Route(item.variant.route.number, item.variant.route.bound)
                            , item.variant.serviceType
                            , item.variant.origin
                            , item.variant.destination
                        )
                        , item.sequence
                    )
                );
            }
        );
        return result;
    } else {
        /**
         * @param {array<string>} json.data
         */
        const json = await Common.callApi(
            {
                action : 'getRoutesInStop',
                bsiCode : stop.id
            }
        );
        /** @var object<string, StopRoute> */
        const results = {};
        let remaining_routes = json.data.length;
        if (update_count !== undefined) {
            update_count(remaining_routes);
        }
        await Promise.all(
            json.data.map(
                async item => {
                    const route = item.trim();
                    // loop through each route and bound
                    // let remaining_bounds = data.length;
                    await Promise.all(
                        (await Route.getBounds(route)).map(
                            async bound => {
                                await Promise.all(
                                    (await Variant.get(new Route(route, bound))).map(
                                        async variant => {
                                            (await Stop.get(variant)).forEach(
                                                function (inner_stop) {
                                                    if (
                                                        inner_stop.id === stop.id || (
                                                            inner_stop.name === stop.name
                                                            && inner_stop.getStreet() === stop.getStreet()
                                                            && inner_stop.getDirection() === stop.getDirection()
                                                        )
                                                    ) {
                                                        // allow duplicate entries for the same variant but disallow multiple variants
                                                        if (
                                                            !results.hasOwnProperty(variant.route.getRouteBound())
                                                            || variant.serviceType < results[variant.route.getRouteBound()][0].variant.serviceType
                                                        ) {
                                                            results[variant.route.getRouteBound()] = [];
                                                        }
                                                        const array = results[variant.route.getRouteBound()];
                                                        if (array.length === 0 || variant.serviceType === array[0].variant.serviceType) {
                                                            array.push(new StopRoute(inner_stop, variant, inner_stop.sequence));
                                                        }
                                                    }
                                                }
                                            );
                                        }
                                    )
                                );
                            }
                        )
                    );
                    --remaining_routes;
                    if (update_count !== undefined) {
                        update_count(remaining_routes);
                    }
                }
            )
        );
        sessionStorage.setItem(stop.id + '_' + Common.getLanguage(), JSON.stringify(results));
        if (stop.name === null) {
            stop.name = Object.values(results)[0][0].stop.name;
            return StopRoute.get(stop, update_count);
        } else {
            return results;
        }
    }
}

