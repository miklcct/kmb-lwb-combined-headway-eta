'use strict';

class Eta {
    /**
     * Create an ETA entry
     *
     * @param {!StopRoute} stopRoute The stop-route where the ETA was queried
     * @param {!Date} time The ETA time
     * @param {?int} distance The distance (in metres) of the bus from the stop
     * @param {string} remark The remark of the ETA (e.g. KMB/NWFB, Scheduled)
     * @param {boolean} realTime If the ETA is real-time
     */
    constructor(stopRoute, time, distance, remark, realTime) {
        this.stopRoute = stopRoute;
        this.time = time;
        this.distance = distance;
        this.remark = remark;
        this.realTime = realTime;
    }
}

Eta.MOBILE_API_METHOD = 'GET';

/**
 * Get a list of ETAs by a route at stop
 *
 * @param {StopRoute} stopRoute
 * @param {function(Array<Eta>)} callback
 */
Eta.get = function (stopRoute, callback) {
    /**
     * @param {array|object} json
     * @param {XMLHttpRequest} jqXHR
     * @param {object[]} json.data.response
     */
    const handler = function (json, jqXHR) {
        if (jqXHR.readyState === 4 && jqXHR.status === 403) {
            Eta.get(stopRoute, callback);
        } else {
            callback(
                (json[0]?.eta ?? [])
                    .map(
                        /**
                         *
                         * @param {String} obj.t
                         * @param {String} obj.eot
                         * @param {int} obj.dis
                         */
                        obj => (
                            {
                                time : obj.t.substr(0, 5),
                                remark : obj.t.substr(5),
                                real_time : typeof obj.dis === 'number',
                                distance : obj.dis === undefined ? null : obj.dis,
                            }
                        )
                    )
                    .filter(obj => obj.time.match(/^[0-9][0-9]:[0-9][0-9]$/) !== null)
                    .map(obj => new Eta(stopRoute, obj.time, obj.distance, obj.remark, obj.real_time))
            );
        }
    };
    const secret = Secret.getSecret(new Date().toISOString().split('.')[0] + 'Z')
    const query = {
        lang : {'en' : 'en', 'zh-hans' : 'sc', 'zh-hant' : 'tc'}[Common.getLanguage()],
        route : stopRoute.variant.route.number,
        bound : stopRoute.variant.route.bound,
        stop_seq : stopRoute.sequence,
        service_type : stopRoute.variant.serviceType,
        vendor_id : Secret.VENDOR_ID,
        apiKey : secret.apiKey,
        ctr : secret.ctr
    };
    const encrypted_query = Secret.getSecret('?' + new URLSearchParams(query).toString(), secret.ctr);
    const retry = /** XMLHttpRequest */ jqXHR => {
        if (jqXHR.readyState === 4 && jqXHR.status === 403) {
            Eta.get(stopRoute, callback);
        }
    }
    if (Eta.MOBILE_API_METHOD === 'POST') {
        $.post(
            {
                url : Common.PROXY_URL + 'https://etav3.kmb.hk/?action=geteta',
                data : JSON.stringify(
                    {
                        d : encrypted_query.apiKey,
                        ctr : encrypted_query.ctr
                    }
                ),
                success : handler,
                error : retry,
                contentType : 'application/json',
            }
        );
    } else {
        $.get(Common.PROXY_URL + 'https://etav3.kmb.hk/?action=geteta', query, handler).fail(retry);
    }
};

