'use strict';

class Route {
    constructor(/** String */ company, /** String */ id, /** String */ number, /** String */ origin, /** String */ destination, /** String */ direction, /** int */ number_of_ways) {
        this.company = company;
        this.id = id;
        this.number = number;
        this.origin = origin;
        this.destination = destination;
        this.direction = direction;
        this.number_of_ways = number_of_ways;
    }
}

Route.prototype.getDescription = function () {
    return this.number + ' ' + this.origin + (this.number_of_ways === 0 ? ' ↺ ' : ' → ') + this.destination;
};

Route.compare = function (/** Route */ a, /** Route */ b) {
    function compare_route_number(/** String */ a, /** String */ b) {
        function explode_segments(/** String */ route_id) {
            let segments = [];
            [...route_id].forEach(
                function (/** String */ character) {
                    function is_number(/** String */ x) {
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
                        segments[segments.length - 1] = segments[segments.length - 1] + character;
                    }
                }
            );
            return segments;
        }
        const a_segments = explode_segments(a);
        const b_segments = explode_segments(b);
        let i = 0;
        while (i < a_segments.length && i < b_segments.length) {
            const is_a_number = !isNaN(a_segments[i]);
            const is_b_number = !isNaN(b_segments[i]);
            if (is_a_number === is_b_number) {
                if (is_a_number) {
                    a_segments[i] = +a_segments[i];
                    b_segments[i] = +b_segments[i];
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
    }

    return a.number === b.number
        ? a.direction > b.direction ? -1 : a.direction < b.direction ? 1 : 0
        : compare_route_number(a.number, b.number)
};

Route.get = function (/** Function */ callback) {
    Common.callApi(
        'getroutelist2.php'
        , {}
        , function (/** Array */ data) {
            const routes = {};
            data.forEach(
                function (/** Array */ segments) {
                    const route = new Route(segments[0], segments[7], segments[1], segments[4], segments[5], segments[9], Number(segments[3]));
                    routes[route.id] = route;
                }
            );
            callback(routes);
        }
    );
};