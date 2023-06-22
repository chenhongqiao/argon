import { contestCollection } from '@argoncs/common'
import { Contest, NewContest } from '@argoncs/types'
import { nanoid } from '../utils/nanoid.utils.js'

export async function createContest (newContest: NewContest, domainId: string): Promise<{ contestId: string }> {
  const id = await nanoid()
  const contest: Contest = { ...newContest, domainId, id }
  await contestCollection.insertOne(contest)
  return { contestId: id }
}
