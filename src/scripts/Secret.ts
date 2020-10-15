import aesjs from "aes-js";

export default class Secret {
    public readonly apiKey : string;
    public readonly ctr : number;

    constructor(apiKey : string, ctr : number) {
        this.apiKey = apiKey;
        this.ctr = ctr;
    }

    public static getSecret(string : string, counter = Math.floor(Math.random() * (1 << 30))) : Secret {
        const hex_string = counter.toString(16);
        const verifier = '0'.repeat(32 - hex_string.length) + hex_string;
        const cipher = new aesjs.ModeOfOperation.ctr(Secret.KEY, new aesjs.Counter(aesjs.utils.hex.toBytes(verifier)));
        return new Secret(aesjs.utils.hex.fromBytes(cipher.encrypt(aesjs.utils.utf8.toBytes(string))).toUpperCase(), counter);
    }

    public static readonly VENDOR_ID = (() => {
        let vendor_id = '';
        for (let i = 0; i < 16; ++i) {
            vendor_id += Math.floor(Math.random() * 16).toString(16);
        }
        return vendor_id;
    })();
    private static readonly KEY = aesjs.utils.hex.toBytes('801C26C9AFB352FA4DF8C009BAB0FA72');
}

