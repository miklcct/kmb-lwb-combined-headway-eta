import Common from "./Common";
import Route from "./Route";

export default class Variant {
    public readonly route: Route;
    public readonly serviceType: number;
    public readonly origin: string;
    public readonly destination: string;
    public readonly description: string;

    /**
     * Create a route variant
     *
     * @param route The route which the variant belongs to
     * @param serviceType A number identifying the particular variant
     * @param origin
     * @param destination
     * @param description The description of the variant, e.g. "Normal routeing"
     */
    constructor(route : Route, serviceType : number, origin : string, destination : string, description : string) {
        this.route = route;
        this.serviceType = serviceType;
        this.origin = origin;
        this.destination = destination;
        this.description = description;
    }

    public getOriginDestinationString() : string {
        return `${this.origin} → ${this.destination}`;
    }

    /**
     * Get the list of variants from a route
     */
    static async get(route : Route) : Promise<Variant[]>{
        const json = await Common.callApi(
            {
                action : 'getSpecialRoute',
                route : route.number,
                bound : String(route.bound),
            }
        ) as {
            data: {
                CountSpecial : number
                    , routes: {
                    ServiceType : string,
                        Origin_ENG : string, Destination_ENG : string, Desc_ENG : string
                    Origin_CHI : string, Destination_CHI : string, Desc_CHI : string
                }[]
                    , result : boolean
            }
        };
        return json.data.routes.map(
            item => new Variant(
                route
                , Number(item.ServiceType)
                , item[
                    {
                        'en' : 'Origin_ENG',
                        'zh-hans' : 'Origin_CHI',
                        'zh-hant' : 'Origin_CHI'
                    }[Common.getLanguage()] as keyof typeof json.data.routes[0]
                    ]
                    .toTitleCase()
                , item[
                    {
                        'en' : 'Destination_ENG',
                        'zh-hans' : 'Destination_CHI',
                        'zh-hant' : 'Destination_CHI'
                    }[Common.getLanguage()] as keyof typeof json.data.routes[0]
                    ]
                    .toTitleCase()
                , item[
                    {
                        'en' : 'Desc_ENG',
                        'zh-hans' : 'Desc_CHI',
                        'zh-hant' : 'Desc_CHI'
                    }[Common.getLanguage()] as keyof typeof json.data.routes[0]
                    ]
            )
        );
    }
}

