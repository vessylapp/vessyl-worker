import { Hono } from 'hono'
import { exec } from 'child_process'
import newUser from './users/create'
import login from './users/login'

const app = new Hono()

app.route('/create', newUser)
app.route('/login', login)

export default app