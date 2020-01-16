'use strict';

class Eta {
    constructor(/** String */ route_id, /** Date */ time, /** String */ destination, /** int */ distance, /** String */ description, /** String */ remark) {
        this.route_id = route_id;
        this.time = time;
        this.distance = distance;
        this.destination = destination;
        this.description = description;
        this.remark = remark;
    }
}
Eta.all = [];
Eta.compare = function (/** Eta */ a, /** Eta */ b) {
    return (a.time === null ? Infinity : a.time.getTime()) - (b.time === null ? Infinity : b.time.getTime());
};

Eta.get = function (/** StopRoute */ stopRoute) {
    ++Eta.get.remaining;
    Common.callApi(
        'getnextbus2.php'
        , {
            service_no : stopRoute.variant.route.number,
            stopseq : stopRoute.sequence,
            stopid : stopRoute.stop.id,
            rdv : stopRoute.variant.id,
            bound : stopRoute.variant.route.direction
        }
        , function (/** Array */ data) {
            if (!data.length || !data[0].length || data[0][0] === 'HTML') {
                return;
            }
            console.log(data);
            data.forEach(
                function (/** Array */ segments) {
                    Eta.all.push(new Eta(segments[1], new Date(segments[19].split('|')[0]), segments[2], Number(segments[13]), segments[17].split('|')[0], segments[18].split('|')[0]));
                }
            );
            --Eta.get.remaining;
            if (Eta.get.remaining === 0) {
                Eta.all.sort(Eta.compare);
                $eta_body.empty()
                    .append(
                        Eta.all.slice(0, 3).map(
                            function (/** Eta */ eta) {
                                return $('<tr/>')
                                    .append($('<td/>').text(eta.time === null ? '' : eta.time.hhmmss()))
                                    .append($('<td/>').text(eta.route_id))
                                    .append($('<td/>').text(eta.destination))
                                    .append($('<td/>').text(eta.description))
                                    .append($('<td/>').text(eta.remark));
                            }
                        )
                    );
                $eta_loading.css('display', 'none');
                $eta_last_updated.text((new Date).hhmmss());
            }
        }
    );
};
Eta.get.remaining = 0;

