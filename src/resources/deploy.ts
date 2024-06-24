import {Hono} from 'hono'
import MongoService from '../../structures/mongodb'
import jwt from 'jsonwebtoken'
import {exec, spawn} from "child_process";
import { promisify } from 'util';
import { streamText } from "hono/streaming";
const execAsync = promisify(exec);

const app = new Hono()

app.post('/', async (c) => {
    const data = await c.req.text(); 
    const body = JSON.parse(data);
    const {token, name} = body;
    const client = MongoService.getInstance();
    const jwtSecret = await client.findOne('vessyl', 'settings', {jwtSecret: {$exists : true}});
    if (!jwtSecret) {
        return c.json({error: 'JWT Secret not found'});
    }
    let decoded : any = {};
    try {
        decoded = jwt.verify(token, jwtSecret.jwtSecret);
    } catch (err) {
        return c.json({error: 'Invalid token'});
    }
    const user = await client.findOne('vessyl', 'users', {username: decoded.username});
    if (!user) {
        return c.json({error: 'User not found'});
    }
    const resource = await client.findOne('vessyl', 'resources', {name, owner: decoded.username});
    if (!resource) {
        return c.json({error: 'Resource doesnt exist'})
    }
    const env = resource.env;
    const volumes = resource.volumes;
    const ports = resource.ports;
    const network = resource.network;
    const repo_name = resource.git_url;
    const cleanName = repo_name.replace(/[^a-zA-Z0-9]/g, '');
    const type = resource.type.toLowerCase();
    const userPat = user.githubPat;
    let patToAdd = ``;
    if(userPat) {
        patToAdd = ` -e GITHUB_PAT=${userPat} -e GITHUB_USERNAME=${user.githubJson.username} `;
    }
    let buildCommand = `docker run --rm --pull always --name DEPLOY-${cleanName} -v /var/run/docker.sock:/var/run/docker.sock -v /var/run/docker.sock:/var/run/docker.sock -e TYPE=${type} -e REPO_NAME=${repo_name}${patToAdd}ghcr.io/vessylapp/vessyl-buildenv:latest`
    console.log(buildCommand);
    return streamText(c, (stream) => {
        return new Promise((resolve, reject) => {
            const buildProcess = spawn(buildCommand, { shell: true });
            buildProcess.stdout.on('data', (data) => {
                console.log(data.toString());
                stream.writeln(data.toString());
            });
            buildProcess.stderr.on('data', (data) => {
                console.log(data.toString());
                stream.writeln(data.toString());
            });
            buildProcess.on('close', async (code) => {
                if (code !== 0) {
                    return reject(new Error(`build process exited with code ${code}`));
                }
                let image = repo_name;
                let command = `docker run --restart always -d --name ${name}`
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
                    await client.update('vessyl', 'resources', {name, owner: decoded.username}, {$set: {container: {container_id: name}}});
                    resolve();
                }, 1000);
            });
        }
    )});
});

export default app
