import { contestCollection, userCollection } from '@argoncs/common'
import { NotFoundError } from 'http-errors-enhanced'
import { CONTEST_PATH_CACHE_KEY, USER_PATH_CACHE_KEY, fetchCache, setCache } from './cache.services.js'

export async function contestIdByPath ({ contestPath }: { contestPath: string }): Promise<string> {
  const cache = await fetchCache<string>({ key: `${CONTEST_PATH_CACHE_KEY}:${contestPath}` })
  if (cache != null) {
    return cache
  }

  const contest = await contestCollection.findOne({ contestPath })
  if (contest == null) {
    throw new NotFoundError('Contest not found')
  }

  await setCache({ key: `${USER_PATH_CACHE_KEY}:${contestPath}`, data: contest.id })

  return contest.id
}

export async function userIdByUsername ({ username }: { username: string }): Promise<string> {
  const cache = await fetchCache<string>({ key: `${USER_PATH_CACHE_KEY}:${username}` })
  if (cache != null) {
    return cache
  }

  const user = await userCollection.findOne({ username })
  if (user == null) {
    throw new NotFoundError('User not found')
  }

  await setCache({ key: `${USER_PATH_CACHE_KEY}:${username}`, data: user.id })

  return user.id
}
