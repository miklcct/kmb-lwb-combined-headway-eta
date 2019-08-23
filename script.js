'use strict';

const base_url = 'https://rt.data.gov.hk/';
const company_ids = ['CTB', 'NWFB'];

$(document).ajaxError(
    function (/** Event */ event, /** XMLHttpRequest */ jqXHR, /** Object */ ajaxSettings, /** String */ thrownError) {
        alert(('AJAX call to ' + $xhr.responseURL + ' failed: ' + thrownError).trim());
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

let routes = [];

company_ids.forEach(
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
                $('#route_list').empty().append($('<option/>')).append(
                    routes.map(
                        function (/** Route */ route) {
                            return $('<option></option>').attr('value', route.route)
                                .text(route.route + ' ' +  route.orig + ' – ' + route.dest);
                        }
                    )
                );
            }
        )
    }
);

$(document).ready(
    function () {
        $('#route_list').change(
            function () {
                $('#route').val($('#route_list option:selected').first().val());
            }
        );
    }
);