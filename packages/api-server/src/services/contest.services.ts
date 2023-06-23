import { contestCollection, contestProblemListCollection, mongoClient } from '@argoncs/common'
import { ConetstProblemList, Contest, NewContest } from '@argoncs/types'
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
