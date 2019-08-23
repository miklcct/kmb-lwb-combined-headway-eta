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
    seq;
    dir;

    constructor(/** String */ stop, /** String */ name, /** Number */ seq, /** String */ dir) {
        this.stop = stop;
        this.name = name;
        this.seq = seq;
        this.dir = dir;
    }
}

let routes = [];

let company_count = 2;
['CTB', 'NWFB'].forEach(
    function (/** String */ company_id) {
        $.getJSON(
            base_url + '/v1/transport/citybus-nwfb/route/' + company_id
            , {}
            , function (/** Object */ data) {
                const route_list = data.data;
                routes = routes.concat(
                    route_list.map(
                        function  (/** Object */ route_data) {
                            return new Route(route_data.co, route_data.route, route_data.orig_en, route_data.dest_en);
                        }
                    )
                );
                routes.sort(
                    function (/** Route */ a, /** Route */ b) {
                        function explode_segments(/** string */ route_no) {
                            let segments = [];
                            [...route_no].forEach(
                                function (/** string */ character) {
                                    function is_number(/** string */ x) {
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
                        const a_segments = explode_segments(a.route);
                        const b_segments = explode_segments(b.route);
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
                );
                if (--company_count === 0) {
                    $('#route_list').empty().append($('<option/>')).append(
                        routes.map(
                            function (/** Route */ route) {
                                return $('<option></option>').attr('value', route.route)
                                    .text(route.route + ' ' + route.orig + ' – ' + route.dest);
                            }
                        )
                    ).removeAttr('disabled');
                }
            }
        )
    }
);

$(document).ready(
    function () {
        $('#route_list').change(
            function () {
                $('#route').val($('#route_list option:selected').first().val());
                $('#route_submit').click();
            }
        );
        let route;
        let direction;
        const process = function () {
            let stops = [];
            $('#stop_list').empty().attr('disabled', 'disabled');
            $('#switch_direction').attr('disabled', 'disabled');
            // FIXME: handle one-way and circular routes
            $('#direction').text((direction ? route.dest : route.orig) + ' → ' + (direction ? route.orig : route.dest));
            $.getJSON(
                base_url + '/v1/transport/citybus-nwfb/route-stop/' + route.co + '/' + route.route + '/'
                + (direction ? 'inbound' : 'outbound')
                , function (/** Object */ data) {
                    const stop_list = data.data;
                    let stop_count = stop_list.length;
                    stop_list.forEach(
                        function (/** Object */ stop_data) {
                            $.getJSON(
                                base_url + '/v1/transport/citybus-nwfb/stop/' + stop_data.stop
                                , function (/** Object */ stop_detail) {
                                    stops.push(new Stop(stop_data.stop, stop_detail.data.name_en, +stop_data.seq, stop_data.dir));
                                    if (--stop_count === 0) {
                                        stops.sort(
                                            function (/** Stop */ a, /** Stop */ b) {
                                                return a.seq - b.seq;
                                            }
                                        );
                                        $('#stop_list').append($('<option/>')).append(
                                            stops.map(
                                                function (/** Stop */ stop) {
                                                    return $('<option></option>').attr('value', stop.stop).text(stop.name);
                                                }
                                            )
                                        ).removeAttr('disabled');
                                        $('#switch_direction').removeAttr('disabled');
                                    }
                                }
                            );
                        }
                    );
                }
            );
        };

        $('#route_submit').click(
            function () {
                const input = $('#route').val();
                route = routes.find(
                    function (/** Route */ route) {
                        return route.route === input.trim();
                    }
                );
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
        $('#switch_direction').click(
            function () {
                direction = !direction;
                process();
            }
        );
    }
);