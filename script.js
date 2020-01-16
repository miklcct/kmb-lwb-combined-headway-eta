'use strict';

const proxy_url = 'https://cors-anywhere.herokuapp.com/';
const base_url = 'https://mobile.nwstbus.com.hk/api6/';
/*
 * Test cases:
 * 1. real circular route (e.g. 701 test Hoi Lai Estate, Fu Cheong Estate, Bute Street, Mong Kok Road, Island Harbourview, Nam Cheong Estate)
 * 2. split circular route (e.g. 43M test Tin Wan, Wah Kwai, Sassoon Road, Kennedy Town Station, Sasson Road)
 * 3. routes which passes the same stop in the same direction twice (e.g. 2X Shau Kei Wan， 796X Tseung Kwan O Industrial Estate)
 */

Date.prototype.hhmmss = function () {
    function pad(number) {
        if (number < 10) {
            return '0' + number;
        }
        return number;
    }

    return pad(this.getHours()) + ':' + pad(this.getMinutes()) + ':' + pad(this.getSeconds());
};

(function () {
    $(document).ajaxError(
        function (/** Event */ event, /** XMLHttpRequest */ jqXHR, /** Object */ ajaxSettings) {
            if (jqXHR.readyState === 4) {
                const $failure = $('#failure');
                $failure.append($('<span/>').text(('AJAX call to ' + ajaxSettings.url + ' failed: ' + jqXHR.status).trim()))
                    .append($('<br/>'));
                $failure.css('display', 'block');
                debugger;
            } else {
                setTimeout(
                    function () {
                        $.ajax(ajaxSettings);
                    }
                    , 1000
                );
            }
        }
    );
})();

class Route {
    constructor(/** String */ company, /** String */ id, /** String */ number, /** String */ origin, /** String */ destination, /** String */ direction, /** int */ number_of_ways) {
        this.company = company;
        this.id = id;
        this.number = number;
        this.origin = origin;
        this.destination = destination;
        this.direction = direction;
        this.number_of_ways = number_of_ways;
    }
}

Route.prototype.getDescription = function () {
    return this.number + ' ' + this.origin + (this.number_of_ways === 0 ? ' ↺ ' : ' → ') + this.destination;
};
Route.compare = function (/** Route */ a, /** Route */ b) {
    return a.number === b.number
        ? a.direction > b.direction ? -1 : a.direction < b.direction ? 1 : 0
        : compare_route_number(a.number, b.number)
};
Route.get = function () {
    Route.all = {};
    $route_list.empty().attr('disabled', 'disabled');
    $route.val('').attr('disabled', 'disabled');
    $route_submit.attr('disabled', 'disabled');
    $.get(
        proxy_url + base_url + 'getroutelist2.php'
        , {syscode : get_syscode(), l : 1}
        , handle_mobile_api_result(
            function (/** Array */ data) {
                data.forEach(
                    function (/** Array */ segments) {
                        const route = new Route(segments[0], segments[7], segments[1], segments[4], segments[5], segments[9], Number(segments[3]));
                        Route.all[route.id] = route;
                    }
                );
                let routes_array = Object.values(Route.all);
                $route_list.empty().append($('<option/>')).append(
                    routes_array.sort(Route.compare).map(
                        function (/** Route */ route) {
                            return $('<option></option>').attr('value', route.id).text(route.getDescription());
                        }
                    )
                ).removeAttr('disabled');
                $route.removeAttr('disabled');
                $route_submit.removeAttr('disabled');
            }
        )
    );
};


class Variant {
    constructor(/** Route */ route, /** String */ id, /** int */ sequence, /** String */ description, /** String */ info) {
        this.route = route;
        this.id = id;
        this.sequence = sequence;
        this.description = description;
        this.info = info;
    }
}
Variant.all = {};
Variant.get = function (/** Route */ route) {
    Variant.all = {};
    $variant_list.empty().attr('disabled', 'disabled');
    $.get(
        proxy_url + base_url + 'getvariantlist.php'
        , {syscode : get_syscode(), l : 1, id : route.id}
        , handle_mobile_api_result(
            function (/** Array */ data) {
                $variant_list.empty().append($('<option/>'));
                data.forEach(
                    function (/** Array */ segments) {
                        const variant = new Variant(route, segments[2], Number(segments[0]), segments[3], segments[4]);
                        Variant.all[variant.id] = variant;
                    }
                );
                Object.values(Variant.all)
                    .sort(
                        function (/** Variant */ a, /** Variant */ b) {
                            return a.sequence - b.sequence;
                        }
                    )
                    .forEach(
                        function (/** Variant */ variant) {
                            $variant_list.append(
                                $('<option/>').attr('value', variant.id).text(variant.sequence + ' ' + variant.description)
                            );
                        }
                    );
                $variant_list.removeAttr('disabled');
            }
        )
    )
};



class Stop {
    constructor(/** String */ id, /** int */ sequence, /** String */ name) {
        this.id = id;
        this.name = name;
        this.sequence = sequence;
    }
}

Stop.prototype.getRoutes = function () {
    $common_route_list.empty().attr('disabled', 'disabled');
    $.get(
        proxy_url + base_url + 'getrouteinstop_eta_extra.php'
        , {syscode : get_syscode(), l : 1, id : this.id}
        , handle_mobile_api_result(
            function (/** Array */ data) {
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
                                new Variant(
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
        )
    );
};

Stop.get = function (/** Variant */ variant) {
    Stop.all = [];
    $stop_list.empty().attr('disabled', 'disabled');
    $.get(
        proxy_url + base_url + 'ppstoplist.php'
        , {syscode : get_syscode(), l : 1, info : '0|*|' + variant.info.replace(/\*\*\*/g, '||')}
        , handle_mobile_api_result(
            function (/** Array */ data) {
                data.forEach(
                    function (/** Array */ segments) {
                        stop = new Stop(segments[3], Number(segments[2]), segments[7]);
                        Stop.all[stop.sequence] = stop;
                    }
                );
                $stop_list.empty().append($('<option/>')).append(
                    Stop.all.map(
                        function (/** Stop */ stop) {
                            return $('<option></option>').attr('value', stop.sequence).text(stop.sequence + ' ' + stop.name);
                        }
                    )
                ).removeAttr('disabled');
            }
        )
    );
};
class StopRoute {
    constructor(/** Variant */ variant, /** int */ sequence) {
        this.variant = variant;
        this.sequence = sequence;
    }
}

class Eta {
    constructor(/** String */ route_id, /** Boolean */ direction, /** Date */ time, /** String */ destination, /** String */ remark) {
        this.route_id = route_id;
        this.direction = direction;
        this.time = time;
        this.destination = destination;
        this.remark = remark;
    }
}

Eta.compare = function (/** Eta */ a, /** Eta */ b) {
    return (a.time === null ? Infinity : a.time.getTime()) - (b.time === null ? Infinity : b.time.getTime());
};

function compare_route_number(/** String */ a, /** String */ b) {
    function explode_segments(/** String */ route_id) {
        let segments = [];
        [...route_id].forEach(
            function (/** String */ character) {
                function is_number(/** String */ x) {
                    return x >= '0' && x <= '9';
                }
                if (
                    segments.length === 0
                    || is_number(
                    segments[segments.length - 1]
                        .charAt(segments[segments.length - 1].length - 1)
                    ) !== is_number(character)
                ) {
                    segments.push(character);
                } else {
                    segments[segments.length - 1] = segments[segments.length - 1] + character;
                }
            }
        );
        return segments;
    }
    const a_segments = explode_segments(a);
    const b_segments = explode_segments(b);
    let i = 0;
    while (i < a_segments.length && i < b_segments.length) {
        const is_a_number = !isNaN(a_segments[i]);
        const is_b_number = !isNaN(b_segments[i]);
        if (is_a_number === is_b_number) {
            if (is_a_number) {
                a_segments[i] = +a_segments[i];
                b_segments[i] = +b_segments[i];
            }
            if (a_segments[i] < b_segments[i]) {
                return -1;
            } else if (b_segments[i] < a_segments[i]) {
                return 1;
            }
        } else {
            return is_a_number > is_b_number ? -1 : 1;
        }
        ++i;
    }
    return i >= a_segments.length ? i >= b_segments.length ? 0 : -1 : 1;
}


let $common_route_list;
let $route;
let $route_submit;
let $route_list;
let $switch_direction;
let $stop_list;
let $eta_body;
let $direction;
let $eta_loading;
let $eta_last_updated;
let $variant_list;
let query_string;

let stops = {};
let route_stop = {};
let stop_route = {};
let etas = [];

function handle_mobile_api_result(handler) {
    return function (/** string */ data) {
        handler(
            data.split('<br>').filter(
                function (/** String */ line) {
                    return line !== '';
                }
            ).map(
                function (/** String */ line) {
                    return line.split('||');
                }
            )
        );
    }
}



function get_eta(/** Number */ batch, /** String */ company_id, /** String */ stop_id, /** String */ route_id) {
    ++get_eta.remaining;
    $.getJSON(
        base_url + 'v1/transport/citybus-nwfb/eta/' + company_id + '/' + stop_id + '/' + route_id
        , function (/** Object */ data) {
            if (batch === get_all_etas.batch) {
                data.data.forEach(
                    function (/** Object */ json) {
                        etas.push(
                            new Eta(
                                json.route
                                , json.dir === 'I'
                                , json.eta === "" ? null : new Date(json.eta)
                                , json.dest_en
                                , json.rmk_en
                            )
                        );
                    }
                );
            }
            if (--get_eta.remaining === 0) {
                etas.sort(Eta.compare);
                $eta_body.empty()
                    .append(
                        etas.filter(
                            function (/** Eta */ eta) {
                                function match(value) {
                                    const segments = value.split('-');
                                    return eta.route_id === segments[1]
                                        && eta.direction === (segments[2] === 'I');
                                }
                                return eta.time !== null && get_all_etas.selections.filter(match).length > 0;
                            }
                        ).slice(0, 3).map(
                            function (/** Eta */ eta) {
                                return $('<tr/>')
                                    .append($('<td/>').text(eta.time === null ? '' : eta.time.hhmmss()))
                                    .append($('<td/>').text(eta.route_id))
                                    .append($('<td/>').text(eta.destination))
                                    .append($('<td/>').text(eta.remark));
                            }
                        )
                    );
                $eta_loading.css('display', 'none');
                $eta_last_updated.text((new Date).hhmmss());
                if (get_all_etas.handler !== null) {
                    window.clearTimeout(get_all_etas.handler);
                    get_all_etas.handler = null;
                }
                get_all_etas.handler = window.setTimeout(
                    function () {
                        get_all_etas(get_all_etas.stop_id, get_all_etas.selections)
                    }
                    , 15000
                );
            }
        }
    );
}
get_eta.remaining = 0;

function get_all_etas(/** String */ stop_id, /** Array */ selections) {
    ++get_all_etas.batch;
    get_all_etas.stop_id = stop_id;
    get_all_etas.selections = selections;
    etas = [];
    $eta_loading.css('display', 'table-row');
    let data = {};
    selections.forEach(
        function (value) {
            const segments = value.split('-');
            if (!data.hasOwnProperty(segments[0])) {
                data[segments[0]] = new Set();
            }
            data[segments[0]].add(segments[1]);
        }
    );
    Object.keys(data).forEach(
        function (key) {
            data[key].forEach(
                function (value) {
                    get_eta(get_all_etas.batch, key, stop_id, value);
                }
            )
        }
    );
}
get_all_etas.batch = 0;
get_all_etas.handler = null;

function is_storage_available() {
    return window.hasOwnProperty('localStorage');
}

function get_syscode() {
    const timestamp = Math.round(Date.now() / 1000);
    const timestamp_string = String(timestamp);
    const random = Math.floor(Math.random() * 1000);
    let random_string = String(random);
    while (random_string.length < 4) {
        random_string = '0' + random_string;
    }
    const source_string = timestamp_string.substr(0, timestamp_string.length - 6) + random_string;
    return source_string + md5(source_string + 'firstbusmwymwy');
}

function update_route_list(routes) {
}

$(document).ready(
    function () {
        $common_route_list = $('#common_route_list');
        $route = $('#route');
        $route_submit = $('#route_submit');
        $route_list = $('#route_list');
        $switch_direction = $('#switch_direction');
        $stop_list = $('#stop_list');
        $direction = $('#direction');
        $eta_body = $('#eta tbody');
        $eta_loading = $('#eta_loading');
        $eta_last_updated = $('#eta_last_updated');
        $variant_list = $('#variant_list');

        query_string = (function (query_string) {
            if (query_string.has('stop') && query_string.has('selections')) {
                get_all_etas(query_string.get('stop'), query_string.getAll('selections'));
                return query_string;
            } else {
                return null;
            }
        })(new URLSearchParams(window.location.search));

        function get_all_etas_from_ui() {
            get_all_etas(
                $('#stop_list option:selected').first().val()
                , $('#common_route_list option:selected').map(
                    function (index, element) {
                        return $(element).attr('value');
                    }
                ).get()
            );
        }

        function load_route(/** Route */ route) {
            $common_route_list.empty();
            $stop_list.empty().append($('<option/>')).append(
                route_stop[route.id][+direction].map(
                    function (/** RouteStop */ route_stop) {
                        const stop_id = route_stop.stop_id;
                        const stop = stops[stop_id];
                        return $('<option></option>').attr('value', stop_id).text(stop_id + ' ' + (stop === null ? '' : stop.name));
                    }
                )
            ).removeAttr('disabled');

            if (route_stop[route.id][1 - direction].length === 0) {
                $switch_direction.attr('disabled', 'disabled');
            } else {
                $switch_direction.removeAttr('disabled');
            }
        }

        $('#failure').css('display', 'none');

        $route.attr('disabled', 'disabled');
        $eta_loading.css('display', 'none');

        $route_list.attr('disabled', 'disabled').change(
            function () {
                const route = Route.all[$('#route_list option:selected').first().val()];
                $route.val(route.number);
                $direction.val(route.direction);
                if (route.number_of_ways === 2) {
                    $switch_direction.removeAttr('disabled');
                } else {
                    $switch_direction.attr('disabled', 'disabled');
                }
                Variant.get(route);
            }
        );

        $route_submit.attr('disabled', 'disabled').click(
            function () {
                const input = $route.val().toUpperCase();
                $route.val(input);
                for (const i in Route.all) {
                    if (Route.all.hasOwnProperty(i) && Route.all[i].number === input) {
                        $route_list.val(Route.all[i].id).change();
                        return false;
                    }
                }
                alert('Invalid route');
                return false;
            }
        );

        $switch_direction.attr('disabled', 'disabled').click(
            function () {
                const route = Route.all[$('#route_list option:selected').first().val()];
                for (const i in Route.all) {
                    if (Route.all.hasOwnProperty(i) && Route.all[i].number === route.number && Route.all[i].direction !== route.direction) {
                        $route_list.val(Route.all[i].id).change();
                        return;
                    }
                }
            }
        );

        $variant_list.attr('disabled', 'disabled').change(
            function () {
                Stop.get(Variant.all[$('#variant_list option:selected').first().val()])
            }
        );

        $stop_list.attr('disabled', 'disabled').change(
            function () {
                stop = Stop.all[$('#stop_list option:selected').first().val()];
                if (stop instanceof Stop) {
                    stop.getRoutes();
                }
            }
        );

        $common_route_list.attr('disabled', 'disabled').change(get_all_etas_from_ui);
        Route.get();
    }
);