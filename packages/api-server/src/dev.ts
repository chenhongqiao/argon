import { startAPIServer } from './start.js'
// import { promises as fs } from 'node:fs'

// const app = await loadFastify()
// await fs.writeFile('docs/api.yaml', app.swagger({ yaml: true }))

await startAPIServer()
