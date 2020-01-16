'use strict';

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



function get_eta(/** Number */ batch, /** String */ company_id, /** String */ stop_id, /** String */ route_id) {
    ++get_eta.remaining;
    $.getJSON(
        Common.BASE_URL + 'v1/transport/citybus-nwfb/eta/' + company_id + '/' + stop_id + '/' + route_id
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
                const stop = Stop.all[$('#stop_list option:selected').first().val()];
                if (stop instanceof Stop) {
                    StopRoute.get(stop)
                }
            }
        );

        $common_route_list.attr('disabled', 'disabled').change(
            function () {
                $('#common_route_list option:selected').each(
                    function (index, element) {
                        Eta.get(StopRoute.all[$(element).attr('value')]);
                    }
                )
            }
        );
        Route.get();
    }
);