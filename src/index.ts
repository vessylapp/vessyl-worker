import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import containers from './containers'
import users from './users'
import status from './status'
import resources from './resources'
import update from './update'
import github from "./github";
import admin from "./admin";
import ports from "./ports";
import { bootstrapApp } from './lib/bootstrap';

async function startApp() {
  await bootstrapApp();

  const app = new Hono()
  app.use('/*', cors())

  app.route('/containers', containers)
  app.route('/users', users);
  app.route('/status', status);
  app.route('/resources', resources)
  app.route('/update', update)
  app.route('/github', github);
  app.route('/admin', admin);
  app.route('/ports', ports);

  const port = 8000
  console.log(`Server is running on port ${port}`)

  serve({
    fetch: app.fetch,
    port
  })
}

startApp()
