import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import containers from './containers'
import users from './users'

import dotenv from 'dotenv'
dotenv.config()

import MongoService from '../structures/mongodb'

async function startApp() {
  const client = MongoService.getInstance();  
  await client.connect(process.env.MONGO_URI);
  if(!await client.dbExists('vessyl')) {
    await client.createDatabase('vessyl');    
  }
  if(!await client.collectionExists('vessyl', 'containers')) {
    await client.createCollection('vessyl', 'containers');
  }
  if(!await client.collectionExists('vessyl', 'users')) {
    await client.createCollection('vessyl', 'users');
  }
  if(!await client.collectionExists('vessyl', 'settings')) {
    await client.createCollection('vessyl', 'settings');
    await client.insert('vessyl', 'settings', {setup: false});
    await client.insert('vessyl', 'settings', {registration: true});
  }
  const app = new Hono()
  app.use('/*', cors())

  app.route('/containers', containers)
  app.route('/users', users);

  const port = 8000
  console.log(`Server is running on port ${port}`)

  serve({
    fetch: app.fetch,
    port
  })
}

startApp()
