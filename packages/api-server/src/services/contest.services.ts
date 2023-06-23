import { contestCollection, contestProblemCollection, contestProblemListCollection, domainProblemCollection, mongoClient } from '@argoncs/common'
import { ConetstProblemList, Contest, ContestProblem, NewContest } from '@argoncs/types'
import { NotFoundError } from 'http-errors-enhanced'
import { nanoid } from '../utils/nanoid.utils.js'
import { fetchCache, refreshCache, setCache } from './cache.services.js'

export async function createContest (newContest: NewContest, domainId: string): Promise<{ contestId: string }> {
  const id = await nanoid()
  const contest: Contest = { ...newContest, domainId, id, published: false }
  const session = mongoClient.startSession()
  try {
    await session.withTransaction(async () => {
      await contestCollection.insertOne(contest)
      await contestProblemListCollection.insertOne({ id, problems: [] })
    })
  } finally {
    await session.endSession()
  }
  return { contestId: id }
}

export async function fetchContest (contestId: string): Promise<Contest> {
  const cache = await fetchCache<Contest>(`contest:${contestId}`)
  if (cache != null) {
    return cache
  }

  const contest = await contestCollection.findOne({ id: contestId })
  if (contest == null) {
    throw new NotFoundError('Contest not found', { contestId })
  }

  await setCache(`contest:${contestId}`, contest)

  return contest
}

export async function fetchDomainContests (domainId: string): Promise<Contest[]> {
  const contests = await contestCollection.find({ domainId }).sort({ _id: -1 }).toArray()
  return contests
}

export async function updateContest (contestId: string, contest: Partial<NewContest>): Promise<{ modified: boolean }> {
  const { matchedCount, modifiedCount } = await contestCollection.updateOne({ id: contestId }, { $set: contest })
  if (matchedCount === 0) {
    throw new NotFoundError('Contest not found', { contestId })
  }

  await refreshCache(`contest:${contestId}`, contest)

  return { modified: modifiedCount > 0 }
}

export async function fetchContestProblemList (contestId: string): Promise<ConetstProblemList> {
  const cache = await fetchCache<ConetstProblemList>(`problem-list:${contestId}`)
  if (cache != null) {
    return cache
  }

  const problemList = await contestProblemListCollection.findOne({ id: contestId })
  if (problemList == null) {
    throw new NotFoundError('Contest not found', { contestId })
  }

  await setCache(`problem-list:${contestId}`, problemList)

  return problemList
}

export async function syncProblemToContest (contestId: string, problemId: string): Promise<{ modified: boolean }> {
  const session = mongoClient.startSession()
  let modifiedCount = 0
  try {
    await session.withTransaction(async () => {
      const contest = await contestCollection.findOne({ id: contestId }, { session })
      if (contest == null) {
        throw new NotFoundError('Contest not found', { contestId })
      }

      const problem = await domainProblemCollection.findOne({ id: problemId, domainId: contest.domainId }, { session })
      if (problem == null) {
        throw new NotFoundError('Problem not found', { problemId })
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
      await refreshCache(`problem-list:${contestId}`, problemList)
    })
  } finally {
    await session.endSession()
  }
  return { modified: modifiedCount > 0 }
}

export async function removeProblemFromContest (contestId: string, problemId: string): Promise<void> {
  const session = mongoClient.startSession()
  try {
    await session.withTransaction(async () => {
      const contestProblem = await contestProblemCollection.findOneAndDelete({ id: problemId, contestId })
      if (contestProblem.value == null) {
        throw new NotFoundError('Problem not found', { problemId })
      }

      const problemList = await contestProblemListCollection.findOneAndUpdate(
        { id: contestId },
        { $pull: { problems: { id: contestProblem.value.id, name: contestProblem.value.name } } }
      )

      await refreshCache(`problem-list:${contestId}`, problemList)
      // TODO: remove all related submissions
    })
  } finally {
    await session.endSession()
  }
}
