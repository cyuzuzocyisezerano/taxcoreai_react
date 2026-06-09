import { createApp } from './app.js'
import { config } from './config.js'
import { loadDb } from './data/store.js'

const app = createApp()

console.log('Process cwd:', process.cwd())

await loadDb()

app.listen(config.port, () => {
  console.log(`TaxCoreAI API running at http://localhost:${config.port}`)
  console.log(`Health check: http://localhost:${config.port}/health`)
})
