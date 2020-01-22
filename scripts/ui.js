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

        $('#failure').css('display', 'none');

        $eta_loading.css('display', 'none');

        $route_list.change(
            function () {
                const route = $('#route_list option:checked').first().data('model');
                if (route !== undefined) {
                    $route.val(route.number);
                    if (route.number_of_ways === 2) {
                        $switch_direction.removeAttr('disabled');
                    } else {
                        $switch_direction.attr('disabled', 'disabled');
                    }
                    $variant_list.empty().attr('disabled', 'disabled');
                    Variant.get(
                        route
                        , function (/** Object */ variants) {
                            $variant_list.empty().append($('<option/>'));
                            Object.values(variants)
                                .sort(
                                    function (/** Variant */ a, /** Variant */ b) {
                                        return a.sequence - b.sequence;
                                    }
                                )
                                .forEach(
                                    function (/** Variant */ variant) {
                                        const $option = $('<option/>').attr('value', variant.id)
                                            .text(variant.sequence + ' ' + variant.description)
                                            .data('model', variant);
                                        $.each(
                                            $common_route_list.children()
                                            , function () {
                                                const model = $(this).data('model');
                                                if (model !== undefined && model.variant.id === variant.id) {
                                                    $option.attr('selected', 'selected');
                                                }
                                            }
                                        );
                                        $variant_list.append($option);
                                    }
                                );
                            $variant_list.removeAttr('disabled');
                            $variant_list.change();
                        }
                    );
                }
            }
        );

        $route_submit.click(
            function () {
                const input = $route.val().toUpperCase();
                $route.val(input);
                const found = [];
                $.each(
                    $route_list.children()
                    , function () {
                        const route = $(this).data('model');
                        if (route !== undefined && input === route.number) {
                            found.push(route);
                        }
                    }
                );
                if (found.length) {
                    let changed = false;
                    found.forEach(
                        function (/** Route */ route) {
                            $.each(
                                $common_route_list.children()
                                , function () {
                                    const model = $(this).data('model');
                                    if (model !== undefined && model.variant.route.id === route.id) {
                                        $route_list.val(route.id);
                                        changed = true;
                                        return false;
                                    }
                                }
                            );
                            if (changed) {
                                return false;
                            }
                        }
                    );
                    if (!changed) {
                        $route_list.val(found[0].id);
                    }
                    $route_list.change();
                } else {
                    alert('Invalid route');
                }
                return false;
            }
        );

        $switch_direction.click(
            function () {
                const selected_route = $('#route_list option:checked').first().data('model');
                if (selected_route !== undefined) {
                    $.each(
                        $route_list.children()
                        , function () {
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

        $variant_list.change(
            function () {
                const variant = $('#variant_list option:checked').first().data('model');

                if (variant !== undefined) {
                    $stop_list.empty().attr('disabled', 'disabled');
                    Stop.get(
                        variant
                        , function (/** Array */ stops) {
                            $stop_list.empty().append($('<option/>'));
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
                            const query_stop_id = Common.getQueryStopId();
                            if (query_stop_id !== null) {
                                $stop_list.val(query_stop_id);
                            }
                            if ($stop_list.val()) {
                                $stop_list.change();
                            }
                        }
                    );
                }
            }
        );

        function load_route_list() {
            function choose_route() {
                const original = $route_list.val();
                if (!original) {
                    const query_selections = Common.getQuerySelections();
                    if (query_selections.length) {
                        $route_list.val(query_selections[0]);
                        $route_list.change();
                    }
                }
            }

            if (!load_route_list.loaded) {
                [$route, $route_list, $route_submit, $switch_direction].forEach(
                    function ($element) {
                        $element.attr('disabled');
                    }
                );
                $route_list.empty();
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
                        );
                        [$route, $route_list, $route_submit].forEach(
                            function ($element) {
                                $element.removeAttr('disabled');
                            }
                        );
                        load_route_list.loaded = true;
                        choose_route();
                    }
                );
            } else {
                choose_route();
            }
        }
        load_route_list.loaded = false;

        const update_common_route_list = function (/** Object */ result) {
            $common_route_list.empty();
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
                        const query_selections = Common.getQuerySelections();
                        if (
                            query_selections.includes(stopRoute.variant.route.id)
                            || stopRoute.variant.route.id === $route_list.val()
                        ) {
                            $element.attr('selected', 'selected');
                            const $selected_stop = $('#stop_list option:checked').first();
                            const selected_sequence = $selected_stop.data('sequence');
                            const selected_stop = $selected_stop.data('model');
                            if (
                                selected_stop !== undefined && stopRoute.stop.id === selected_stop.id
                                && selected_sequence !== undefined && stopRoute.sequence !== selected_sequence
                            ) {
                                // this is needed to handle a route passing the same stop twice, e.g. 2X or 796X
                                $.each(
                                    $stop_list.children()
                                    , function () {
                                        const $this = $(this);
                                        const sequence = $this.data('sequence');
                                        /** @var {Stop|undefined} */
                                        const stop = $this.data('model');
                                        if (sequence === stopRoute.sequence && stop.id === stopRoute.stop.id) {
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
            load_route_list();
        };

        function save_state() {
            const query = new URLSearchParams($('#form').serialize());
            if (query.get('stop') === null && Common.getQueryStopId() !== null) {
                query.append('stop', String(Common.getQueryStopId()));
            }
            if (query.get('stop') !== null && window.location.search !== '?' + query.toString()) {
                const query_string = '?' + query.toString();
                window.history.pushState(query_string, undefined, query_string);
            }
        }

        $stop_list.change(
            function () {
                const stop = $('#stop_list option:checked').first().data('model');
                if (stop !== undefined) {
                    save_state();
                    $common_route_list.empty().attr('disabled', 'disabled');
                    clearTimeout(update_eta.timer);
                    StopRoute.get(
                        stop
                        , update_common_route_list
                    );
                }
            }
        );

        const update_eta = function () {
            clearTimeout(update_eta.timer);
            $eta_loading.css('display', 'block');
            let count = 0;
            ++update_eta.batch;
            const batch = update_eta.batch;
            /** @type {Eta[]} */
            const all_etas = [];

            function show_eta() {
                if (count === 0) {
                    all_etas.sort(Eta.compare);
                    $eta_body.empty()
                        .append(
                            all_etas.slice(0, 3).map(
                                function (eta) {
                                    return $('<tr/>')
                                        .append($('<td/>').text(eta.time === null ? '' : eta.time.hhmmss()))
                                        .append($('<td/>').text(eta.stopRoute.variant.route.number))
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

            $('#common_route_list option:checked').each(
                function () {
                    const model = $(this).data('model');
                    if (model !== undefined) {
                        ++count;
                        Eta.get(
                            model
                            , function (/** Array */ etas) {
                                if (batch === update_eta.batch) {
                                    all_etas.push(...etas);
                                    --count;
                                    show_eta();
                                }
                            }
                        );
                    }
                }
            );
            show_eta();
        };
        update_eta.batch = 0;

        $common_route_list.change(
            function () {
                save_state();
                update_eta();
            }
        );

        function init() {

            const stop_id = Common.getQueryStopId();
            if (stop_id !== null) {
                StopRoute.get(
                    new Stop(stop_id, null)
                    , update_common_route_list
                );
            } else {
                load_route_list();
            }
        }

        window.addEventListener('popstate', init);

        init();
    }
);