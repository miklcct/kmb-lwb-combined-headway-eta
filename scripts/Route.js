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