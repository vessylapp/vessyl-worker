import { Hono } from 'hono'
import newResource from './resources/new'
import resourceSettings from './resources/settings'
import resourceInfo from './resources/info'
import deployResource from './resources/deploy'
import deleteResource from './resources/delete'
import { requireUserFromToken } from './lib/auth'
import { COLLECTIONS, DB_NAME } from './lib/constants'
import { defineRoute, readJsonBody } from './lib/http'
import { getContainerRunningState } from './lib/resources'

const app = new Hono()

app.post('/', defineRoute(async (c) => {
    const body = await readJsonBody<{ token?: string }>(c);
    const { client, username } = await requireUserFromToken(body.token);

    const resources = await client.find(DB_NAME, COLLECTIONS.resources, { owner: username }, {});
    const hydratedResources = await Promise.all(
        resources.map(async (resource) => ({
            ...resource,
            container: {
                ...resource.container,
                running: await getContainerRunningState(resource.container?.container_id),
            },
        }))
    );

    return c.json(hydratedResources);
}));

app.route('/new', newResource)
app.route('/settings', resourceSettings)
app.route('/info', resourceInfo)
app.route('/deploy', deployResource)
app.route('/delete', deleteResource)

export default app
