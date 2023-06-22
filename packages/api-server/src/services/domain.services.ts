import { NewDomain, Domain, DomainDetail } from '@argoncs/types'
import { mongoClient, domainCollection, userCollection } from '@argoncs/common'
import { NotFoundError } from 'http-errors-enhanced'

import { nanoid } from '../utils/nanoid.utils.js'
import { refreshCache } from './cache.services.js'

export async function createDomain (newDomain: NewDomain): Promise<{ domainId: string }> {
  const domainId = await nanoid()
  const domain: Domain = { ...newDomain, id: domainId, members: [] }
  await domainCollection.insertOne(domain)
  return { domainId }
}

export async function updateDomain (domainId: string, domain: Partial<NewDomain>): Promise<{ modified: boolean }> {
  const { matchedCount, modifiedCount } = await domainCollection.updateOne({ id: domainId }, { $set: domain })
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
      const { matchedCount: matchedUser, modifiedCount: modifiedUser } = await userCollection.updateOne({ id: userId },
        { $set: { [`scopes.${domainId}`]: scopes } }, { session })
      if (matchedUser === 0) {
        throw new NotFoundError('No user found with the given ID.', { userId })
      }
      modifiedCount += Math.floor(modifiedUser)

      const { matchedCount: matchedDomain, modifiedCount: modifiedDomain } = await domainCollection.updateOne({ id: domainId }, { $addToSet: { members: userId } }, { session })
      if (matchedDomain === 0) {
        throw new NotFoundError('No domain found with the given ID.', { domainId })
      }
      modifiedCount += Math.floor(modifiedDomain)

      const user = await userCollection.findOne({ id: userId }, { session })
      await refreshCache(`auth-profile:${userId}`, user)
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
      const { matchedCount: matchedUser, modifiedCount: modifiedUser } = await userCollection.updateOne({ id: userId },
        { $unset: { [`scopes.${domainId}`]: '' } }, { session })
      if (matchedUser === 0) {
        throw new NotFoundError('No user found with the given ID.', { userId })
      }
      modifiedCount += Math.floor(modifiedUser)

      const { matchedCount: matchedDomain, modifiedCount: modifiedDomain } = await domainCollection.updateOne({ id: domainId }, { $pull: { members: userId } }, { session })
      if (matchedDomain === 0) {
        throw new NotFoundError('No domain found with the given ID.', { domainId })
      }
      modifiedCount += Math.floor(modifiedDomain)

      const user = await userCollection.findOne({ id: userId }, { session })
      await refreshCache(`auth-profile:${userId}`, user)
    })

    return { modified: modifiedCount > 0 }
  } finally {
    await session.endSession()
  }
}

export async function fetchDomain (domainId: string): Promise<Domain> {
  const domain = await domainCollection.findOne({ id: domainId })
  if (domain == null) {
    throw new NotFoundError('No domain found with the given ID.', { domainId })
  }

  return domain
}

export async function fetchDomainDetail (domainId: string): Promise<DomainDetail> {
  const domain = (await domainCollection.aggregate([
    { $match: { id: domainId } },
    {
      $lookup: {
        from: 'users',
        localField: 'members',
        foreignField: 'id',
        as: 'members',
        pipeline: [
          { $project: { username: 1, name: 1, id: 1 } }
        ]
      }
    }
  ]).toArray())[0] as DomainDetail | undefined
  if (domain == null) {
    throw new NotFoundError('No domain found with the given ID.', { domainId })
  }

  return domain
}
