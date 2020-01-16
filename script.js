'use strict';

const base_url = 'https://rt.data.gov.hk/';

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
    constructor(/** String */ company, /** String */ id, /** String */ route, /** String */ origin, /** String */ destination, /** String */ direction) {
        this.company = company;
        this.id = id;
        this.route = route;
        this.origin = origin;
        this.destination = destination;
        this.direction = direction
    }
}

class Stop {
    constructor(/** String */ id, /** String */ name) {
        this.id = id;
        this.name = name;
    }
}

class RouteStop {
    constructor(/** String */ stop_id, /** String */ route_id, /** Boolean */ direction) {
        this.stop_id = stop_id;
        this.route_id = route_id;
        this.direction = direction;
    }
}

RouteStop.compare = function (/** RouteStop */ a, /** RouteStop */ b) {
    return a.route_id === b.route_id
        ? a.direction - b.direction
        : compare_route_id(a.route_id, b.route_id);
};

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

function compare_route_id(/** String */ a, /** String */ b) {
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


let $stop_count;
let $route_count;
let $company_count;
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
let query_string;

let routes = {};
let stops = {};
let route_stop = {};
let stop_route = {};
let etas = [];

function get_stop(/** string */ stop_id) {
    if (!stops.hasOwnProperty(stop_id)) {
        ++get_stop.remaining;
        stops[stop_id] = null;
        $.getJSON(
            base_url + 'v1/transport/citybus-nwfb/stop/' + stop_id
            , function (/** Object */ json) {
                if (json.data.hasOwnProperty('stop')) {
                    stops[stop_id] = new Stop(json.data.stop, json.data.name_en);
                }
                --get_stop.remaining;
            }
        );
    }
}
get_stop.remaining = 0;

function get_route_stop(/** string */ route_id) {
    if (!route_stop.hasOwnProperty(route_id)) {
        route_stop[route_id] = {};
        get_route_stop.remaining += 2;
        [false, true].forEach(
            function (/** Boolean */ direction) {
                $.getJSON(
                    base_url + 'v1/transport/citybus-nwfb/route-stop/' + routes[route_id].company + '/' + routes[route_id].id + '/'
                    + (direction ? 'inbound' : 'outbound')
                    , function (/** Object */ data) {
                        const stop_list = data.data;
                        route_stop[route_id][+direction] = [];
                        stop_list.forEach(
                            function (/** Object */ json) {
                                const item = new RouteStop(json.stop, json.route, json.dir === 'I');

                                // FIXME: handle circular route
                                get_stop(json.stop);

                                // I assume seq will not duplicate
                                route_stop[route_id][+direction][json.seq] = item;
                                if (!stop_route.hasOwnProperty(json.stop)) {
                                    stop_route[json.stop] = [];
                                }
                                stop_route[json.stop].push(item);
                                stop_route[json.stop].sort(RouteStop.compare);
                            }
                        );
                        // condense the array
                        route_stop[route_id][+direction] = Object.values(route_stop[route_id][+direction]);

                        --get_route_stop.remaining;
                    }
                );
            }
        );
    }
}
get_route_stop.remaining = 0;

function get_route_list(/** String */ company_id) {
    $.get(
        'https://cors-anywhere.herokuapp.com/https://mobile.nwstbus.com.hk/api6/getroutelist2.php'
        , {syscode : get_syscode(), l : 1}
        , function (/** string */ data) {
            const lines = data.split('<br>');
            lines.forEach(
                function (/** String */ line) {
                    if (line !== '') {
                        const segments = line.split('||');
                        console.log(segments);
                        const route = new Route(segments[0], segments[7], segments[1], segments[4], segments[5], segments[9]);
                        routes[route.id] = route;
                    }
                }
            );
            --get_route_list.remaining;
        }
    )
}
get_route_list.remaining = 1;

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

(function () {
    let load_from_cache = false;
    if (is_storage_available()) {
        try {
            const storage_updated = localStorage.getItem('updated');
            if (storage_updated !== null) {
                const route_data_updated = new Date(+storage_updated);
                // update time daily: 03:00 & 21:00 (Hong Kong Time)
                const now = new Date();
                const getChangeover = function (hour) {
                    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (now.getUTCHours() < hour), hour, 0, 0))
                };
                const time0300 = getChangeover(19);
                const time2100 = getChangeover(13);
                if (!(route_data_updated.getTime() < time0300.getTime() || route_data_updated.getTime() < time2100.getTime())) {
                    load_from_cache = true;
                }
            }
        } catch (e) {
            // do not do anything if local storage is corrupted
        }
    }
    load_from_cache = false;
    if (load_from_cache) {
        try {
            routes = JSON.parse(localStorage.getItem('routes'));
            stops = JSON.parse(localStorage.getItem('stops'));
            route_stop = JSON.parse(localStorage.getItem('route_stop'));
            stop_route = JSON.parse(localStorage.getItem('stop_route'));
            get_route_list.remaining = 0;
            return;
        } catch (e) {
            // auto fallback without cache
        }
    }
    localStorage.clear();
    get_route_list();
})();

function enable_when_ready() {
    $stop_count.text(get_stop.remaining);
    $route_count.text(get_route_stop.remaining);
    $company_count.text(get_route_list.remaining);
    if (get_route_list.remaining === 0 && get_stop.remaining === 0 && get_route_stop.remaining === 0) {
        let routes_array = Object.values(routes);
        routes_array.sort(
            function (/** Route */ a, /** Route */ b) {
                return compare_route_id(a.id, b.id);
            }
        );
        if (is_storage_available()) {
            if (localStorage.getItem('updated') === null) {
                localStorage.setItem('routes', JSON.stringify(routes));
                localStorage.setItem('stops', JSON.stringify(stops));
                localStorage.setItem('route_stop', JSON.stringify(route_stop));
                localStorage.setItem('stop_route', JSON.stringify(stop_route));
                localStorage.setItem('updated', (new Date()).getTime().toString());
            }
        }
        $route_list.empty().append($('<option/>')).append(
            routes_array.map(
                function (/** Route */ route) {
                    return $('<option></option>').attr('value', route.id)
                        .text(route.route + ' ' + route.origin + ' → ' + route.destination);
                }
            )
        ).removeAttr('disabled');
        $route.removeAttr('disabled');
        $route_submit.removeAttr('disabled');
        if (query_string !== null) {
            const first_selection = query_string.get('selections');
            const segments = first_selection.split('-');
            $route.val(segments[1]);
            $route_submit.click();
            while ($direction.val() !== segments[2]) {
                $switch_direction.click();
            }
            $stop_list.val(query_string.get('stop'));
            $stop_list.change();
            $common_route_list.val(query_string.getAll('selections'));
            $common_route_list.change();
        }
        $('#loading').remove();
        window.clearInterval(enable_when_ready.handler);
    }
}

$(document).ready(
    function () {
        $stop_count = $('#stop_count');
        $route_count = $('#route_count');
        $company_count = $('#company_count');
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

        query_string = (function (query_string) {
            if (query_string.has('stop') && query_string.has('selections')) {
                get_all_etas(query_string.get('stop'), query_string.getAll('selections'));
                return query_string;
            } else {
                return null;
            }
        })(new URLSearchParams(window.location.search));

        enable_when_ready.handler = window.setInterval(enable_when_ready, 100);

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

        function load_route(/** Route */ route, /** Boolean */ direction) {
            $common_route_list.empty();
            $('#direction_text').text((direction ? route.destination : route.origin) + ' → ' + (direction ? route.origin : route.destination));
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
                const route = routes[$('#route_list option:selected').first().val()];
                $route.val(route.route);
                $direction.val(route.direction);
                $route_submit.click();
            }
        );

        $route_submit.attr('disabled', 'disabled').click(
            function () {
                const input = $route.val().toUpperCase();
                $route.val(input);
                for (const i in routes) {
                    if (routes.hasOwnProperty(i) && routes[i].route === input) {
                        $route_list.val(routes[i].id);
                        $direction.val(routes[i].direction);
                        return false;
                    }
                }
                alert('Invalid route');
                return false;
            }
        );

        $switch_direction.attr('disabled', 'disabled').click(
            function () {
                $direction.val($direction.val() !== 'I' ? 'I' : 'O');
                load_route(routes[$route.val()], $direction.val() === 'I');
            }
        );

        $stop_list.attr('disabled', 'disabled').change(
            function () {
                const stop_id = $('#stop_list option:selected').first().val();
                $common_route_list.empty();
                if (stop_id !== '') {
                    $common_route_list.append(
                        stop_route[stop_id].map(
                            function (/** RouteStop */ data) {
                                const inner_route_id = data.route_id;
                                const inner_direction = data.direction;
                                const inner_route = routes[inner_route_id];
                                const $element = $('<option></option>')
                                    .attr('value', inner_route.company + '-' + inner_route_id + '-' + (inner_direction ? 'I' : 'O'))
                                    .text(inner_route_id + ' ' + (inner_direction ? inner_route.destination : inner_route.origin) + ' → ' + (inner_direction ? inner_route.origin : inner_route.destination));
                                if (inner_route_id === $route.val() && inner_direction === ($direction.val() === 'I')) {
                                    $element.attr('selected', 'selected');
                                }
                                return $element;
                            }
                        )
                    ).removeAttr('disabled');
                    $('#selection_submit').removeAttr('disabled');
                    get_all_etas_from_ui();
                }
            }
        );

        $common_route_list.attr('disabled', 'disabled').change(get_all_etas_from_ui);
    }
);