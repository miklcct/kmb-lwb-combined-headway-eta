'use strict';

class StopRoute {
    constructor(/** Stop */ stop, /** Variant */ variant, /** int */ sequence) {
        this.stop = stop;
        this.variant = variant;
        this.sequence = sequence;
    }
}

StopRoute.get = function (/** Stop */ stop, /** Function */ callback) {
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
                        // FIXME: handle the case when a route passes the same stop twice (e.g. 701 at Fu Cheong Estate)
                        results[item.variant.route.id] = item;
                    }
                );
            callback(results);
        }
    );
};

