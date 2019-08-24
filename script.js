'use strict';

const base_url = 'https://rt.data.gov.hk/';
$(document).ajaxError(
    function (/** Event */ event, /** XMLHttpRequest */ jqXHR, /** Object */ ajaxSettings, /** String */ thrownError) {
        alert(('AJAX call to ' + jqXHR.responseURL + ' failed: ' + thrownError).trim());
    }
);

class Route {
    co;
    route;
    orig;
    dest;

    constructor(/** String */ co, /** String */ route, /** String */ orig, /** String */ dest) {
        this.co = co;
        this.route = route;
        this.orig = orig;
        this.dest = dest;
    }
}

class Stop {
    stop;
    name;

    constructor(/** String */ stop, /** String */ name) {
        this.stop = stop;
        this.name = name;
    }
}

function compare_route_id(/** String */ a, /** String */ b) {
    function explode_segments(/** String */ route_no) {
        let segments = [];
        [...route_no].forEach(
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


let routes = {};
let stops = {};
let route_stop = {};
let stop_route = {};

function get_stop(/** string */ stop_id) {
    if (!stops.hasOwnProperty(stop_id)) {
        ++get_stop.remaining;
        stops[stop_id] = null;
        $.getJSON(
            base_url + '/v1/transport/citybus-nwfb/stop/' + stop_id
            , function (/** Object */ stop_detail) {
                stops[stop_id] = new Stop(stop_detail.data.stop, stop_detail.data.name_en);
                --get_stop.remaining;
            }
        );
    }
}
get_stop.remaining = 0;

function get_route_stop(/** string */ route_id) {
    if (!route_stop.hasOwnProperty(route_id)) {
        route_stop[route_id] = [];
        get_route_stop.remaining += 2;
        [false, true].forEach(
            function (/** Boolean */ direction) {
                $.getJSON(
                    base_url + '/v1/transport/citybus-nwfb/route-stop/' + routes[route_id].co + '/' + routes[route_id].route + '/'
                    + (direction ? 'inbound' : 'outbound')
                    , function (/** Object */ data) {
                        const stop_list = data.data;
                        route_stop[route_id][direction] = [];
                        stop_list.forEach(
                            function (/** Object */ detail) {
                                // FIXME: handle circular route
                                get_stop(detail.stop);

                                // I assume seq will not duplicate
                                route_stop[route_id][direction][detail.seq] = detail.stop;
                                if (stop_route[detail.stop] === undefined) {
                                    stop_route[detail.stop] = [];
                                }
                                stop_route[detail.stop].push({route_id : route_id, direction : detail.dir === 'I'});
                                stop_route[detail.stop].sort(
                                    function (/** Object */ a, /** Object */ b ) {
                                        return a.route_id === b.route_id
                                            ? a.direction - b.direction
                                            : compare_route_id(a.route_id, b.route_id);
                                    }
                                );
                            }
                        );


                        --get_route_stop.remaining;
                    }
                );
            }
        );
    }
}
get_route_stop.remaining = 0;

function get_route_list(/** String */ company_id) {
    $.getJSON(
        base_url + '/v1/transport/citybus-nwfb/route/' + company_id
        , {}
        , function (/** Object */ data) {
            data.data.forEach(
                function (/** Object */ route_data) {
                    let route = new Route(route_data.co, route_data.route, route_data.orig_en, route_data.dest_en);
                    routes[route_data.route] = route;
                    get_route_stop(route.route);
                }
            );
            --get_route_list.remaining;
        }
    )
}

get_route_list.remaining = 2;


['CTB', 'NWFB'].forEach(get_route_list);

function enable_when_ready() {
    enable_when_ready.$stop_count.text(get_stop.remaining);
    enable_when_ready.$route_count.text(get_route_stop.remaining);
    enable_when_ready.$company_count.text(get_route_list.remaining);
    if (get_route_list.remaining === 0 && get_stop.remaining === 0 && get_route_stop.remaining === 0) {
        let routes_array = Object.values(routes);
        routes_array.sort(
            function (/** Route */ a, /** Route */ b) {
                return compare_route_id(a.route, b.route);
            }
        );
        $('#route_list').empty().append($('<option/>')).append(
            routes_array.map(
                function (/** Route */ route) {
                    return $('<option></option>').attr('value', route.route)
                        .text(route.route + ' ' + route.orig + ' – ' + route.dest);
                }
            )
        ).removeAttr('disabled');
        $('#route').removeAttr('disabled');
        $('#route_submit').removeAttr('disabled');
        $('#loading').remove();
        window.clearInterval(enable_when_ready.handler);
    }
}

$(document).ready(
    function () {
        enable_when_ready.$stop_count = $('#stop_count');
        enable_when_ready.$route_count = $('#route_count');
        enable_when_ready.$company_count = $('#company_count');
        enable_when_ready.handler = window.setInterval(enable_when_ready, 100);
        $('#route_list').change(
            function () {
                $('#route').val($('#route_list option:selected').first().val());
                $('#route_submit').click();
            }
        );
        let route;
        let direction;
        const $switch_direction = $('#switch_direction');

        const $stop_list = $('#stop_list');

        function process() {
            $('#common_route_list').empty();
            // FIXME: handle one-way and circular routes
            $('#direction').text((direction ? route.dest : route.orig) + ' → ' + (direction ? route.orig : route.dest));
            $stop_list.empty().append($('<option/>')).append(
                route_stop[route.route][direction].map(
                    function (/** String */ stop_id) {
                        const stop = stops[stop_id];
                        return $('<option></option>').attr('value', stop.stop).text(stop.name);
                    }
                )
            ).removeAttr('disabled');

            $switch_direction.removeAttr('disabled');
        }

        $('#route_submit').click(
            function () {
                const input = $('#route').val();
                route = routes[input];
                if (route === undefined) {
                    alert('Invalid route');
                    return false;
                }
                $('#route_list').val(route.route);
                direction = false;
                process();
                return false;
            }
        );
        $switch_direction.click(
            function () {
                direction = !direction;
                process();
            }
        );
        $stop_list.change(
            function () {
                const stop_id = $('#stop_list option:selected').first().val();
                const $common_route_list = $('#common_route_list').empty();
                if (stop_id !== '') {
                    $common_route_list.append(
                        stop_route[stop_id].map(
                            function (/** Object */ data) {
                                const route_id = data.route_id;
                                const direction = data.direction;
                                const route = routes[route_id];
                                return $('<option></option>')
                                    .text(route_id + ' ' + (direction ? route.dest : route.orig) + ' → ' + (direction ? route.orig : route.dest));
                            }
                        )
                    ).removeAttr('disabled');
                }
            }
        )
    }
);