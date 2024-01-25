import { MongoServerError, contestCollection, contestProblemCollection, contestProblemListCollection, contestSeriesCollection, domainProblemCollection, mongoClient, ranklistRedis, recalculateTeamTotalScore, teamScoreCollection } from '@argoncs/common'
import { type NewContestSeries, type ConetstProblemList, type Contest, type ContestProblem, type NewContest, type TeamScore, type ContestSeries } from '@argoncs/types'
import { ConflictError, MethodNotAllowedError, NotFoundError } from 'http-errors-enhanced'
import { nanoid } from 'nanoid'
import { CONTEST_CACHE_KEY, CONTEST_PATH_CACHE_KEY, PROBLEMLIST_CACHE_KEY, deleteCache, fetchCacheUntilLockAcquired, releaseLock, setCache } from './cache.services.js'

export async function createContest ({ newContest, domainId }: { newContest: NewContest, domainId: string }): Promise<{ contestId: string }> {
  const id = nanoid()
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
  const id = nanoid()
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

export async function fetchContest ({ contestId }: { contestId: string }): Promise<Contest> {
  const cache = await fetchCacheUntilLockAcquired<Contest>({ key: `${CONTEST_CACHE_KEY}:${contestId}` })
  if (cache != null) {
    return cache
  }

  try {
    const contest = await contestCollection.findOne({ id: contestId })
    if (contest == null) {
      throw new NotFoundError('Contest not found')
    }

    await setCache({ key: `${CONTEST_CACHE_KEY}:${contestId}`, data: contest })
    return contest
  } finally {
    await releaseLock({ key: `${CONTEST_CACHE_KEY}:${contestId}` })
  }
}

export async function fetchDomainContests ({ domainId }: { domainId: string }): Promise<Contest[]> {
  const contests = await contestCollection.find({ domainId }).sort({ _id: -1 }).toArray()
  return contests
}

export async function updateContest ({ contestId, newContest }: { contestId: string, newContest: Partial<Omit<NewContest, 'seriesId'>> }): Promise<{ modified: boolean }> {
  let contest: Contest | null = null
  try {
    contest = (await contestCollection.findOneAndUpdate(
      { id: contestId },
      { $set: newContest },
      { returnDocument: 'after' }
    ))
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) {
      throw new ConflictError('Contest path conflict')
    } else {
      throw err
    }
  }

  if (contest == null) {
    throw new NotFoundError('Contest not found')
  }

  await deleteCache({ key: `${CONTEST_CACHE_KEY}:${contestId}` })
  if (newContest.path != null && contest.path !== newContest.path && contest.path != null) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    await deleteCache({ key: `${CONTEST_PATH_CACHE_KEY}:${contest.path}` })
  }

  return { modified: true }
}

export async function publishContest ({ contestId, published }: { contestId: string, published: boolean }): Promise<void> {
  const contest = await contestCollection.findOneAndUpdate(
    { id: contestId },
    { $set: { published } },
    { returnDocument: 'after' }
  )

  if (contest == null) {
    throw new NotFoundError('Contest not found')
  }

  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  await deleteCache({ key: `${CONTEST_CACHE_KEY}:${contest.id}` })
}

export async function fetchContestProblemList ({ contestId }: { contestId: string }): Promise<ConetstProblemList> {
  const cache = await fetchCacheUntilLockAcquired<ConetstProblemList>({ key: `${PROBLEMLIST_CACHE_KEY}:${contestId}` })
  if (cache != null) {
    return cache
  }

  try {
    const problemList = await contestProblemListCollection.findOne({ id: contestId })
    if (problemList == null) {
      throw new NotFoundError('Contest not found')
    }
    await setCache({ key: `${PROBLEMLIST_CACHE_KEY}:${contestId}`, data: problemList })
    return problemList
  } finally {
    await releaseLock({ key: `${PROBLEMLIST_CACHE_KEY}:${contestId}` })
  }
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
    })
  } finally {
    await session.endSession()
  }

  const modified = modifiedCount > 0
  if (modified) {
    await deleteCache({ key: `${PROBLEMLIST_CACHE_KEY}:${contestId}` })
  }

  return { modified: modifiedCount > 0 }
}

export async function removeProblemFromContest ({ contestId, problemId }: { contestId: string, problemId: string }): Promise<void> {
  const session = mongoClient.startSession()
  try {
    await session.withTransaction(async () => {
      const contestProblem = await contestProblemCollection.findOneAndDelete({ id: problemId, contestId })
      if (contestProblem == null) {
        throw new NotFoundError('Problem not found')
      }

      await contestProblemListCollection.updateOne(
        { id: contestId },
        { $pull: { problems: { id: contestProblem.id, name: contestProblem.name } } }
      )

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

  await deleteCache({ key: `${PROBLEMLIST_CACHE_KEY}:${contestId}` })
}

/* Fetches the ranklist of a given contest.
 * - Guarentees a 1s gap between every re-aggregation by checking the TTL of the key to the original value.
 * - The '${contestId}-obsolete' serves as a lock for re-aggregation
 *   - This Key is set on score update.
 *   - If a server will re-aggregate, it will delete the 'obsolete' key and effectively 'claim' a lock on re-aggregation.
 *   - During this time, other servers will use the obsolete ranklist.
 * - By setting TTL to 1 year, ensures persistence of the data while giving us a way to measure the record's lifetime
 */
export async function fetchContestRanklist ({ contestId }: { contestId: string }): Promise<TeamScore[]> {
  const cache = await ranklistRedis.get(contestId)
  if (cache == null ||
    (31536000 * 1000 - (await ranklistRedis.pttl(contestId)) > 1000 &&
    (await ranklistRedis.getdel(`${contestId}-obsolete`)) != null)) {
    const ranklist = await teamScoreCollection.find({ contestId }).sort({ totalScore: -1, lastTime: 1 }).toArray()
    await ranklistRedis.set(contestId, JSON.stringify(ranklist))
    await ranklistRedis.expire(contestId, 31536000) // One year
    return ranklist
  }

  return JSON.parse(cache) as TeamScore[]
}
