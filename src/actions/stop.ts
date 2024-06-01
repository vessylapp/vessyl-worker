import { Hono } from "hono";
import {exec} from "child_process";

const app = new Hono();

app.get('/', (c) => {
    return new Promise((resolve, reject) => {
      exec(`docker stop ${c.req.param('id')}`, (error, stdout, stderr) => {
        if (error || stderr.includes('Error') === true) {
            return resolve(c.text(`${stderr}`))
        }
        resolve(c.text(`Container ${c.req.param('id')} stopped`))
      })
    })
});

export default app;