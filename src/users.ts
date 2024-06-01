import { Hono } from 'hono'
import { exec } from 'child_process'
import newUser from './users/create'

const app = new Hono()

app.route('/create', newUser)

export default app