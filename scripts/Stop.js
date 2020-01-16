'use strict';

class Stop {
    constructor(/** int */ id, /** String */ name) {
        this.id = Number(id);
        this.name = name;
    }
}

Stop.get = function (/** Variant */ variant, /** Function */ callback) {
    $stop_list.empty().attr('disabled', 'disabled');
    Common.callApi(
        'ppstoplist.php'
        , {info : '0|*|' + variant.info.replace(/\*\*\*/g, '||')}
        , function (/** Array */ data) {
            const stops = [];
            data.forEach(
                function (/** Array */ segments) {
                    stops[Number(segments[2])] = new Stop(segments[3], segments[7]);
                }
            );
            callback(stops);
        }
    );
};
