import { loadTestingApp, type FastifyTypeBox } from '../util/app.js'
import tap from 'tap'
import { createUser } from '../util/user.js'
import { contestCollection, delay, ranklistRedis, teamScoreCollection, userCollection } from '@argoncs/common'
import { type TeamScore, UserRole } from '@argoncs/types'

tap.before(async () => {
  tap.context.app = await loadTestingApp()
})

tap.teardown(async () => {
  await tap.context.app.close()
})

tap.test(
  'Ranklist',
  async t => {
    const app: FastifyTypeBox = tap.context.app

    // Create Admin
    const admin = {
      name: 'admin',
      id: ''
    }
    admin.id = await createUser(t, app, admin.name, 'password')
    await userCollection.updateOne({ username: admin.name }, { $set: { role: UserRole.Admin } })

    // Login
    let response = await app.inject()
      .post('/v1/sessions')
      .body({
        usernameOrEmail: admin.name,
        password: 'password'
      })
    t.equal(response.statusCode, 200, 'session login: ' + response.json().message)
    const cookies = {
      session_token: response.cookies[0].value
    }

    // Create Domain
    const domain = {
      name: 'test-dom',
      id: ''
    }
    response = await app.inject()
      .post('/v1/domains')
      .cookies(cookies)
      .body({
        name: domain.name,
        description: 'testing domain'
      })
    t.equal(response.statusCode, 201, `create domain ${domain.name}: ` + response.json().message)
    domain.id = response.json().domainId

    // Add admin to domain
    response = await app.inject()
      .post(`/v1/domains/${domain.id}/members`)
      .cookies(cookies)
      .body({
        userId: admin.id,
        scopes: ['domain.manage', 'contest.manage']
      })
    t.equal(response.statusCode, 204, 'add admin as member')

    // Create Series
    const series = {
      name: 'test-series',
      id: ''
    }
    response = await app.inject()
      .post(`/v1/domains/${domain.id}/contest-series`)
      .cookies(cookies)
      .body({
        name: series.name
      })
    t.equal(response.statusCode, 201, 'create series: ' + response.json().message)
    series.id = response.json().seriesId

    // Create Contest
    const contest = {
      name: 'test-con',
      handle: 'TC',
      id: ''
    }
    response = await app.inject()
      .post(`/v1/domains/${domain.id}/contests`)
      .cookies(cookies)
      .body({
        name: contest.name,
        description: 'testing contest',
        startTime: Date.now() + 10000,
        endTime: Date.now() + 1000000,
        teamSize: 1,
        handle: contest.handle,
        seriesId: series.id
      })
    t.equal(response.statusCode, 201, 'create contest: ' + response.json().message)
    contest.id = response.json().contestId

    // Publish Contest
    response = await app.inject()
      .post(`/v1/contests/${contest.id}/publish`)
      .cookies(cookies)

    t.equal(response.statusCode, 204, 'publish contest')

    // Create Dummies
    const dummies = [
      { name: 'D1', id: '', teamId: '' },
      { name: 'D2', id: '', teamId: '' },
      { name: 'D3', id: '', teamId: '' },
      { name: 'D4', id: '', teamId: '' }
    ]
    for (const dummy of dummies) {
      // Create Dummy
      dummy.id = await createUser(t, app, dummy.name, 'password')

      // Login as dummy
      let response = await app.inject()
        .post('/v1/sessions')
        .body({
          usernameOrEmail: dummy.name,
          password: 'password'
        })
      t.equal(response.statusCode, 200, `login as dummy '${dummy.name}'` + response.json().message)
      const cookies = { session_token: response.cookies[0].value }

      // Create Team
      response = await app.inject()
        .post(`/v1/contests/${contest.id}/teams`)
        .cookies(cookies)
        .body({ name: dummy.name })
      t.equal(response.statusCode, 201, 'create team: ' + response.json().message)
      dummy.teamId = response.json().teamId
    }

    // Artificially start contest
    await contestCollection.updateOne({ id: contest.id }, { $set: { startTime: Date.now() } })
    await delay(10)

    // Set point values & test ranklist
    const addPoints = async (teamId: string, pts: number): Promise<void> => {
      const teamScore: TeamScore | null = await teamScoreCollection.findOne({ id: teamId })
      if (teamScore != null) {
        const score = teamScore.totalScore
        await teamScoreCollection.updateOne({ id: teamId }, { $set: { totalScore: score + pts } })
        ranklistRedis.set(`${contest.id}-obsolete`, 1)
        await delay(1100)
      }
    }
    const getList = async (): Promise<string[]> => {
      response = await app.inject()
        .get(`/v1/contests/${contest.id}/ranklist`)
        .cookies(cookies)
      const body = response.json()
      t.equal(response.statusCode, 200, 'ranklist: ' + body.message)
      return body.map((e: TeamScore) => e.id)
    }

    await addPoints(dummies[0].teamId, 100)
    let list = await getList()
    t.equal(list[0], dummies[0].teamId, 'test1: A:100, B:0, C:0, D:0')

    await addPoints(dummies[1].teamId, 50)
    list = await getList()
    t.equal(list[1], dummies[1].teamId, 'test2: A:100, B:50, C:0, D:0')

    await addPoints(dummies[3].teamId, 150)
    list = await getList()
    t.equal(list[0], dummies[3].teamId, 'test3: D:150, A:100, B:50, C:0')
    t.equal(list[1], dummies[0].teamId, 'test3: D:150, A:100, B:50, C:0')
    t.equal(list[2], dummies[1].teamId, 'test3: D:150, A:100, B:50, C:0')
  })
