import { Hono } from 'hono'
import getProxy from './admin/getProxy'
import saveProxy from './admin/saveProxy'

const app = new Hono()

app.route('/getproxy', getProxy);
app.route('/saveproxy', saveProxy);

export default app;