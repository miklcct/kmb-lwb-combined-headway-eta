import $ from "jquery"
import {Language} from "js-kmb-api";

export default class Common {
    /**
     * Get the stop ID in the query string
     */
    public static getQueryStopId() : string | null {
        return (new URLSearchParams(window.location.search)).get('stop');
    }

    /**
     * Get the selected route IDs and stop positions in the query string
     */
    public static getQuerySelections() : [string, number|null][]{
        return (new URLSearchParams(window.location.search)).getAll('selections').map(
            item => {
                const segments = item.split(':');
                return [segments[0], segments.length >= 2 ? Number(segments[1]) : null];
            }
        );
    }

    /**
     * Get if "one departure" mode is selected
     */
    public static getQueryOneDeparture() : boolean {
        return Boolean((new URLSearchParams(window.location.search)).get('one_departure'));
    }

    /**
     * Get the language used in the document
     */
    public static getLanguage() : Language {
        return ($('html').attr('lang') ?? 'en') as Language;
    }
}