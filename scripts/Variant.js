'use strict';

class Variant {
    constructor(/** Route */ route, /** String */ id, /** int */ sequence, /** String */ description, /** String */ info) {
        this.route = route;
        this.id = id;
        this.sequence = sequence;
        this.description = description;
        this.info = info;
    }
}
Variant.all = {};
Variant.get = function (/** Route */ route) {
    Variant.all = {};
    $variant_list.empty().attr('disabled', 'disabled');
    Common.callApi(
        'getvariantlist.php'
        , {id : route.id}
        , function (/** Array */ data) {
            $variant_list.empty().append($('<option/>'));
            data.forEach(
                function (/** Array */ segments) {
                    const variant = new Variant(route, segments[2], Number(segments[0]), segments[3], segments[4]);
                    Variant.all[variant.id] = variant;
                }
            );
            Object.values(Variant.all)
                .sort(
                    function (/** Variant */ a, /** Variant */ b) {
                        return a.sequence - b.sequence;
                    }
                )
                .forEach(
                    function (/** Variant */ variant) {
                        $variant_list.append(
                            $('<option/>').attr('value', variant.id).text(variant.sequence + ' ' + variant.description)
                        );
                    }
                );
            $variant_list.removeAttr('disabled');
        }
    )
};

