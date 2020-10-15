import Languages from "./Languages";
import $ from "jquery";

export default class Common {
    public static readonly PROXY_URL = 'https://miklcct.com/proxy/';
    public static readonly API_ENDPOINT = 'https://search.kmb.hk/KMBWebSite/Function/FunctionRequest.ashx';

    public static async callApi(query : Record<string, string>) : Promise<Record<string, unknown>> {
        return $.get(Common.API_ENDPOINT, query);
    }

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
    public static getLanguage() : keyof Languages {
        return ($('html').attr('lang') ?? 'en') as keyof Languages;
    }
}

declare global {
    // noinspection JSUnusedGlobalSymbols
    interface String {
        toTitleCase(): string;
    }
}

/**
 * Convert string to title case
 *
 * FIXME: this is English only
 */
String.prototype.toTitleCase = function () {
    return this.toLowerCase().replace(/((^|[^a-z0-9'])+)(.)/g,  (match, p1, p2, p3) => p1 + p3.toUpperCase());
};
