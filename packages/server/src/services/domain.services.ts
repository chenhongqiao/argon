import { NewDomain, Domain, User, DomainDetail } from '@argoncs/types'
import { mongoClient, mongoDB, ObjectId } from '@argoncs/libraries'
import { NotFoundError } from 'http-errors-enhanced'

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
    throw new NotFoundError('No domain found with the given ID.', { domainId })
  }

  return { modified: modifiedCount > 0 }
}

export async function addOrUpdateDomainMember (domainId: string, userId: string, scopes: string[]): Promise<{ modified: boolean }> {
  const session = mongoClient.startSession()
  try {
    let modifiedCount = 0
    await session.withTransaction(async () => {
      const { matchedCount: matchedUser, modifiedCount: modifiedUser } = await userCollection.updateOne({ _id: new ObjectId(userId) },
        { $set: { [`scopes.${domainId}`]: scopes } }, { session })
      if (matchedUser === 0) {
        throw new NotFoundError('User does not exist.', { userId })
      }
      modifiedCount += modifiedUser

      const { matchedCount: matchedDomain, modifiedCount: modifiedDomain } = await domainCollection.updateOne({ _id: new ObjectId(domainId) }, { $addToSet: { members: new ObjectId(userId) } }, { session })
      if (matchedDomain === 0) {
        throw new NotFoundError('No domain found with the given ID.', { domainId })
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
        { $unset: { [`scopes.${domainId}`]: '' } }, { session })
      if (matchedUser === 0) {
        throw new NotFoundError('No user found in this domain with the given ID.', { userId })
      }
      modifiedCount += modifiedUser

      const { matchedCount: matchedDomain, modifiedCount: modifiedDomain } = await domainCollection.updateOne({ _id: new ObjectId(domainId) }, { $pull: { members: new ObjectId(userId) } }, { session })
      if (matchedDomain === 0) {
        throw new NotFoundError('No domain found with the given ID.', { domainId })
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
    throw new NotFoundError('No domain found with the given ID.', { domainId })
  }

  const { _id, members, ...domainContent } = domain
  return { ...domainContent, id: _id.toString(), members: members.map(userId => userId.toString()) }
}

export async function fetchDomainDetail (domainId: string): Promise<DomainDetail> {
  const domain = (await domainCollection.aggregate([
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
  ]).toArray())[0] as DomainDetail | undefined
  if (domain == null) {
    throw new NotFoundError('No domain found with the given ID.', { domainId })
  }

  return domain
}
