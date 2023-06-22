import { Problem } from '@argoncs/types'
import { NotFoundError } from 'http-errors-enhanced'
import { domainProblemCollection } from '../connections/mongodb.connections.js'

export async function fetchDomainProblem (problemId: string, domainId: string): Promise<Problem> {
  const problem = await domainProblemCollection.findOne({ id: problemId, domainId })
  if (problem == null) {
    throw new NotFoundError('Problem not found', { problemId, domainId })
  }
  return problem
}
