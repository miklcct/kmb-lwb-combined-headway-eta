'use strict';

import Common from "./Common";
import Variant from "./Variant";
import IncompleteStop from "./IncompleteStop";

export default class Stop extends IncompleteStop {
    public readonly routeDirection: string;
    public readonly sequence: number;
    constructor(id : string, name : string, routeDirection : string, sequence : number) {
        super(id);
        localStorage[`${id}_${Common.getLanguage()}`] = name;
        this.routeDirection = routeDirection;
        this.sequence = sequence;
    }

    public get streetId() : string{
        return this.id.split('-')[0];
    }

    public get streetDirection() : string {
        return this.id.split('-')[1];
    }

    public static async get(variant : Variant) : Promise<Stop[]> {
        const json = await Common.callApi(
            {
                action : 'getstops',
                route : variant.route.number,
                bound : String(variant.route.bound),
                serviceType : String(variant.serviceType)
            }
        ) as {
            data : {
                routeStops : {BSICode : string, Direction : string, Seq : string, EName : string, SCName : string, CName : string}[]
            }
        };
        return json.data.routeStops.map(
            item => new Stop(
                item.BSICode
                , item[
                    {
                        'en' : 'EName',
                        'zh-hans' : 'SCName',
                        'zh-hant' : 'CName'
                    }[Common.getLanguage()] as keyof typeof item
                ]
                    .toTitleCase()
                , item.Direction.trim()
                , Number(item.Seq)
            )
        );
    }
}

