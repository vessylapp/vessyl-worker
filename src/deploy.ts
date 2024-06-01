import { Hono } from "hono";
import {exec, spawn} from "child_process";
import { promisify } from 'util';
import { streamText } from "hono/streaming";
const execAsync = promisify(exec);

const app = new Hono();

app.post('/', async (c) => {
    const data = await c.req.text(); 
    const body = JSON.parse(data);
    const { name, env, volumes, ports, network, repo_name, type } = body
    let buildCommand = `docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v /var/run/docker.sock:/var/run/docker.sock -e TYPE=${type} -e REPO_NAME=${repo_name} vessyl-buildenv:0.0.18`
    return streamText(c, (stream) => {
        return new Promise((resolve, reject) => {
            const buildProcess = spawn(buildCommand, { shell: true });
            buildProcess.stdout.on('data', (data) => {
                stream.writeln(data.toString());
            });
            buildProcess.stderr.on('data', (data) => {
                stream.writeln(data.toString());
            });
            buildProcess.on('close', async (code) => {
                if (code !== 0) {
                    return reject(new Error(`build process exited with code ${code}`));
                }
                let image = repo_name;
                let command = `docker run -d --name ${name}`
                if (env) {
                    env.forEach((envVar) => {
                        command += ` -e ${envVar}`
                    })
                }
                if (volumes) {
                    volumes.forEach((volume) => {
                        command += ` -v ${volume}`
                    })
                }
                if (ports) {
                    ports.forEach((port) => {
                        command += ` -p ${port}`
                    })
                }
                if (network) {
                    command += ` --network ${network}`
                }
                command += ` ${image}`
                setTimeout(async () => {
                    const { stdout, stderr } = await execAsync(command);
                    stream.writeln(stdout);
                    stream.writeln("Container created with name " + name);
                    resolve();
                }, 1000);
            });
        }
    )
})});
    
export default app;