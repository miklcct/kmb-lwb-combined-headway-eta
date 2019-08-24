'use strict';

/*
 * Test cases:
 * 1. real circular route (e.g. 37B test Chi Fu, Queen Mary Hospital, Jardine House, Aberdeen Tunnel)
 * 2. split circular route (e.g. 43M test Tin Wan, Wah Kwai, Sassoon Road, Kennedy Town Station, Sasson Road)
 * 3. routes which passes the same stop in the same direction twice (e.g. 2X Shau Kei Wan， 796X Tseung Kwan O Industrial Estate)
 */

(function () {
    const old = $.getJSON;
    $.getJSON = function (url, data, callback) {
        const result = old(url, data, callback);
        result.url = url;
        return result;
    }
})();

const base_url = 'https://rt.data.gov.hk/';
$(document).ajaxError(
    function (/** Event */ event, /** XMLHttpRequest */ jqXHR, /** Object */ ajaxSettings, /** String */ thrownError) {
        alert(('AJAX call to ' + jqXHR.url + ' failed: ' + thrownError).trim());
        window.location.reload();
    }
);

class Route {
    constructor(/** String */ company, /** String */ id, /** String */ origin, /** String */ destination) {
        this.company = company;
        this.id = id;
        this.origin = origin;
        this.destination = destination;
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
    return a.time.getTime() - b.time.getTime();
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
            base_url + '/v1/transport/citybus-nwfb/stop/' + stop_id
            , function (/** Object */ json) {
                stops[stop_id] = new Stop(json.data.stop, json.data.name_en);
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
                    base_url + '/v1/transport/citybus-nwfb/route-stop/' + routes[route_id].company + '/' + routes[route_id].id + '/'
                    + (direction ? 'inbound' : 'outbound')
                    , function (/** Object */ data) {
                        const stop_list = data.data;
                        route_stop[route_id][direction] = [];
                        stop_list.forEach(
                            function (/** Object */ json) {
                                const item = new RouteStop(json.stop, json.route, json.dir === 'I');

                                // FIXME: handle circular route
                                get_stop(json.stop);

                                // I assume seq will not duplicate
                                route_stop[route_id][direction][json.seq] = item;
                                if (stop_route[json.stop] === undefined) {
                                    stop_route[json.stop] = [];
                                }
                                stop_route[json.stop].push(item);
                                stop_route[json.stop].sort(RouteStop.compare);
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
                function (/** Object */ json) {
                    let route = new Route(json.co, json.route, json.orig_en, json.dest_en);
                    routes[json.route] = route;
                    get_route_stop(route.id);
                }
            );
            --get_route_list.remaining;
        }
    )
}
get_route_list.remaining = 2;

Date.prototype.hhmmss = function () {
    function pad(number) {
        if (number < 10) {
            return '0' + number;
        }
        return number;
    }

    return pad(this.getHours()) + ':' + pad(this.getMinutes()) + ':' + pad(this.getSeconds());
};

function get_eta(/** Number */ batch, /** String */ company_id, /** String */ stop_id, /** String */ route_id) {
    ++get_eta.remaining;
    $.getJSON(
        base_url + '/v1/transport/citybus-nwfb/eta/' + company_id + '/' + stop_id + '/' + route_id
        , function (/** Object */ data) {
            if (batch === get_all_etas.batch) {
                data.data.forEach(
                    function (/** Object */ json) {
                        etas.push(
                            new Eta(
                                json.route
                                , json.dir === 'I'
                                , new Date(json.eta)
                                , json.dest_en
                                , json.rmk_en
                            )
                        );
                    }
                );
            }
            if (--get_eta.remaining === 0) {
                etas.sort(Eta.compare);
                $('#eta tbody').empty()
                    .append(
                        etas.filter(
                            function (/** Eta */ eta) {
                                function match(value) {
                                    const segments = value.split('-');
                                    return eta.route_id === segments[1]
                                        && eta.direction === !!segments[2];
                                }
                                return (
                                    get_eta.query_string !== undefined
                                        ? get_eta.query_string.getAll('selections').filter(match)
                                        : $('#common_route_list option:selected').filter(
                                            function (index, element) {
                                                return match($(element).attr('value'));
                                            }
                                        )
                                ).length > 0;
                            }
                        ).slice(0, 3).map(
                            function (/** Eta */ eta) {
                                return $('<tr/>')
                                    .append($('<td/>').text(eta.time.hhmmss()))
                                    .append($('<td/>').text(eta.route_id))
                                    .append($('<td/>').text(eta.destination))
                                    .append($('<td/>').text(eta.remark));
                            }
                        )
                    );
                get_eta.query_string = undefined;
            }
        }
    );
}
get_eta.remaining = 0;

function get_all_etas(/** String */ stop_id, /** Array */ selections) {
    ++get_all_etas.batch;
    etas = [];
    let data = {};
    selections.forEach(
        function (value) {
            const segments = value.split('-');
            if (data[segments[0]] === undefined) {
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

['CTB', 'NWFB'].forEach(get_route_list);

function enable_when_ready() {
    enable_when_ready.$stop_count.text(get_stop.remaining);
    enable_when_ready.$route_count.text(get_route_stop.remaining);
    enable_when_ready.$company_count.text(get_route_list.remaining);
    if (get_route_list.remaining === 0 && get_stop.remaining === 0 && get_route_stop.remaining === 0) {
        let routes_array = Object.values(routes);
        routes_array.sort(
            function (/** Route */ a, /** Route */ b) {
                return compare_route_id(a.id, b.id);
            }
        );
        $('#route_list').empty().append($('<option/>')).append(
            routes_array.map(
                function (/** Route */ route) {
                    return $('<option></option>').attr('value', route.id)
                        .text(route.id + ' ' + route.origin + ' – ' + route.destination);
                }
            )
        ).removeAttr('disabled');
        const $route = $('#route');
        $route.removeAttr('disabled');
        const $route_submit = $('#route_submit');
        $route_submit.removeAttr('disabled');
        if (enable_when_ready.query_string !== undefined) {
            const first_selection = enable_when_ready.query_string.get('selections');
            const segments = first_selection.split('-');
            $route.val(segments[1]);
            $route_submit.click();
            while (!!$('#direction').val() !== !!segments[2]) {
                $('#switch_direction').click();
            }
            const $stop_list = $('#stop_list');
            $stop_list.val(enable_when_ready.query_string.get('stop'));
            $stop_list.change();
            const $common_route_list = $('#common_route_list');
            $common_route_list.val(enable_when_ready.query_string.getAll('selections'));
            $common_route_list.change();
        }
        $('#loading').remove();
        window.clearInterval(enable_when_ready.handler);
    }
}

$(document).ready(
    function () {
        const query_string = new URLSearchParams(window.location.search);
        if (query_string.has('stop') && query_string.has('selections')) {
            enable_when_ready.query_string = query_string;
            get_eta.query_string = query_string;
            get_all_etas(query_string.get('stop'), query_string.getAll('selections'));
        }

        enable_when_ready.$stop_count = $('#stop_count');
        enable_when_ready.$route_count = $('#route_count');
        enable_when_ready.$company_count = $('#company_count');
        const $common_route_list = $('#common_route_list');
        enable_when_ready.handler = window.setInterval(enable_when_ready, 100);
        $('#route').attr('disabled', 'disabled');
        $('#route_list').attr('disabled', 'disabled').change(
            function () {
                $('#route').val($('#route_list option:selected').first().val());
                $('#route_submit').click();
            }
        );
        let route;
        const $switch_direction = $('#switch_direction');
        const $stop_list = $('#stop_list');

        function process() {
            $common_route_list.empty();
            etas = [];
            $('#eta tbody').empty();
            const direction = !!$('#direction').val();
            // FIXME: handle one-way and circular routes
            $('#direction_text').text((direction ? route.destination : route.origin) + ' → ' + (direction ? route.origin : route.destination));
            $stop_list.empty().append($('<option/>')).append(
                route_stop[route.id][direction].map(
                    function (/** RouteStop */ route_stop) {
                        const stop = stops[route_stop.stop_id];
                        return $('<option></option>').attr('value', stop.id).text(stop.id + ' ' + stop.name);
                    }
                )
            ).removeAttr('disabled');

            $switch_direction.removeAttr('disabled');
        }

        $('#route_submit').attr('disabled', 'disabled').click(
            function () {
                const input = $('#route').val();
                route = routes[input];
                if (route === undefined) {
                    alert('Invalid route');
                    return false;
                }
                $('#route_list').val(route.id);
                $('#direction').val('');
                process();
                return false;
            }
        );
        $switch_direction.attr('disabled', 'disabled').click(
            function () {
                const $direction = $('#direction');
                $direction.val(!$direction.val());
                process();
            }
        );
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
        $stop_list.attr('disabled', 'disabled').change(
            function () {
                const stop_id = $('#stop_list option:selected').first().val();
                $common_route_list.empty();
                if (stop_id !== '') {
                    $common_route_list.append(
                        stop_route[stop_id].map(
                            function (/** RouteStop */ data) {
                                const route_id = data.route_id;
                                const inner_direction = data.direction;
                                const inner_route = routes[route_id];
                                const $element = $('<option></option>')
                                    .attr('value', inner_route.company + '-' + route_id + '-' + (inner_direction ? '1' : ''))
                                    .text(route_id + ' ' + (inner_direction ? inner_route.destination : inner_route.origin) + ' → ' + (inner_direction ? inner_route.origin : inner_route.destination));
                                if (inner_route === route && inner_direction === !!$('#direction').val()) {
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