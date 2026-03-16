import {exec} from "child_process";
import { PROXY_CONTAINER_NAME } from "../src/lib/constants";

class Caddy {
    async reloadCaddy(): Promise<void> {
        return new Promise((resolve, reject) => {
            exec(`docker restart ${PROXY_CONTAINER_NAME}`, (error, stdout, stderr) => {
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
