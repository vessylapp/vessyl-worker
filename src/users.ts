import { Hono } from 'hono'
import newUser from './users/create'
import login from './users/login'
import infoU from './users/info'
import password from './users/password'

const app = new Hono()

app.route('/create', newUser)
app.route('/login', login)
app.route('/info', infoU)
app.route('/password', password)

export default app
