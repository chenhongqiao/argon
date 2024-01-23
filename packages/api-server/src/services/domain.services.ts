import { type NewDomain, type Domain, type DomainMembers } from '@argoncs/types'
import { mongoClient, domainCollection, userCollection } from '@argoncs/common'
import { NotFoundError } from 'http-errors-enhanced'

import { nanoid } from '../utils/nanoid.utils.js'
import { USER_CACHE_KEY, deleteCache } from './cache.services.js'

export async function createDomain ({ newDomain }: { newDomain: NewDomain }): Promise<{ domainId: string }> {
  const domainId = await nanoid()
  const domain: Domain = { ...newDomain, id: domainId, members: [] }
  await domainCollection.insertOne(domain)
  return { domainId }
}

export async function updateDomain ({ domainId, domain }: { domainId: string, domain: Partial<NewDomain> }): Promise<{ modified: boolean }> {
  const { matchedCount, modifiedCount } = await domainCollection.updateOne({ id: domainId }, { $set: domain })
  if (matchedCount === 0) {
    throw new NotFoundError('Domain not found')
  }

  return { modified: modifiedCount > 0 }
}

export async function addOrUpdateDomainMember ({ domainId, userId, scopes }: { domainId: string, userId: string, scopes: string[] }): Promise<{ modified: boolean }> {
  const session = mongoClient.startSession()
  let modifiedCount = 0
  try {
    await session.withTransaction(async () => {
      const { matchedCount: matchedUser, modifiedCount: modifiedUser } = await userCollection.updateOne({ id: userId },
        { $set: { [`scopes.${domainId}`]: scopes } }, { session })
      if (matchedUser === 0) {
        throw new NotFoundError('User not found')
      }
      modifiedCount += Math.floor(modifiedUser)

      const { matchedCount: matchedDomain, modifiedCount: modifiedDomain } = await domainCollection.updateOne({ id: domainId }, { $addToSet: { members: userId } }, { session })
      if (matchedDomain === 0) {
        throw new NotFoundError('Domain not found')
      }
      modifiedCount += Math.floor(modifiedDomain)
    })
  } finally {
    await session.endSession()
  }

  const modified = modifiedCount > 0
  if (modified) {
    await deleteCache({ key: `${USER_CACHE_KEY}:{userId}` })
  }
  return { modified }
}

export async function removeDomainMember ({ domainId, userId }: { domainId: string, userId: string }): Promise<{ modified: boolean }> {
  const session = mongoClient.startSession()
  let modifiedCount = 0
  try {
    await session.withTransaction(async () => {
      const { matchedCount: matchedUser, modifiedCount: modifiedUser } = await userCollection.updateOne({ id: userId },
        { $unset: { [`scopes.${domainId}`]: '' } }, { session })
      if (matchedUser === 0) {
        throw new NotFoundError('User not found')
      }
      modifiedCount += Math.floor(modifiedUser)

      const { matchedCount: matchedDomain, modifiedCount: modifiedDomain } = await domainCollection.updateOne({ id: domainId }, { $pull: { members: userId } }, { session })
      if (matchedDomain === 0) {
        throw new NotFoundError('Domain not found')
      }
      modifiedCount += Math.floor(modifiedDomain)
    })
  } finally {
    await session.endSession()
  }
  const modified = modifiedCount > 0
  if (modified) {
    await deleteCache({ key: `${USER_CACHE_KEY}:{userId}` })
  }
  return { modified }
}

export async function fetchDomain ({ domainId }: { domainId: string }): Promise<Domain> {
  const domain = await domainCollection.findOne({ id: domainId })
  if (domain == null) {
    throw new NotFoundError('Domain not found')
  }

  return domain
}

export async function fetchDomainMembers ({ domainId }: { domainId: string }): Promise<DomainMembers> {
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
  ]).toArray())[0]
  if (domain == null) {
    throw new NotFoundError('Domain not found')
  }

  return domain.members
}
