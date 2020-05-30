'use strict';

class StopRoute {
    constructor(/** Stop */ stop, /** Variant */ variant, /** int */ sequence) {
        this.stop = stop;
        this.variant = variant;
        this.sequence = sequence;
    }
}

/**
 * Get the list of route variants serving a particular stop
 * @param {Stop} stop
 * @param {function(Object<string, Array<StopRoute>>)} callback
 * @param {function(int)|undefined} update_count Specify this to update the progress of how many routes are remaining
 */
StopRoute.get = function (stop, callback, update_count) {
    Common.callApi(
        {
            action : 'getRoutesInStop',
            bsiCode : stop.id
        }
        /**
         * @param {array<string>} json.data
         */
        , function (json) {
            /** @var object<string, StopRoute> */
            const results = {};
            let remaining_routes = json.data.length;
            update_count(remaining_routes);
            const postprocess = function () {
                if (stop.name === null) {
                    stop.name = Object.values(results)[0][0].stop.name;
                    StopRoute.get(stop, callback);
                } else {
                    callback(results);
                }
            };
            json.data.map(item => item.trim())
                .forEach(
                    function (/** String */ route) {
                        // loop through each route and bound
                        Route.getBounds(
                            route
                            , function (/** int[] */ data) {
                                let remaining_bounds = data.length;
                                data.forEach(
                                    function (bound) {
                                        Variant.get(
                                            new Route(route, bound)
                                            , function (variants) {
                                                let remaining_variants = variants.length;
                                                variants.forEach(
                                                    function (variant) {
                                                        Stop.get(
                                                            variant
                                                            , function (stops) {
                                                                stops.forEach(
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
                                                                --remaining_variants;
                                                                if (remaining_variants === 0) {
                                                                    --remaining_bounds;
                                                                    if (remaining_bounds === 0) {
                                                                        --remaining_routes;
                                                                        update_count(remaining_routes);
                                                                        if (remaining_routes === 0) {
                                                                            postprocess();
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        );
                                                    }
                                                );
                                            }
                                        );
                                    }
                                );
                            }
                        )
                    }
                );
        }
    );
};

