'use strict';

class Eta {
    constructor(/** String */ route_id, /** Date */ time, /** String */ destination, /** int */ distance, /** String */ description, /** String */ remark) {
        this.route_id = route_id;
        this.time = time;
        this.distance = distance;
        this.destination = destination;
        this.description = description;
        this.remark = remark;
    }
}
Eta.all = [];
Eta.compare = function (/** Eta */ a, /** Eta */ b) {
    return (a.time === null ? Infinity : a.time.getTime()) - (b.time === null ? Infinity : b.time.getTime());
};

Eta.get = function (/** StopRoute */ stopRoute, /** Function */ callback) {
    Common.callApi(
        'getnextbus2.php'
        , {
            service_no : stopRoute.variant.route.number,
            stopseq : stopRoute.sequence,
            stopid : stopRoute.stop.id,
            rdv : stopRoute.variant.id,
            bound : stopRoute.variant.route.direction
        }
        , function (/** Array */ data) {
            const etas = [];
            if (data.length && data[0].length && data[0][0] !== 'HTML') {
                data.forEach(
                    function (/** Array */ segments) {
                        if (segments.length >= 20) {
                            etas.push(
                                new Eta(
                                    segments[1]
                                    , new Date(segments[19].split('|')[0])
                                    , segments[2]
                                    , Number(segments[13])
                                    , segments[17].split('|')[0]
                                    , segments[18].split('|')[0]
                                )
                            );
                        }
                    }
                );
            }
            callback(etas);
        }
    );
};

