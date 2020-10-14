'use strict';

import {Common} from "./Common.js";

export class Route {
    constructor(/** string */ number, /** int */ bound) {
        this.number = number;
        this.bound = bound;
    }
}

/**
 * Get a string in the format "Route-Bound"
 * @returns {string}
 */
Route.prototype.getRouteBound = function () {
    return this.number + '-' + this.bound;
}

Route.compare = function (/** Route */ a, /** Route */ b) {
    function compare_route_number(/** string */ a, /** string */ b) {
        function explode_segments(/** string */ route_id) {
            let segments = [];
            [...route_id].forEach(
                function (/** string */ character) {
                    function is_number(/** string */ x) {
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
        ? a.bound > b.bound ? -1 : a.bound < b.bound ? 1 : 0
        : compare_route_number(a.number, b.number)
};

/**
 *
 * @param {string} route
 * @return Promise<int[]>
 */
Route.getBounds = async function (route) {
    const json = await Common.callApi(
        {
            action : 'getroutebound',
            route : route
        }
    );
    return json.data.map(
        /**
         *
         * @param {string} item.ROUTE
         * @param {string} item.BOUND
         * @param {string} item.SERVICE_TYPE
         */
        item => item.BOUND
    ).filter((value, index, array) => array.indexOf(value) === index)
};