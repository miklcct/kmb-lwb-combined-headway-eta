'use strict';

class Stop {
    constructor(/** int */ id, /** String */ name) {
        this.id = Number(id);
        this.name = name;
    }
}

Stop.get = function (/** Variant */ variant) {
    Stop.all = [];
    $stop_list.empty().attr('disabled', 'disabled');
    $.get(
        Common.PROXY_URL + Common.BASE_URL + 'ppstoplist.php'
        , {syscode : get_syscode(), l : 1, info : '0|*|' + variant.info.replace(/\*\*\*/g, '||')}
        , Common.getCallbackForMobileApi(
            function (/** Array */ data) {
                data.forEach(
                    function (/** Array */ segments) {
                        const stop = new Stop(segments[3], segments[7]);
                        const stopRoute = new StopRoute(stop, variant, Number(segments[2]));
                        Stop.all[stopRoute.sequence] = stop;
                    }
                );
                $stop_list.empty().append($('<option/>')).append(
                    Stop.all.map(
                        function (/** Stop */ stop, /** int */ index) {
                            return $('<option></option>').attr('value', index).text(index + ' ' + stop.name);
                        }
                    )
                ).removeAttr('disabled');
            }
        )
    );
};
