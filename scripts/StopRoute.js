'use strict';

class StopRoute {
    constructor(/** Stop */ stop, /** Variant */ variant, /** int */ sequence) {
        this.stop = stop;
        this.variant = variant;
        this.sequence = sequence;
    }
}

StopRoute.get = function (/** Stop */ stop) {
    $common_route_list.empty().attr('disabled', 'disabled');
    StopRoute.all = {};
    Common.callApi(
        'getrouteinstop_eta_extra.php'
        , {id : stop.id}
        , function (/** Array */ data) {
            let routes = [];
            data
                .filter(
                    function (/** Array */ segments) {
                        return segments.length >= 20;
                    }
                )
                .map(
                    function (/** Array */ segments) {
                        console.log(segments);
                        return new StopRoute(
                            stop
                            , new Variant(
                                new Route(segments[0], segments[6], segments[1], segments[9], segments[2], segments[12], Number(segments[4]))
                                , segments[14]
                            )
                            , segments[13]
                        )
                    }
                )
                .sort(
                    function (/** StopRoute */ a, /** StopRoute */ b) {
                        return Route.compare(a.variant.route, b.variant.route);
                    }
                )
                .forEach(
                    function (/** StopRoute */ stopRoute) {
                        StopRoute.all[stopRoute.variant.route.id] = stopRoute;
                        const $element = $('<option></option>').attr('value', stopRoute.variant.route.id).text(stopRoute.variant.route.getDescription());
                        if (stopRoute.variant.route.id === $route_list.val()) {
                            $element.attr('selected', 'selected');
                            if (stopRoute.sequence !== $stop_list.val()) {
                                // this is needed to handle a route passing the same stop twice, e.g. 2X or 796X
                                $stop_list.val(stopRoute.sequence);
                            }
                        }
                        $common_route_list.append($element);
                    }
                );
            $common_route_list.removeAttr('disabled');
        }
    );
};

