'use strict';

import Common from "./Common";

export default class IncompleteStop {
    public readonly id: string;
    public constructor(id : string) {
        this.id = id;
    }

    get name() : string {
        return localStorage[`${this.id}_${Common.getLanguage()}`] ?? null;
    }
}

