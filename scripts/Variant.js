'use strict';

class Variant {
    /**
     * Create a route variant
     *
     * @param {!Route} route The route which the variant belongs to
     * @param {string} id The variant ID (RDV), e.g. 788-MAF-1
     * @param {int} sequence The number of the variant
     * @param {string} description The description of the variant, e.g. "Normal routeing"
     * @param {?string} info The internal code to be used to get stop list
     */
    constructor(route, id, sequence, description, info) {
        this.route = route;
        this.id = id;
        this.sequence = sequence;
        this.description = description;
        this.info = info;
    }
}

/**
 * Get the list of variants from a route
 *
 * @param {Route} route
 * @param {function(!Object<string, !Variant>)} callback
 */
Variant.get = function (route, callback) {
    Common.callApi(
        'getvariantlist.php'
        , {id : route.id}
        , function (data) {
            const variants = {};
            data.forEach(
                function (segments) {
                    const variant = new Variant(route, segments[2], Number(segments[0]), segments[3], segments[4]);
                    variants[variant.id] = variant;
                }
            );
            callback(variants);
        }
    )
};

