import { NewDomain, Domain, NotFoundError, ConflictError, DomainDetail } from '@argoncs/types'
import { mongoClient, mongoDB, ObjectId } from '@argoncs/libraries'
import { deleteInProblemBank, fetchDomainProblems } from './problem.services'

import { fetchUser, updateUser } from './user.services'

type DomainDB = Omit<Domain, 'id' | 'members'> & { _id?: ObjectId, members: ObjectId[] }

const domainCollection = mongoDB.collection<DomainDB>('domains')

export async function createDomain (newDomain: NewDomain): Promise<{ domainId: string }> {
  const domain: DomainDB = { ...newDomain, members: [] }
  delete domain._id
  const { insertedId } = await domainCollection.insertOne(domain)
  return { domainId: insertedId.toString() }
}

export async function updateDomain (domainId: string, domain: Partial<NewDomain>): Promise<void> {
  const { matchedCount } = await domainCollection.updateOne({ _id: new ObjectId(domainId) }, { $set: domain })
  if (matchedCount === 0) {
    throw new NotFoundError('Domain does not exist.', { domainId })
  }
}

export async function deleteDomain (domainId: string): Promise<void> {
  const session = mongoClient.startSession()
  try {
    await session.withTransaction(async () => {
      const { value: domain } = await domainCollection.findOneAndDelete({ _id: new ObjectId(domainId) })
      if (domain == null) {
        throw new NotFoundError('Domain does not exist.', { domainId })
      }

      const removedMembers: Array<Promise<void>> = []
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

export async function addDomainMember (domainId: string, userId: string, scopes: string[]): Promise<void> {
  const user = await fetchUser(userId)

  if (user.scopes[domainId] != null) {
    throw new ConflictError('User is already a member of the domain.', { domainId, userId })
  }

  user.scopes[domainId] = scopes

  const session = mongoClient.startSession()
  try {
    await session.withTransaction(async () => {
      await updateUser(user, userId)
      const { matchedCount } = await domainCollection.updateOne({ _id: new ObjectId(domainId) }, { $addToSet: { members: new ObjectId(userId) } })
      if (matchedCount === 0) {
        throw new NotFoundError('Domain does not exist.', { domainId })
      }
    })
  } finally {
    await session.endSession()
  }
}

export async function removeDomainMember (domainId: string, userId: string): Promise<void> {
  const user = await fetchUser(userId)

  if (user.scopes[domainId] != null) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete user.scopes[domainId]
  }

  const session = mongoClient.startSession()
  try {
    await session.withTransaction(async () => {
      await updateUser(user, userId)
      const { matchedCount } = await domainCollection.updateOne({ _id: new ObjectId(domainId) }, { $pull: { members: userId } })
      if (matchedCount === 0) {
        throw new NotFoundError('Domain does not exist.', { domainId })
      }
    })
  } finally {
    await session.endSession()
  }
}

export async function updateMemberScopes (domainId: string, userId: string, scopes: string[]): Promise<void> {
  const user = await fetchUser(userId)

  if (user.scopes[domainId] == null) {
    throw new NotFoundError('User is not part of this domain', { userId, domainId })
  }

  user.scopes[domainId] = scopes

  await updateUser(user, userId)
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
