import { NewDomain, Domain, NotFoundError, User, DomainDetail } from '@argoncs/types'
import { mongoClient, mongoDB, ObjectId } from '@argoncs/libraries'
import { deleteInProblemBank, fetchDomainProblems } from './problem.services'

type DomainDB = Omit<Domain, 'id' | 'members'> & { _id?: ObjectId, members: ObjectId[] }
type UserDB = Omit<User, 'id'> & { _id?: ObjectId }

const userCollection = mongoDB.collection<UserDB>('users')
const domainCollection = mongoDB.collection<DomainDB>('domains')

export async function createDomain (newDomain: NewDomain): Promise<{ domainId: string }> {
  const domain: DomainDB = { ...newDomain, members: [] }
  delete domain._id
  const { insertedId } = await domainCollection.insertOne(domain)
  return { domainId: insertedId.toString() }
}

export async function updateDomain (domainId: string, domain: Partial<NewDomain>): Promise<{ modified: boolean }> {
  const { matchedCount, modifiedCount } = await domainCollection.updateOne({ _id: new ObjectId(domainId) }, { $set: domain })
  if (matchedCount === 0) {
    throw new NotFoundError('Domain does not exist.', { domainId })
  }

  return { modified: modifiedCount > 0 }
}

export async function deleteDomain (domainId: string): Promise<void> {
  const session = mongoClient.startSession()
  try {
    await session.withTransaction(async () => {
      const { value: domain } = await domainCollection.findOneAndDelete({ _id: new ObjectId(domainId) })
      if (domain == null) {
        throw new NotFoundError('Domain does not exist.', { domainId })
      }

      const removedMembers: Array<Promise<{ modified: boolean }>> = []
      domain.members.forEach((userId) => {
        removedMembers.push(removeDomainMember(domainId, userId.toString()))
      })
      await Promise.allSettled(removedMembers)

      const deletedProblems: Array<Promise<void>> = []
      const domainProblems = await fetchDomainProblems(domainId)
      domainProblems.forEach((problem) => {
        deletedProblems.push(deleteInProblemBank(problem.id, domainId))
      })

      await Promise.allSettled(deletedProblems)
    })
  } finally {
    await session.endSession()
  }
}

export async function addOrUpdateDomainMember (domainId: string, userId: string, scopes: string[]): Promise<{ modified: boolean }> {
  const session = mongoClient.startSession()
  try {
    let modifiedCount = 0
    await session.withTransaction(async () => {
      const { matchedCount: matchedUser, modifiedCount: modifiedUser } = await userCollection.updateOne({ _id: new ObjectId(userId) },
        { $set: { 'scopes.$[domain]': scopes } },
        { arrayFilters: [{ domain: domainId }] })
      if (matchedUser === 0) {
        throw new NotFoundError('User does not exist.', { userId })
      }
      modifiedCount += modifiedUser

      const { matchedCount: matchedDomain, modifiedCount: modifiedDomain } = await domainCollection.updateOne({ _id: new ObjectId(domainId) }, { $addToSet: { members: new ObjectId(userId) } })
      if (matchedDomain === 0) {
        throw new NotFoundError('Domain does not exist.', { domainId })
      }
      modifiedCount += modifiedDomain
    })
    return { modified: modifiedCount > 0 }
  } finally {
    await session.endSession()
  }
}

export async function removeDomainMember (domainId: string, userId: string): Promise<{ modified: boolean }> {
  const session = mongoClient.startSession()
  try {
    let modifiedCount = 0
    await session.withTransaction(async () => {
      const { matchedCount: matchedUser, modifiedCount: modifiedUser } = await userCollection.updateOne({ _id: new ObjectId(userId) },
        { $unset: { 'scopes.$[domain]': '' } },
        { arrayFilters: [{ domain: domainId }] })
      if (matchedUser === 0) {
        throw new NotFoundError('User does not exist.', { userId })
      }
      modifiedCount += modifiedUser

      const { matchedCount: matchedDomain, modifiedCount: modifiedDomain } = await domainCollection.updateOne({ _id: new ObjectId(domainId) }, { $pull: { members: userId } })
      if (matchedDomain === 0) {
        throw new NotFoundError('Domain does not exist.', { domainId })
      }
      modifiedCount += modifiedDomain
    })
    return { modified: modifiedCount > 0 }
  } finally {
    await session.endSession()
  }
}

export async function fetchDomain (domainId: string): Promise<Domain> {
  const domain = await domainCollection.findOne({ _id: new ObjectId(domainId) })
  if (domain == null) {
    throw new NotFoundError('Domain does not exist.', { domainId })
  }

  const { _id, members, ...domainContent } = domain
  return { ...domainContent, id: _id.toString(), members: members.map(userId => userId.toString()) }
}

export async function fetchDomainDetail (domainId: string): Promise<DomainDetail> {
  const domain = await domainCollection.aggregate([
    { $match: { _id: new ObjectId(domainId) } },
    {
      $lookup: {
        from: 'users',
        localField: 'members',
        foreignField: '_id',
        as: 'members',
        pipeline: [
          { $set: { id: '$_id' } },
          { $project: { username: 1, name: 1, id: 1 } }
        ]
      }
    },
    { $set: { id: '$_id' } }
  ]).toArray()[0] as DomainDetail | undefined
  if (domain == null) {
    throw new NotFoundError('Domain does not exist.', { domainId })
  }

  return domain
}
