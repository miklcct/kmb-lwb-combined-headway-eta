'use strict';
export class Secret {
    constructor(/** string */ apiKey, /** int */ ctr) {
        this.apiKey = apiKey;
        this.ctr = ctr;
    }

    /**
     *
     * @param {string} string
     * @param {Number} [counter]
     * @returns {Secret}
     */
    static getSecret(string, counter) {
        if (counter === undefined) {
            counter = Math.floor(Math.random() * (1 << 30));
        }
        const hex_string = counter.toString(16);
        const verifier = '0'.repeat(32 - hex_string.length) + hex_string;
        const cipher = new aesjs.ModeOfOperation.ctr(Secret.KEY, aesjs.utils.hex.toBytes(verifier));
        return new Secret(aesjs.utils.hex.fromBytes(cipher.encrypt(aesjs.utils.utf8.toBytes(string))).toUpperCase(), counter);
    }

}

Secret.KEY = aesjs.utils.hex.toBytes('801C26C9AFB352FA4DF8C009BAB0FA72');
Secret.VENDOR_ID = '';
for (let i = 0; i < 16; ++i) {
    Secret.VENDOR_ID += Math.floor(Math.random() * 16).toString(16);
}