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
import { checkForUpdates } from '../structures/checkforupdates'

import dotenv from 'dotenv'
dotenv.config()

import MongoService from '../structures/mongodb'
import caddyedit from "../structures/caddyedit";

async function startApp() {
  const Caddy = caddyedit.getInstance();
  const client = MongoService.getInstance();
  await client.connect(process.env.MONGO_URI);
  if(!await client.dbExists('vessyl')) {
    await client.createDatabase('vessyl');    
  }
  if(!await client.collectionExists('vessyl', 'resources')) {
    await client.createCollection('vessyl', 'resources');
  }
  if(!await client.collectionExists('vessyl', 'users')) {
    await client.createCollection('vessyl', 'users');
  }
  if(!await client.collectionExists('vessyl', 'settings')) {
    await client.createCollection('vessyl', 'settings');
    await client.insert('vessyl', 'settings', {setup: false});
    await client.insert('vessyl', 'settings', {registration: true});

    // This updates the vessyl.app counter :) You don't have to use this.
    fetch("https://vessyl.app/api/installs", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });
  }
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
