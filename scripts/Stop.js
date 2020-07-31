'use strict';

class Stop {
    constructor(/** int */ id, /** ?string */ name, /** ?string */ stand) {
        id = Number(id);
        this.id = id;
        this.name = name ?? localStorage[id][Common.getLanguage()] ?? null;
        this.stand = stand;
        if (name !== null) {
            if (localStorage[id] === undefined) {
                localStorage[id] = {};
            }
            localStorage[id][Common.getLanguage()] = name;
        }
    }
}

Stop.get = function (/** Variant */ variant, /** Function */ callback) {
    Common.callApi(
        'ppstoplist.php'
        , {info : '0|*|' + variant.info.replace(/\*\*\*/g, '||')}
        , function (/** Array */ data) {
            const stops = [];
            data.forEach(
                function (/** Array */ segments) {
                    stops[Number(segments[2])] = new Stop(segments[3], segments[7], segments[4].match(/[a-zA-Z]/).pop());
                }
            );
            callback(stops);
        }
    );
};
