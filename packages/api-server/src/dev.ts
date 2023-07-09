import { loadFastify } from './start.js'
import { promises as fs } from 'node:fs'

const app = await loadFastify()
await fs.writeFile('docs/api.yaml', app.swagger({ yaml: true }))

const port: number = parseInt(process.env.API_SERVER_PORT ?? '8000')
await app.listen({ port, host: '0.0.0.0' })
