import Common from "./Common";

export default class Route {
    public readonly number : string;
    public readonly bound : number;
    public constructor(number : string, bound : number) {
        this.number = number;
        this.bound = bound;
    }

    /**
     * Get a string in the format "Route-Bound"
     * @returns {string}
     */
    public getRouteBound() : string {
        return `${this.number}-${this.bound}`;
    }

    public static compare(a : Route, b : Route) : -1 | 0 | 1 {
        const compare_route_number = (a : string, b : string) => {
            const explode_segments = (route_id : string) => {
                const segments: string[] = [];
                [...route_id].forEach(
                    character => {
                        function is_number(x : string) {
                            return x >= '0' && x <= '9';
                        }
                        if (
                            segments.length === 0
                            || is_number(
                                segments[segments.length - 1]
                                    .charAt(segments[segments.length - 1].length - 1)
                            ) !== is_number(character)
                        ) {
                            segments.push(character);
                        } else {
                            segments[segments.length - 1] += character;
                        }
                    }
                );
                return segments;
            };
            const a_segments : (string|number)[] = explode_segments(a);
            const b_segments : (string|number)[] = explode_segments(b);
            let i = 0;
            while (i < a_segments.length && i < b_segments.length) {
                const is_a_number = !isNaN(Number(a_segments[i]));
                const is_b_number = !isNaN(Number(b_segments[i]));
                if (is_a_number === is_b_number) {
                    if (is_a_number) {
                        a_segments[i] = Number(a_segments[i]);
                        b_segments[i] = Number(b_segments[i]);
                    }
                    if (a_segments[i] < b_segments[i]) {
                        return -1;
                    } else if (b_segments[i] < a_segments[i]) {
                        return 1;
                    }
                } else {
                    return is_a_number > is_b_number ? -1 : 1;
                }
                ++i;
            }
            return i >= a_segments.length ? i >= b_segments.length ? 0 : -1 : 1;
        };

        return a.number === b.number
            ? a.bound > b.bound ? -1 : a.bound < b.bound ? 1 : 0
            : compare_route_number(a.number, b.number);
    }

    public static async getBounds(route : string) : Promise<number[]>{
        const json = await Common.callApi(
            {
                action : 'getroutebound',
                route
            }
        ) as {data : { ROUTE: string, BOUND: number, SERVICE_TYPE: number }[]};
        return json.data.map(
            ({BOUND}) => BOUND
        ).filter((value : number, index : number, array : number[]) => array.indexOf(value) === index);
    }
}

