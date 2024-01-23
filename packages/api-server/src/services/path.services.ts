import { contestCollection } from '@argoncs/common'
import { NotFoundError } from 'http-errors-enhanced'
import { fetchCache, setCache } from './cache.services.js'

export async function contestIdByPath ({ contestPath }: { contestPath: string }): Promise<string> {
  const cache = await fetchCache<string>({ key: `contest-path:${contestPath}` })
  if (cache != null) {
    return cache
  }

  const contest = await contestCollection.findOne({ contestPath })
  if (contest == null) {
    throw new NotFoundError('Contest not found')
  }

  await setCache({ key: `contest-path:${contestPath}`, data: contest.id })

  return contest.id
}
