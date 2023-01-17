import Sentry = require('@sentry/node')
import { version } from '../../package.json'

Sentry.init({
  dsn: 'https://7e6e404e57024a01819d0fb4cb215538@o1044666.ingest.sentry.io/6554031',
  environment: process.env.NODE_ENV,
  release: version
})

export { Sentry }
