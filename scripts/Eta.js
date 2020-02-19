'use strict';

class Eta {
    /**
     * Create an ETA entry
     *
     * @param {!StopRoute} stopRoute The stop-route where the ETA was queried
     * @param {!Date} time The ETA time
     * @param {string} destination The destination of the departure
     * @param {int} distance The distance (in metres) of the bus from the stop
     * @param {string} remark The remark of the ETA (e.g. KMB/NWFB, Scheduled)
     * @param {string} colour The colour of the ETA entry
     */
    constructor(stopRoute, time, destination, distance, remark, colour) {
        this.stopRoute = stopRoute;
        this.time = time;
        this.distance = distance;
        this.destination = destination;
        this.remark = remark;
        this.colour = colour;
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
        'getEta.php'
        , {
            mode : '3eta',
            service_no : stopRoute.variant.route.number,
            stopseq : stopRoute.sequence,
            stopid : stopRoute.stop.id,
            rdv : stopRoute.variant.id,
            bound : stopRoute.variant.route.direction
        }
        , function (data) {
            const etas = [];

            data.forEach(
                function (segments) {
                    if (segments.length >= 27) {
                        etas.push(
                            new Eta(
                                stopRoute
                                , new Date(segments[19].split('|')[4])
                                , segments[26].split('|')[8]
                                , Number(segments[13])
                                // TODO: congestion handling
                                , [
                                    !['', '*'].includes(segments[25].split('|')[0]) ? '' : segments[23]
                                    , segments[25].split('|')[0]
                                    , segments[25].split('|')[1]
                                ].filter(s => !['', '*', '**', undefined].includes(s)).join(', ')
                                , segments[20]
                            )
                        );
                    }
                }
            );
            callback(etas);
        }
    );
};

