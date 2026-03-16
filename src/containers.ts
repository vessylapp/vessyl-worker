import { Hono } from 'hono'
import logs from './actions/logs'
import start from './actions/start'
import stats from './actions/stats'
import stop from './actions/stop'
import remove from './actions/remove'
import newContainer from './actions/new'
import deploy from './deploy'
import infoC from './actions/info'
import { requireUserFromToken } from './lib/auth'
import { execDocker, parseDockerList } from './lib/docker'
import { defineRoute, readJsonBody } from './lib/http'
import { PROXY_CONTAINER_NAME } from './lib/constants'

const app = new Hono()

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{ token?: string }>(c);
    await requireUserFromToken(body.token);

    const { stdout } = await execDocker(['ps', '-a', '--format', '{{json .}}']);
    const containers = parseDockerList(stdout)
        .filter((container) => container.Networks !== 'vessyl-bridge')
        .filter((container) => !container.Names.includes(PROXY_CONTAINER_NAME))
        .map((container) => ({
            id: container.ID,
            name: container.Names,
            image: container.Image,
            running: container.Status.includes('Up'),
        }));

    return c.json(containers);
}));

app.route('/new', newContainer)
app.route('/deploy', deploy)
app.route('/:id/start', start)
app.route('/:id/stop', stop)
app.route('/:id/stats', stats)
app.route('/:id/logs', logs)
app.route('/:id/remove', remove)
app.route('/:id/info', infoC)

export default app
