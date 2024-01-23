import { type UserPublicProfile } from '@argoncs/types'

import { loadTestingApp, type FastifyTypeBox } from '../util/app.js'

import tap from 'tap'

tap.before(async () => {
  tap.context.app = await loadTestingApp()
})

tap.teardown(async () => {
  await tap.context.app.close()
})

/* Heartbeat Test
 */
tap.test('Heartbeat', async t => {
  const app: FastifyTypeBox = tap.context.app

  const response = await app
    .inject()
    .get('/v1/heartbeat')

  t.equal(response.statusCode, 200, 'returns code 200')
})

/* User Creation
 * - Creates dummy user 'jd77'
 */
tap.test(
  'User Creation',
  async t => {
    const app: FastifyTypeBox = tap.context.app

    const user = {
      name: 'John Doe',
      email: 'jd77@gmail.com',
      password: 'johndoe77',
      username: 'jd77',
      year: '2025',
      school: 'Rock High School',
      country: 'USA',
      region: 'Pacific'
    }

    let response = await app.inject()
      .post('/v1/users')
      .body(user)

    t.equal(response.statusCode, 201, 'returns code 201')
    const { userId } = response.json()

    // Check profile
    response = await app.inject()
      .get(`/v1/users/${user.username}/profiles/public`)

    t.equal(response.statusCode, 200, 'returns code 200')
    {
      const profile: UserPublicProfile = response.json()
      t.equal(profile.username, user.username, 'profile username matches')
      t.equal(profile.name, user.name, 'profile name matches')
      t.equal(profile.id, userId, 'profile id matches')
    }
  })
