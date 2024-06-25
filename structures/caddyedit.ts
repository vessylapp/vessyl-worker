import * as fs from "node:fs";
import * as child_process from "node:child_process";
import * as path from "node:path";
import {exec} from "child_process";

class Caddy {
    public caddyFile: string = '/etc/caddy/Caddyfile';

    constructor() {
        console.log('Caddy created');
    }

    async getGateway(): Promise<string> {
        return new Promise((resolve, reject) => {
            exec('docker inspect -f "{{range .NetworkSettings.Networks}}{{.Gateway}}{{end}}" vp', (error, stdout, stderr) => {
                if (error || stderr.includes('Error') === true) {
                    return reject(new Error(`${stderr}`));
                }
                resolve(stdout.trim());
            });
        });
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

    async add(domain: string, port: string): Promise<void> {
        console.log(`Adding ${domain} to caddy`);
        // Add domain to Caddyfile
        const caddyFile = await fs.promises.readFile(this.caddyFile, 'utf-8');
        // if domain already exists, call remove() and then add()
        if (caddyFile.includes(domain)) {
            await this.remove(domain);
        }
        const lines = caddyFile.split('\n');
        lines.push(`${domain} {`);
        const gateway = await this.getGateway();
        lines.push(`  reverse_proxy ${gateway}:${port}`);
        lines.push('}');
        await fs.promises.writeFile(this.caddyFile, lines.join('\n'));
        // Reload Caddy
        await this.reloadCaddy();
    }

    async remove(domain: string): Promise<void> {
        console.log(`Removing ${domain} from caddy`);
        // Remove domain from Caddyfile
        const caddyFile = await fs.promises.readFile(this.caddyFile, 'utf-8');
        const lines = caddyFile.split('\n');
        let start = -1;
        let end = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(domain)) {
                start = i;
                break;
            }
        }
        if (start === -1) {
            return;
        }
        for (let i = start; i < lines.length; i++) {
            if (lines[i].includes('}')) {
                end = i;
                break;
            }
        }
        if (end === -1) {
            return;
        }
        lines.splice(start, end - start + 1);
        await fs.promises.writeFile(this.caddyFile, lines.join('\n'));
        // Reload Caddy
        await this.reloadCaddy();
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