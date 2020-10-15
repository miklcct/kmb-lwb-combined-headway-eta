'use strict';

import Common from "./Common";
import Stop from "./Stop";
import Variant from "./Variant";
import Route from "./Route";
import IncompleteStop from "./IncompleteStop";

type StopRouteCacheType = {
    stop: { id: string, name: string, direction: string, sequence: number },
    variant: {
        route: { number: string, bound: number },
        serviceType: number,
        origin: string,
        destination: string,
        description: string,
    },
    sequence: number
}[];

export default class StopRoute {
    public readonly stop : Stop;
    public readonly variant : Variant;
    public readonly sequence : number;
    public constructor(stop: Stop, variant: Variant, sequence: number) {
        this.stop = stop;
        this.variant = variant;
        this.sequence = sequence;
    }

    /**
     * Get the list of route variants serving a particular stop
     * @param stop
     * @param update_count Specify this to update the progress of how many routes are remaining
     */
    static async get(stop : IncompleteStop, update_count? : (remaining: number) => void) : Promise<Record<string, StopRoute[]>>{
        const cached = sessionStorage.getItem(`${stop.id}_${Common.getLanguage()}`);
        if (cached !== null) {
            const result = JSON.parse(cached);
            (Object.entries(result) as [string, StopRouteCacheType][]).forEach(
                ([key, value]) => {
                    result[key] = value.map(
                        item => new StopRoute(
                            new Stop(item.stop.id, item.stop.name, item.stop.direction, item.stop.sequence)
                            , new Variant(
                                new Route(item.variant.route.number, item.variant.route.bound)
                                , item.variant.serviceType
                                , item.variant.origin
                                , item.variant.destination
                                , item.variant.description
                            )
                            , item.sequence
                        )
                    );
                }
            );
            return result;
        } else {
            const json = await Common.callApi(
                {
                    action : 'getRoutesInStop',
                    bsiCode : stop.id
                }
            ) as {data : string[]};
            const results : Record<string, StopRoute[]> = {};
            let remaining_routes = json.data.length;
            if (update_count !== undefined) {
                update_count(remaining_routes);
            }
            await Promise.all(
                json.data.map(
                    async item => {
                        const route = item.trim();
                        // loop through each route and bound
                        // let remaining_bounds = data.length;
                        await Promise.all(
                            (await Route.getBounds(route)).map(
                                async bound =>
                                    await Promise.all(
                                        (await Variant.get(new Route(route, bound))).map(
                                            async variant =>
                                                (await Stop.get(variant)).forEach(
                                                    inner_stop => {
                                                        if (
                                                            inner_stop.id === stop.id || stop instanceof Stop
                                                                // some poles in the same bus terminus are missing words "Bus Terminus"
                                                                && (inner_stop.streetDirection === 'T' || inner_stop.name === stop.name)
                                                                && inner_stop.streetId === stop.streetId
                                                                && inner_stop.streetDirection === stop.streetDirection
                                                        ) {
                                                            // allow duplicate entries for the same variant but disallow multiple variants
                                                            if (
                                                                !Object.prototype.hasOwnProperty.call(results, variant.route.getRouteBound())
                                                                || variant.serviceType < results[variant.route.getRouteBound()][0].variant.serviceType
                                                            ) {
                                                                results[variant.route.getRouteBound()] = [];
                                                            }
                                                            const array = results[variant.route.getRouteBound()];
                                                            if (array.length === 0 || variant.serviceType === array[0].variant.serviceType) {
                                                                array.push(new StopRoute(inner_stop, variant, inner_stop.sequence));
                                                            }
                                                        }
                                                    }
                                                )
                                        )
                                    )
                            )
                        );
                        --remaining_routes;
                        if (update_count !== undefined) {
                            update_count(remaining_routes);
                        }
                    }
                )
            );
            if (!(stop instanceof Stop)) {
                return StopRoute.get(Object.values(results)[0][0].stop, update_count);
            } else {
                sessionStorage.setItem(`${stop.id}_${Common.getLanguage()}`, JSON.stringify(results));
                return results;
            }
        }
    }


}

