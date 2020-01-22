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
 */
StopRoute.get = function (stop, callback) {
    Common.callApi(
        'getrouteinstop_eta_extra.php'
        , {id : stop.id}
        , function (/** Array */ data) {
            const results = {};
            data.filter(
                function (/** Array */ segments) {
                    return segments.length >= 20;
                }
            )
                .forEach(
                    function (/** Array */ segments) {
                        const item = new StopRoute(
                            stop
                            , new Variant(
                                new Route(segments[0], segments[6], segments[1], segments[9], segments[2], segments[12], Number(segments[4]))
                                , segments[14]
                                , Number(segments[19])
                                , segments[17]
                                , null
                            )
                            , Number(segments[13])
                        );
                        if (!results.hasOwnProperty(item.variant.route.id)) {
                            results[item.variant.route.id] = [];
                        }
                        results[item.variant.route.id].push(item);
                    }
                );
            callback(results);
        }
    );
};

