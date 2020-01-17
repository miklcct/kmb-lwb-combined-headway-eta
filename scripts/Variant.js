'use strict';

class Variant {
    constructor(/** Route */ route, /** string */ id, /** int */ sequence, /** string */ description, /** ?string */ info) {
        this.route = route;
        this.id = id;
        this.sequence = sequence;
        this.description = description;
        this.info = info;
    }
}
Variant.all = {};
Variant.get = function (/** Route */ route, /** Function */ callback) {
    Common.callApi(
        'getvariantlist.php'
        , {id : route.id}
        , function (/** Array */ data) {
            const variants = {};
            data.forEach(
                function (/** Array */ segments) {
                    const variant = new Variant(route, segments[2], Number(segments[0]), segments[3], segments[4]);
                    variants[variant.id] = variant;
                }
            );
            callback(variants);
        }
    )
};

