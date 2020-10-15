import Common from "./Common";
import Secret from "./Secret";
import StopRoute from "./StopRoute";
import $ from "jquery";

export default class Eta {
    public static readonly MAX_RETRY_COUNT = 5;
    public static MOBILE_API_METHOD = 'GET';

    public readonly stopRoute: StopRoute;
    public readonly time: Date;
    public readonly distance: number | null;
    public readonly remark: string;
    public readonly realTime: boolean;

    /**
     * Create an ETA entry
     *
     * @param stopRoute The stop-route where the ETA was queried
     * @param time The ETA time
     * @param distance The distance (in metres) of the bus from the stop
     * @param remark The remark of the ETA (e.g. KMB/NWFB, Scheduled)
     * @param realTime If the ETA is real-time
     */
    public constructor(stopRoute : StopRoute, time : Date, distance : number | null, remark : string, realTime : boolean) {
        this.stopRoute = stopRoute;
        this.time = time;
        this.distance = distance;
        this.remark = remark;
        this.realTime = realTime;
    }

    /**
     * Compare two ETA entries by time
     */
    public static compare(a : Eta, b : Eta) : number {
        return (a.time === null ? Infinity : a.time.getTime()) - (b.time === null ? Infinity : b.time.getTime());
    }

    /**
     * Get a list of ETAs by a route at stop
     */
    static async get(stopRoute : StopRoute, retry_count = 0) : Promise<Eta[]> {
        const secret = Secret.getSecret(`${new Date().toISOString().split('.')[0]}Z`);
        const languages = {'en': 'en', 'zh-hans': 'sc', 'zh-hant': 'tc'};
        const query = {
            lang: languages[Common.getLanguage()],
            route: stopRoute.variant.route.number,
            bound: String(stopRoute.variant.route.bound),
            stop_seq: String(stopRoute.sequence),
            service_type: String(stopRoute.variant.serviceType),
            vendor_id: Secret.VENDOR_ID,
            apiKey: secret.apiKey,
            ctr: String(secret.ctr)
        };
        const encrypted_query = Secret.getSecret(`?${new URLSearchParams(query).toString()}`, secret.ctr);
        return (
            Eta.MOBILE_API_METHOD === 'POST'
                ? $.post(
                {
                    url: `${Common.PROXY_URL}https://etav3.kmb.hk/?action=geteta`,
                    data: JSON.stringify(
                        {
                            d: encrypted_query.apiKey,
                            ctr: encrypted_query.ctr
                        }
                    ),
                    contentType: 'application/json',
                }
            )
                : $.get(`${Common.PROXY_URL}https://etav3.kmb.hk/?action=geteta`, query)
        ).then(
            (json: [{ eta: {t : string, eot : string, dis? : number}[]}?]) =>
                (json[0]?.eta ?? [])
                    .map(
                        obj => (
                            {
                                time: obj.t.substr(0, 5),
                                remark: obj.t.substr(5),
                                real_time: typeof obj.dis === 'number',
                                distance: obj.dis === undefined ? null : obj.dis,
                            }
                        )
                    )
                    .filter(
                        obj =>
                            obj.time.match(/^[0-9][0-9]:[0-9][0-9]$/) !== null)
                    .map(
                        obj => {
                            const time = new Date();
                            time.setHours(Number(obj.time.split(':')[0]), Number(obj.time.split(':')[1]), 0);
                            if (time.getTime() - Date.now() < -60 * 60 * 1000 * 2) {
                                // the time is less than 2 hours past - assume midnight rollover
                                time.setDate(time.getDate() + 1);
                            }
                            if (time.getTime() - Date.now() > 60 * 60 * 1000 * 6) {
                                // the time is more than 6 hours in the future - assume midnight rollover
                                time.setDate(time.getDate() - 1);
                            }
                            return new Eta(stopRoute, time, obj.distance, obj.remark, obj.real_time);
                        }
                    )
            , reason => {
                if (retry_count + 1 < Eta.MAX_RETRY_COUNT) {
                    return Eta.get(stopRoute, retry_count + 1);
                } else {
                    throw reason;
                }
            }
        );
    }
}
