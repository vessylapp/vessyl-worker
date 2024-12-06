import { Hono } from "hono";
import jwt from 'jsonwebtoken';
import MongoService from "../structures/mongodb";
const execAsync = promisify(exec);

const app = new Hono();

app.post('/', async (c) => {
    const data = await c.req.text(); 
    const body = JSON.parse(data);
    const { name, env, volumes, ports, network, repo_name, type, token } = body
    const client = MongoService.getInstance();
    const jwtSecret = await client.findOne('vessyl', 'settings', {jwtSecret: {$exists : true}});
    if (!jwtSecret) {
        return c.text('JWT Secret not found');
    }
    let decoded : any = {};
    try {
        decoded = jwt.verify(token, jwtSecret.jwtSecret);
    } catch (err) {
        return c.text('Invalid token');
    }
    const user = await client.findOne('vessyl', 'users', {username: decoded.username});
    if (!user) {
        return c.text('User not found');
    }
    let buildCommand = `docker run --rm --pull always -v /var/run/docker.sock:/var/run/docker.sock -v /var/run/docker.sock:/var/run/docker.sock -e TYPE=${type} -e REPO_NAME=${repo_name} ghcr.io/vessyl-buildenv:latest`
    console.log(buildCommand);
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