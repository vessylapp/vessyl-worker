import { Hono } from 'hono'
import { exec } from 'child_process'
import logs from './actions/logs'
import start from './actions/start'
import stats from './actions/stats'
import stop from './actions/stop'
import remove from './actions/remove'
import newContainer from './actions/new'
import deploy from './deploy'

const app = new Hono()

app.get('/', (c) => {
    return new Promise((resolve, reject) => {
      exec('docker ps -a --format \'{{json .}}\'', (error, stdout, stderr) => {
        if (error || stderr.includes('Error') === true) {
            return resolve(c.text(`${stderr}`))
        }
        // Split the output by newline and remove any empty lines
        const lines = stdout.split('\n').filter(line => line)
        // Parse each line as JSON
        const json = lines.map(line => JSON.parse(line))
        const jsonToSend: any = [];
        json.forEach((container) => {
          if (container.Networks === 'vessyl-bridge') {
            // This makes sure that we don't show the container that runs the API or the container that runs the UI
            return
          }
          jsonToSend.push({
            id: container.ID,
            name: container.Names,
            image: container.Image,
            running: container.Status.includes('Up'),
          })
        })
        resolve(c.json(jsonToSend))
      })
    })
})

app.route('/new', newContainer)
app.route('/deploy', deploy)
app.route('/:id/start', start)
app.route('/:id/stop', stop)
app.route('/:id/stats', stats)
app.route('/:id/logs', logs)
app.route('/:id/remove', remove)

export default app