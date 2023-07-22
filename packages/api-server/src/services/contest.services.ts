import { contestCollection, contestProblemCollection, contestProblemListCollection, contestSeriesCollection, domainProblemCollection, mongoClient, ranklistRedis, recalculateTeamTotalScore, teamScoreCollection } from '@argoncs/common'
import { type NewContestSeries, type ConetstProblemList, type Contest, type ContestProblem, type NewContest, type TeamScore, type ContestSeries } from '@argoncs/types'
import { MethodNotAllowedError, NotFoundError } from 'http-errors-enhanced'
import { nanoid } from '../utils/nanoid.utils.js'
import { fetchCache, refreshCache, setCache } from './cache.services.js'

export async function createContest ({ newContest, domainId }: { newContest: NewContest, domainId: string }): Promise<{ contestId: string }> {
  const id = await nanoid()
  const contest: Contest = { ...newContest, domainId, id, published: false }
  const session = mongoClient.startSession()
  try {
    await session.withTransaction(async () => {
      const { matchedCount } = await contestSeriesCollection.updateOne({ id: newContest.seriesId, domainId }, { $addToSet: { contests: id } })
      if (matchedCount === 0) {
        throw new NotFoundError('Contest series not found')
      }
      await contestCollection.insertOne(contest)
      await contestProblemListCollection.insertOne({ id, problems: [] })
    })
  } finally {
    await session.endSession()
  }
  return { contestId: id }
}

export async function createContestSeries ({ newContestSeries, domainId }: { newContestSeries: NewContestSeries, domainId: string }): Promise<{ seriesId: string }> {
  const id = await nanoid()
  await contestSeriesCollection.insertOne({ ...newContestSeries, contests: [], id, domainId })
  return { seriesId: id }
}

export async function fetchAllContestSeries (): Promise<ContestSeries[]> {
  const contestSeries = await contestSeriesCollection.find().toArray()
  return contestSeries
}

export async function fetchDomainContestSeries ({ domainId }: { domainId: string }): Promise<ContestSeries[]> {
  const contestSeries = await contestSeriesCollection.find({ domainId }).toArray()
  return contestSeries
}

export async function fetchContestById ({ contestId }: { contestId: string }): Promise<Contest> {
  const cache = await fetchCache<Contest>({ key: `contest:${contestId}` })
  if (cache != null) {
    return cache
  }

  const contest = await contestCollection.findOne({ id: contestId })
  if (contest == null) {
    throw new NotFoundError('Contest not found')
  }

  await setCache({ key: `contest:${contestId}`, data: contest })

  return contest
}

export async function fetchContestByHandle ({ handle }: { handle: string }): Promise<Contest> {
  const cache = await fetchCache<Contest>({ key: `contest:${handle}` })
  if (cache != null) {
    return cache
  }

  const contest = await contestCollection.findOne({ handle })
  if (contest == null) {
    throw new NotFoundError('Contest not found')
  }

  await setCache({ key: `contest:${handle}`, data: contest })

  return contest
}

export async function fetchDomainContests ({ domainId }: { domainId: string }): Promise<Contest[]> {
  const contests = await contestCollection.find({ domainId }).sort({ _id: -1 }).toArray()
  return contests
}

export async function updateContest ({ contestId, contest }: { contestId: string, contest: Partial<Omit<NewContest, 'seriesId'>> }): Promise<void> {
  const { value } = await contestCollection.findOneAndUpdate({ id: contestId }, { $set: contest })
  if (value == null) {
    throw new NotFoundError('Contest not found')
  }

  await refreshCache({ key: `contest:${contestId}`, data: contest })
  await refreshCache({ key: `contest:${value.handle as string}`, data: contest })
}

export async function fetchContestProblemList ({ contestId }: { contestId: string }): Promise<ConetstProblemList> {
  const cache = await fetchCache<ConetstProblemList>({ key: `problem-list:${contestId}` })
  if (cache != null) {
    return cache
  }

  const problemList = await contestProblemListCollection.findOne({ id: contestId })
  if (problemList == null) {
    throw new NotFoundError('Contest not found')
  }

  await setCache({ key: `problem-list:${contestId}`, data: problemList })

  return problemList
}

export async function syncProblemToContest ({ contestId, problemId }: { contestId: string, problemId: string }): Promise<{ modified: boolean }> {
  const session = mongoClient.startSession()
  let modifiedCount = 0
  try {
    await session.withTransaction(async () => {
      const contest = await contestCollection.findOne({ id: contestId }, { session })
      if (contest == null) {
        throw new NotFoundError('Contest not found')
      }

      const problem = await domainProblemCollection.findOne({ id: problemId, domainId: contest.domainId }, { session })
      if (problem == null) {
        throw new NotFoundError('Problem not found')
      }
      if (problem.testcases == null) {
        throw new MethodNotAllowedError('Testcases must be uploaded before a problem can be added to contests')
      }

      const contestProblem: ContestProblem = { ...problem, obsolete: false, contestId }
      const { modifiedCount: modifiedProblem } = await contestProblemCollection.replaceOne({ id: problemId, contestId }, contestProblem, { upsert: true })
      modifiedCount += Math.floor(modifiedProblem)

      const { modifiedCount: modifiedList } = await contestProblemListCollection.updateOne(
        { id: contestId },
        { $addToSet: { problems: { id: contestProblem.id, name: contestProblem.name } } }
      )
      modifiedCount += Math.floor(modifiedList)

      const problemList = await contestProblemListCollection.findOne({ id: contestId }) as ConetstProblemList
      await refreshCache({ key: `problem-list:${contestId}`, data: problemList })
    })
  } finally {
    await session.endSession()
  }
  return { modified: modifiedCount > 0 }
}

export async function removeProblemFromContest ({ contestId, problemId }: { contestId: string, problemId: string }): Promise<void> {
  const session = mongoClient.startSession()
  try {
    await session.withTransaction(async () => {
      const contestProblem = await contestProblemCollection.findOneAndDelete({ id: problemId, contestId })
      if (contestProblem.value == null) {
        throw new NotFoundError('Problem not found')
      }

      const problemList = await contestProblemListCollection.findOneAndUpdate(
        { id: contestId },
        { $pull: { problems: { id: contestProblem.value.id, name: contestProblem.value.name } } }
      )

      await refreshCache({ key: `problem-list:${contestId}`, data: problemList })
      await teamScoreCollection.updateMany({ contestId },
        { $unset: { [`scores.${problemId}`]: '' } }
      )
      await teamScoreCollection.updateMany({ contestId },
        { $unset: { [`time.${problemId}`]: '' } }
      )
      await recalculateTeamTotalScore({ contestId })
    })
  } finally {
    await session.endSession()
  }
}

export async function fetchContestRanklist ({ contestId }: { contestId: string }): Promise<TeamScore[]> {
  const cache = await ranklistRedis.get(contestId)
  if (cache == null ||
    (946080000 * 1000 - (await ranklistRedis.pttl(contestId)) > 1000 &&
    (await ranklistRedis.getdel(`${contestId}-obsolete`)) != null)) {
    const ranklist = await teamScoreCollection.find({ contestId }).sort({ totalScore: -1, lastTime: 1 }).toArray()
    await ranklistRedis.set(contestId, JSON.stringify(ranklist))
    await ranklistRedis.expire(contestId, 946080000)
    return ranklist
  }

  return JSON.parse(cache) as TeamScore[]
}
