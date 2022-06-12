import { startServer } from './index'

startServer().then(() => console.log('Server started')).catch((err) => { throw err })
