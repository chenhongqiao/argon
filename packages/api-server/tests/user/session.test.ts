import { loadTestingApp, type FastifyTypeBox } from '../util/app.js'
import tap from 'tap'
import { createUser } from '../util/user.js'

tap.before(async () => {
  tap.context.app = await loadTestingApp()
})

tap.teardown(async () => {
  await tap.context.app.close()
})

/* User Creation
 * - Creates dummy user 'jd77'
 */
tap.test(
  'Session Login',
  async t => {
    const app: FastifyTypeBox = tap.context.app

    // Create 'dummyA'
    await createUser(t, app, 'dummyA', 'dummyA1234')

    // Login
    const response = await app.inject()
      .post('/v1/sessions')
      .body({
        usernameOrEmail: 'dummyA',
        password: 'dummyA1234'
      })

    t.equal(response.statusCode, 200)

    // Check for 'session_token'
    t.equal(response.cookies[0].name, 'session_token', 'sent \'session_token\'')
  })
