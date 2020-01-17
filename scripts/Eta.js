'use strict';

class Eta {
    /**
     * Create an ETA entry
     *
     * @param {!StopRoute} stopRoute The stop-route where the ETA was queried
     * @param {!Date} time The ETA time
     * @param {string} destination The destination of the departure
     * @param {int} distance The distance (in metres) of the bus from the stop
     * @param {string} description The description of the route variant of the departure (e.g. "short working")
     * @param {string} remark The remark of the ETA (e.g. KMB/NWFB, Scheduled)
     */
    constructor(stopRoute, time, destination, distance, description, remark) {
        this.stopRoute = stopRoute;
        this.time = time;
        this.distance = distance;
        this.destination = destination;
        this.description = description;
        this.remark = remark;
    }
}

/**
 * Compare two ETA entries by time
 *
 * @param {Eta} a
 * @param {Eta} b
 * @returns {int}
 */
Eta.compare = function (a, b) {
    return (a.time === null ? Infinity : a.time.getTime()) - (b.time === null ? Infinity : b.time.getTime());
};

/**
 * Get a list of ETAs by a route at stop
 *
 * @param {StopRoute} stopRoute
 * @param {function(Array<Eta>)} callback
 */
Eta.get = function (stopRoute, callback) {
    Common.callApi(
        'getnextbus2.php'
        , {
            service_no : stopRoute.variant.route.number,
            stopseq : stopRoute.sequence,
            stopid : stopRoute.stop.id,
            rdv : stopRoute.variant.id,
            bound : stopRoute.variant.route.direction
        }
        , function (data) {
            const etas = [];
            if (data.length && data[0].length && data[0][0] !== 'HTML') {
                data.forEach(
                    function (segments) {
                        while (segments.length >= 18 && segments.length < 20) {
                            // API bug
                            segments.unshift('');
                            segments[2] = segments[2].substr(8);
                        }
                        if (segments.length >= 20) {
                            etas.push(
                                new Eta(
                                    stopRoute
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
        , function (text) {
            return text.substr(0, 4) !== 'HTML' ? (stopRoute.variant.route.company + '||' + stopRoute.variant.route.number + '||').substr(0, 8) + text.substr(8) : text;
        }
    );
};

