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

$(document).ready(
    function () {
        const $common_route_list = $('#common_route_list');
        const $route = $('#route');
        const $route_submit = $('#route_submit');
        const $route_list = $('#route_list');
        const $switch_direction = $('#switch_direction');
        const $stop_list = $('#stop_list');
        const $eta_body = $('#eta tbody');
        const $eta_loading = $('#eta_loading');
        const $eta_last_updated = $('#eta_last_updated');
        const $variant_list = $('#variant_list');

        const query_string = (function (query_string) {
            if (query_string.has('stop') && query_string.has('selections')) {
                get_all_etas(query_string.get('stop'), query_string.getAll('selections'));
                return query_string;
            } else {
                return null;
            }
        })(new URLSearchParams(window.location.search));

        $('#failure').css('display', 'none');

        $route.attr('disabled', 'disabled');
        $eta_loading.css('display', 'none');

        $route_list.attr('disabled', 'disabled').change(
            function () {
                const route = $('#route_list option:selected').first().data('model');
                if (route !== undefined) {
                    $route.val(route.number);
                    if (route.number_of_ways === 2) {
                        $switch_direction.removeAttr('disabled');
                    } else {
                        $switch_direction.attr('disabled', 'disabled');
                    }
                    $variant_list.empty().append($('<option/>')).attr('disabled', 'disabled');
                    Variant.get(
                        route
                        , function (/** Object */ variants) {
                            Object.values(variants)
                                .sort(
                                    function (/** Variant */ a, /** Variant */ b) {
                                        return a.sequence - b.sequence;
                                    }
                                )
                                .forEach(
                                    function (/** Variant */ variant) {
                                        $variant_list.append(
                                            $('<option/>').attr('value', variant.id)
                                                .text(variant.sequence + ' ' + variant.description)
                                                .data('model', variant)
                                        );
                                    }
                                );
                            $variant_list.removeAttr('disabled');
                        }
                    );
                }
            }
        );

        $route_submit.attr('disabled', 'disabled').click(
            function () {
                const input = $route.val().toUpperCase();
                $route.val(input);
                let found = false;
                $route_list.children().each(
                    function () {
                        const route = $(this).data('model');
                        if (route !== undefined && input === route.number) {
                            found = true;
                            $route_list.val(route.id).change();
                            return false;
                        }
                    }
                );
                if (!found) {
                    alert('Invalid route');
                }
                return false;
            }
        );

        $switch_direction.attr('disabled', 'disabled').click(
            function () {
                const selected_route = $('#route_list option:selected').first().data('model');
                if (selected_route !== undefined) {
                    $route_list.children().each(
                        function () {
                            const route = $(this).data('model');
                            if (route !== undefined && selected_route.number === route.number && selected_route.direction !== route.direction) {
                                $route_list.val(route.id).change();
                                return false;
                            }
                        }
                    );
                }
            }
        );

        $variant_list.attr('disabled', 'disabled').change(
            function () {
                const variant = $('#variant_list option:selected').first().data('model');
                if (variant !== undefined) {
                    $stop_list.empty().append($('<option/>')).attr('disabled', 'disabled');
                    Stop.get(
                        variant
                        , function (/** Array */ stops) {
                            $stop_list.append(
                                stops.map(
                                    function (/** Stop */ stop, /** int */ index) {
                                        return $('<option></option>').attr('value', stop.id)
                                            .text(index + ' ' + stop.name)
                                            .data('sequence', index)
                                            .data('model', stop);
                                    }
                                )
                            ).removeAttr('disabled');
                        }
                    )
                }
            }
        );

        $stop_list.attr('disabled', 'disabled').change(
            function () {
                const stop = $('#stop_list option:selected').first().data('model');
                if (stop !== undefined) {
                    $common_route_list.empty().attr('disabled', 'disabled');
                    StopRoute.get(
                        stop
                        , function (/** Object */ result) {
                            Object.values(result).sort(
                                function (/** StopRoute */ a, /** StopRoute */ b) {
                                    return Route.compare(a.variant.route, b.variant.route);
                                }
                            )
                                .forEach(
                                    function (/** StopRoute */ stopRoute) {
                                        const $element = $('<option></option>').attr('value', stopRoute.variant.route.id)
                                            .text(stopRoute.variant.route.getDescription())
                                            .data('model', stopRoute);
                                        if (stopRoute.variant.route.id === $route_list.val()) {
                                            $element.attr('selected', 'selected');
                                            const selected_sequence = $('#stop_list option:selected').first().data('sequence');
                                            if (selected_sequence !== undefined && stopRoute.sequence !== selected_sequence) {
                                                // this is needed to handle a route passing the same stop twice, e.g. 2X or 796X
                                                $stop_list.children().each(
                                                    function () {
                                                        const $this = $(this);
                                                        const sequence = $this.data('sequence');
                                                        if (sequence === stopRoute.sequence) {
                                                            $this.attr('selected', 'selected');
                                                            return false;
                                                        }
                                                    }
                                                );
                                            }
                                        }
                                        $common_route_list.append($element);
                                    }
                                );
                            $common_route_list.removeAttr('disabled').change();
                        }
                    )
                }
            }
        );

        const update_eta = function () {
            clearTimeout(update_eta.timer);
            $eta_loading.css('display', 'block');
            let count = 0;
            ++update_eta.batch;
            const batch = update_eta.batch;
            const all_etas = [];
            $('#common_route_list option:selected').each(
                function () {
                    const model = $(this).data('model');
                    if (model !== undefined) {
                        ++count;
                        Eta.get(
                            model
                            , function (/** Array */ etas) {
                                if (batch === update_eta.batch) {
                                    all_etas.push(...etas);
                                    if (--count === 0) {
                                        all_etas.sort(Eta.compare);
                                        $eta_body.empty()
                                            .append(
                                                all_etas.slice(0, 3).map(
                                                    function (/** Eta */ eta) {
                                                        return $('<tr/>')
                                                            .append($('<td/>').text(eta.time === null ? '' : eta.time.hhmmss()))
                                                            .append($('<td/>').text(eta.route_id))
                                                            .append($('<td/>').text(eta.destination))
                                                            .append($('<td/>').text(eta.description))
                                                            .append($('<td/>').text(eta.remark));
                                                    }
                                                )
                                            );
                                        $eta_loading.css('display', 'none');
                                        $eta_last_updated.text((new Date).hhmmss());
                                        update_eta.timer = setTimeout(update_eta, 15000);
                                    }
                                }
                            }
                        );
                    }
                }
            )
        };
        update_eta.batch = 0;
        $common_route_list.attr('disabled', 'disabled').change(update_eta);


        $route_list.empty().attr('disabled', 'disabled');
        $route.val('').attr('disabled', 'disabled');
        $route_submit.attr('disabled', 'disabled');
        Route.get(
            function (/** Object */ routes) {
                let routes_array = Object.values(routes);
                $route_list.empty().append($('<option/>')).append(
                    routes_array.sort(Route.compare).map(
                        function (/** Route */ route) {
                            return $('<option></option>').attr('value', route.id).text(route.getDescription())
                                .data('model', route);
                        }
                    )
                ).removeAttr('disabled');
                $route.removeAttr('disabled');
                $route_submit.removeAttr('disabled');
            }
        );
    }
);