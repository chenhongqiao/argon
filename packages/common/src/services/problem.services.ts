import { type ContestProblem, type Problem } from '@argoncs/types'
import { NotFoundError } from 'http-errors-enhanced'
import { contestProblemCollection, domainProblemCollection } from '../connections/mongodb.connections.js'

export async function fetchDomainProblem (problemId: string, domainId: string): Promise<Problem> {
  const problem = await domainProblemCollection.findOne({ id: problemId, domainId })
  if (problem == null) {
    throw new NotFoundError('Problem not found')
  }
  return problem
}

export async function fetchContestProblem (problemId: string, contestId: string): Promise<ContestProblem> {
  const problem = await contestProblemCollection.findOne({ id: problemId, contestId })
  if (problem == null) {
    throw new NotFoundError('Problem not found')
  }
  return problem
}
