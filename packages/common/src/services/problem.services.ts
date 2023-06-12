import { Problem } from '@argoncs/types'
import { NotFoundError } from 'http-errors-enhanced'
import { problemBankCollection } from '../connections/mongodb.connections.js'

export async function fetchFromProblemBank (problemId: string, domainId: string): Promise<Problem> {
  const problem = await problemBankCollection.findOne({ id: problemId, domainId })
  if (problem == null) {
    throw new NotFoundError('No problem found in this domain with the given ID.', { problemId, domainId })
  }
  return problem
}
