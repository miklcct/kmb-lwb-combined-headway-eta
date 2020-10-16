import $ from "jquery";
import {Route, Variant, StopRoute, Common, Stop, Eta, IncompleteStop} from "js-kmb-api";

declare global {
    interface Date {
        hhmm(): string;
        hhmmss(): string;
    }
}

const LOCAL_STORAGE_VERSION = 1; // update this when local storage used is no longer compatible

function pad(number : number) : string {
    if (number < 10) {
        return `0${number}`;
    }
    return String(number);
}

Date.prototype.hhmm = function () {
    return `${pad(this.getHours())}:${pad(this.getMinutes())}`;
};

Date.prototype.hhmmss = function () {
    return `${pad(this.getHours())}:${pad(this.getMinutes())}:${pad(this.getSeconds())}`;
};

(() =>
    $(document).ajaxError(
        (event, jqXHR, ajaxSettings) => {
            if (jqXHR.readyState === 4 && jqXHR.status < 500 && jqXHR.status !== 429 && jqXHR.status !== 403) {
                const $failure = $('#failure');
                $failure.append($('<span/>').text(`AJAX call to ${ajaxSettings.url} failed: ${jqXHR.status}`.trim()))
                    .append($('<br/>'));
                $failure.css('display', 'block');
                debugger;
            }
        }
    ))();

$(document).ready(
    () => {
        if (Number(localStorage['$VERSION']) !== LOCAL_STORAGE_VERSION) {
            localStorage.clear();
            localStorage['$VERSION'] = LOCAL_STORAGE_VERSION;
        }

        const $common_route_list = $('#common_route_list');
        const $route = $('#route');
        const $bound = $('#bound');
        const $route_submit = $('#route_submit');
        const $direction = $('#direction');
        const $switch_direction = $('#switch_direction');
        const $stop_list = $('#stop_list');
        const $eta_body = $('#eta tbody');
        const $eta_loading = $('#eta_loading');
        const $eta_last_updated = $('#eta_last_updated');
        const $variant_list = $('#variant_list');
        const $one_departure = $('#one_departure');

        $('#failure').css('display', 'none');

        $eta_loading.css('visibility', 'hidden');

        async function change_route() {
            const input = ($route.val() as string).toUpperCase();
            $route.val(input);
            $switch_direction.attr('disabled', 'disabled');
            $variant_list.attr('disabled', 'disabled');
            const bounds = await Route.getBounds(input);
            if (bounds.length === 0) {
                alert('Invalid route');
                return;
            }
            if (bounds.length !== 1) {
                $switch_direction.removeAttr('disabled');
            }

            const model = new Route(input, Number($bound.val()));
            $route.first().data('model', model);
            $direction.text('');
            const variants = await Variant.get(model);
            $variant_list.empty().append($('<option/>'));
            const sorted = variants.sort(
                (a, b) => a.serviceType - b.serviceType
            );
            if (sorted.length > 0) {
                $direction.text(sorted[0].getOriginDestinationString());
            }
            sorted.forEach(
                variant => {
                    const $option = $('<option/>').attr('value', variant.serviceType)
                        .text(`${variant.serviceType} ${variant.getOriginDestinationString()}${variant.description === '' ? '' : ` (${variant.description})`}`)
                        .data('model', variant);
                    $.each(
                        $common_route_list.children()
                        , function () {
                            const model : StopRoute | undefined = $(this).data('model');
                            if (
                                model !== undefined
                                && model.variant.route.getRouteBound() === variant.route.getRouteBound()
                                && model.variant.serviceType === variant.serviceType
                            ) {
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

        $route_submit.click(
            () => {
                const input = ($route.val() as string).toUpperCase();
                if (click_route.eta !== null) {
                    $bound.val(click_route.eta.stopRoute.variant.route.bound);
                    click_route.eta = null;
                } else {
                    let bound = null;
                    Common.getQuerySelections().forEach(
                        item => {
                            const segments = item[0].split('-');
                            if (segments[0].toUpperCase() === input) {
                                bound = segments[1];
                            }
                        }
                    );
                    if (bound === null) {
                        let in_common_route_list = false;
                        $.each(
                            $common_route_list.children()
                            , function () {
                                const model : StopRoute | undefined = $(this).data('model');
                                if (model !== undefined) {
                                    if (model.variant.route.number === input) {
                                        in_common_route_list = true;
                                        $bound.val(model.variant.route.bound);
                                    }
                                }
                            }
                        );
                        if (!in_common_route_list) {
                            $bound.val(1);
                        }
                    } else {
                        $bound.val(bound);
                    }
                }
                change_route();
                return false;
            }
        );

        $switch_direction.click(
            () => {
                $bound.val(3 - Number($bound.val())); // switch between 1 and 2
                change_route();
            }
        );

        $variant_list.change(
            async () => {
                const variant = $('#variant_list option:checked').first().data('model');

                if (variant !== undefined) {
                    $stop_list.empty().attr('disabled', 'disabled');
                    const stops = await Stop.get(variant);
                    $stop_list.empty().append($('<option/>'));
                    $stop_list.append(
                        stops
                            .sort((a, b) => a.sequence - b.sequence)
                            .map(
                                stop => $('<option></option>').attr('value', stop.id)
                                    .text(`${stop.sequence} ${stop.name} (${stop.id})`)
                                    .data('sequence', stop.sequence)
                                    .data('model', stop)
                            )
                    ).removeAttr('disabled');
                    const query_stop_id = Common.getQueryStopId();
                    if (query_stop_id !== null) {
                        const chosen_route = (
                            () => {
                                const model : Route | undefined = $route.data('model');
                                return model !== undefined ? model.getRouteBound() : null;
                            }
                        )();
                        // handle the case when a route passes the same stop multiple times
                        const selection = Common.getQuerySelections().find(
                            selection => selection[0] === chosen_route && selection[1] !== null
                        );
                        if (selection !== undefined) {
                            $.each(
                                $stop_list.first().children()
                                , function () {
                                    const $this = $(this);
                                    if ($this.data('sequence') === selection[1]) {
                                        $this.attr('selected', 'selected');
                                    }
                                }
                            );
                        } else {
                            // loop through the common route list because KMB uses different stop ID for different poles
                            $.each(
                                $common_route_list.children()
                                , function () {
                                    const model : StopRoute | undefined = $(this).data('model');
                                    if (model !== undefined) {
                                        if (model.variant.route.getRouteBound() === chosen_route) {
                                            $stop_list.val(model.stop.id);
                                        }
                                    }
                                }
                            );
                        }
                    }
                    if ($stop_list.val()) {
                        $stop_list.change();
                    }
                }
            }
        );

        function choose_route() {
            const original = $route.val();
            if (!original) {
                const query_selections = Common.getQuerySelections();
                if (query_selections.length) {
                    $route.val(query_selections[0][0].split('-')[0]);
                    $route_submit.click();
                }
            }
        }

        function update_route_progress(count : number) {
            $('#route_list_loading').css('display', 'block');
            $('#route_list_count').text(count);
        }

        const update_common_route_list = (result: Record<string, StopRoute[]>) => {
            $common_route_list.empty();
            Object.values(result).sort(
                (a, b) => {
                    if (a.length === 0) {
                        return b.length === 0 ? 0 : -1;
                    }
                    if (b.length === 0) {
                        return 1;
                    }
                    return Route.compare(a[0].variant.route, b[0].variant.route);
                }
            )
                .forEach(
                    group => group
                        .sort((a, b) => a.sequence - b.sequence)
                        .forEach(
                            stopRoute => {
                                const $element = $('<option></option>').attr(
                                    'value'
                                    , `${stopRoute.variant.route.getRouteBound()}${group.length > 1 ? `:${stopRoute.sequence}` : ''}`
                                )
                                    .text(
                                        `${stopRoute.variant.route.number} ${stopRoute.variant.getOriginDestinationString()} (${stopRoute.stop.id})`
                                    )
                                    .data('model', stopRoute);
                                $common_route_list.append($element);
                            }
                        )
                );
            const found_exact_matches : {[key : string] : StopRoute} = {};
            const query_selections = Common.getQuerySelections();
            for (let i = 0; i < 2; ++i) {
                $.each(
                    $common_route_list.children()
                    , function () {
                        const $this = $(this);
                        const stopRoute : StopRoute | undefined = $this.data('model');
                        if (stopRoute !== undefined) {
                            const $stop = $('#stop_list option:checked').first();
                            const stop : Stop | undefined = $stop.data('model');
                            const stop_id = stop?.id ?? Common.getQueryStopId();
                            if (
                                query_selections.find(
                                    selection => selection[0] === stopRoute.variant.route.getRouteBound()
                                        && (selection[1] === null || selection[1] === stopRoute.sequence)
                                        && (
                                            stopRoute.stop.id === stop_id
                                            || i && !Object.prototype.hasOwnProperty.call(found_exact_matches, stopRoute.variant.route.getRouteBound())
                                        )
                                ) !== undefined
                                ||
                                stopRoute.variant.route.number === $route.val()
                                && stopRoute.variant.route.bound === Number($bound.val())
                                && stopRoute.stop.id === stop_id
                                && (
                                    stopRoute.variant.serviceType !== Number($variant_list.val())
                                    || stopRoute.sequence === $stop.data('sequence')
                                )
                            ) {
                                $this.attr('selected', 'selected');
                                if (stopRoute.stop.id === stop_id) {
                                    found_exact_matches[stopRoute.variant.route.getRouteBound()] = stopRoute;
                                }
                            }
                        }
                    }
                );
            }
            $common_route_list.removeAttr('disabled').change();
            $('#route_list_loading').css('display', 'none');
            choose_route();
        };

        function update_title(route_numbers : string[], stop_name : string | null) {
            const at_stop_name = stop_name !== null ? ` @ ${stop_name}` : '';
            document.title = (
                route_numbers.length
                    ? route_numbers.join(', ')
                    : {
                        'en' : 'KMB & LWB',
                        'zh-hant' : '九巴及龍運',
                        'zh-hans' : '九巴及龙运'
                    }[Common.getLanguage()]
                )
                + at_stop_name
                + {
                    'en' : ' combined ETA',
                    'zh-hant' : '聯合班次到站時間預報',
                    'zh-hans' : '联合班次到站时间预报'
                }[Common.getLanguage()];
            history.replaceState(window.location.search, '', window.location.search);
            ['en_link', 'zh_hans_link', 'zh_hant_link'].forEach(
                element => {
                    const $element = $(`#${element}`);
                    $element.attr('href', ($element.attr('href') as string).replace(/(\?.*)?$/, window.location.search));
                }
            );
        }

        function save_state() {
            const query = new URLSearchParams($('#form').serialize());
            if (query.get('stop') === null && Common.getQueryStopId() !== null) {
                query.append('stop', String(Common.getQueryStopId()));
            }
            // merge existing query apart from those three
            const original_query = new URLSearchParams(window.location.search);
            original_query.forEach(
                (value, key) => {
                    if (!['stop', 'selections', 'one_departure'].includes(key)) {
                        query.append(key, value);
                    }
                }
            );

            const route_numbers = $('#common_route_list option:checked')
                .map(
                    function () {
                        const stopRoute : StopRoute = $(this).data('model');
                        return stopRoute.variant.route.number;
                    }
                )
                .get();
            const selected_stop : Stop | undefined = $('#stop_list option:checked').first().data('model');
            const compare = (a: URLSearchParams, b: URLSearchParams) => {
                // only handle stop, selections and one_departure
                if (a.get('stop') === b.get('stop') && a.get('one_departure') === b.get('one_departure')) {
                    // check selections are equal
                    const a_selections = a.getAll('selections');
                    const b_selections = b.getAll('selections');
                    if (a_selections.length === b_selections.length) {
                        // check elements are equal
                        for (let i = 0; i < a_selections.length; ++i) {
                            if (a_selections[i] !== b_selections[i]) {
                                return false;
                            }
                        }
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            };
            if (query.get('stop') !== null && !compare(original_query, query)) {
                const query_string = `?${query.toString()}`;
                window.history.pushState(query_string, '', query_string);
            }
            update_title(
                route_numbers
                , selected_stop !== undefined ? selected_stop.name : localStorage[Common.getQueryStopId() ?? ''] ?? null);
        }

        $stop_list.change(
            async () => {
                const stop : Stop|undefined = $('#stop_list option:checked').first().data('model');
                const selected_variant : Variant|undefined = $('#variant_list option:checked').first().data('model');
                if (stop !== undefined) {
                    if ($common_route_list.data('stop_id') !== stop.id) {
                        $common_route_list.empty().attr('disabled', 'disabled');
                        $eta_body.empty();
                        ++update_eta.batch;
                        const result = await StopRoute.get(stop, update_route_progress);
                        update_common_route_list(result);
                        $common_route_list.data('stop_id', stop.id);
                    } else {
                        const selected_route : Route|undefined = $route.first().data('model');
                        if (selected_route !== undefined) {
                            let exact_match_found = false;
                            for (let i = 0; i < 2; ++i) {
                                $.each(
                                    $common_route_list.children()
                                    , function () {
                                        const model : StopRoute|undefined = $(this).data('model');
                                        if (model !== undefined) {
                                            const exact_match = model.stop.id === stop.id
                                                && (
                                                    selected_variant?.serviceType !== model.variant.serviceType
                                                    || model.sequence === stop.sequence
                                                );
                                            if (model.variant.route.getRouteBound() === selected_route.getRouteBound() && (exact_match || i && !exact_match_found)) {
                                                $(this).attr('selected', 'selected');
                                                if (exact_match) {
                                                    exact_match_found = true;
                                                }
                                            }
                                        }
                                    }
                                );
                            }
                            $common_route_list.change();
                        }
                    }
                }
            }
        );

        const click_route : {() : void, eta : Eta | null} = function (this : Element) {
            const eta = $(this).closest('tr').data('model');
            if (eta !== undefined) {
                click_route.eta = eta;
                $route.val(eta.stopRoute.variant.route.number);
                $route_submit.click();
            }
        };
        click_route.eta = null;

        const update_eta = async () => {
            $eta_loading.css('visibility', 'visible');
            const batch = ++update_eta.batch;

            const now = Date.now();
            const filtered_etas = (await Promise.all(
                $('#common_route_list option:checked').map(
                    function () {
                        const model = $(this).data('model');
                        return model !== undefined
                            ? Eta.get(model)
                            : [];
                    }
                )
            ))
                .flat()
                .sort(Eta.compare)
                .filter(
                    // filter only entries from one minute past now
                    /** Eta */ eta => eta.time.getTime() - now >= -60 * 1000
                );
            if (batch === update_eta.batch) {
                const get_eta_row = (eta: Eta) => $('<tr/>')
                    .append($('<td/>').text(eta.time === null ? '' : eta.time.hhmm()).css('font-weight', eta.realTime ? 'bold' : ''))
                    .append($('<td/>').append($('<span class="route"/>').text(eta.stopRoute.variant.route.number).click(click_route)))
                    .append($('<td/>').text(eta.distance ?? ''))
                    .append($('<td/>').text(eta.remark))
                    .data('model', eta);
                $eta_body.empty();
                if (Common.getQueryOneDeparture()) {
                    const shown_variants : Route[] = [];
                    filtered_etas.forEach(
                        eta => {
                            if (!shown_variants.includes(eta.stopRoute.variant.route)) {
                                $eta_body.append(get_eta_row(eta));
                                shown_variants.push(eta.stopRoute.variant.route);
                            }
                        }
                    );
                } else {
                    $eta_body.append(filtered_etas.slice(0, 3).map(get_eta_row));
                }
                $eta_loading.css('visibility', 'hidden');
                $eta_last_updated.text((new Date).hhmmss());
            }
        };
        update_eta.batch = 0;
        setInterval(update_eta, 15000);

        const update = () => {
            save_state();
            update_eta();
        };
        $common_route_list.change(update);
        $one_departure.change(update);

        async function init() {
            $route.val('');
            $variant_list.empty();
            $stop_list.empty();
            $common_route_list.empty();
            $eta_body.empty();

            const stop_id = Common.getQueryStopId();
            if (Common.getQueryOneDeparture()) {
                $one_departure.attr('checked', 'checked');
            } else {
                $one_departure.removeAttr('checked');
            }

            const stop = stop_id !== null ? new IncompleteStop(stop_id) : null;
            update_title(
                Common.getQuerySelections().map(
                    selection => selection[0].split('-')[0]
                )
                , stop?.name ?? null
            );

            if (stop !== null) {
                const results = await StopRoute.get(stop, update_route_progress);
                update_common_route_list(results);
                $common_route_list.data('stop_id', stop_id);
            }
        }

        window.addEventListener('popstate', init);

        init();
    }
);