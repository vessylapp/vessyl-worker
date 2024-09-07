import { Hono } from 'hono'
import getProxy from './admin/getProxy'
import saveProxy from './admin/saveProxy'
import restartProxy from "./admin/restartProxy";

const app = new Hono()

app.route('/getproxy', getProxy);
app.route('/saveproxy', saveProxy);
app.route('/restartproxy', restartProxy);

export default app;