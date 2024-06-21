import { Hono } from 'hono'
import store from './github/store'

const app = new Hono()

app.route('/store', store)

export default app;