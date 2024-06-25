import * as fs from "node:fs";
import * as child_process from "node:child_process";
import * as path from "node:path";
import {exec} from "child_process";

class Caddy {
    public caddyFile: string = '/etc/caddy/Caddyfile';

    constructor() {
    }

    async reloadCaddy(): Promise<void> {
        return new Promise((resolve, reject) => {
            exec('docker restart vp', (error, stdout, stderr) => {
                if (error || stderr.includes('Error') === true) {
                    return reject(new Error(`${stderr}`));
                }
                resolve();
            });
        });
    }
}

class CaddyEdit {
    private static instance: Caddy | null = null;

    constructor() {
        throw new Error('Use CaddyEdit.getInstance()');
    }

    static getInstance(): Caddy {
        if (!CaddyEdit.instance) {
            CaddyEdit.instance = new Caddy();
        }
        return CaddyEdit.instance;
    }
}

export default CaddyEdit;