import {
  NewProblem,
  Problem
} from '@argoncs/types'
import { NotFoundError } from 'http-errors-enhanced'
import { mongoDB, ObjectId } from '../../../common/src'
import { testcaseExists } from './testcase.services'

type ProblemDB = Omit<Problem, 'id' | 'domainId'> & { _id?: ObjectId, domains_id: ObjectId }

const problemBankCollection = mongoDB.collection<ProblemDB>('problemBank')

export async function createInProblemBank (newProblem: NewProblem, domainId: string): Promise<{ problemId: string }> {
  const problem: ProblemDB = { ...newProblem, domains_id: new ObjectId(domainId) }
  const { insertedId } = await problemBankCollection.insertOne(problem)
  return { problemId: insertedId.toString() }
}

export async function fetchFromProblemBank (problemId: string, domainId: string): Promise<Problem> {
  const problem = await problemBankCollection.findOne({ _id: new ObjectId(problemId), domains_id: new ObjectId(domainId) })
  if (problem == null) {
    throw new NotFoundError('No problem found in this domain with the given ID.', { problemId, domainId })
  }
  const { _id, domains_id, ...problemContent } = problem
  return { ...problemContent, id: _id.toString(), domainId: domains_id.toString() }
}

export async function updateInProblemBank (problemId: string, domainId: string, problem: Partial<NewProblem>): Promise<{ modified: boolean }> {
  if (problem.testcases != null) {
    const testcasesVerifyQueue: Array<Promise<void>> = []
    problem.testcases.forEach((testcase) => {
      testcasesVerifyQueue.push(testcaseExists(problemId, domainId, testcase.input.name, testcase.input.versionId))
      testcasesVerifyQueue.push(testcaseExists(problemId, domainId, testcase.output.name, testcase.output.versionId))
    })
    await Promise.all(testcasesVerifyQueue)
  }

  const { matchedCount, modifiedCount } = await problemBankCollection.updateOne({ _id: new ObjectId(problemId), domains_id: new ObjectId(domainId) }, { $set: problem })
  if (matchedCount === 0) {
    throw new NotFoundError('No problem found in this domain with the given ID.', { problemId, domainId })
  }

  return { modified: modifiedCount > 0 }
}

export async function deleteInProblemBank (problemId: string, domainId: string): Promise<void> {
  const { deletedCount } = await problemBankCollection.deleteOne({ _id: new ObjectId(problemId), domains_id: new ObjectId(domainId) })

  if (deletedCount === 0) {
    throw new NotFoundError('No problem found in this domain with the given ID.', { problemId, domainId })
  }
}

export async function fetchDomainProblems (domainId: string): Promise<Problem[]> {
  const problems = await problemBankCollection.aggregate([
    { $match: { domains_id: new ObjectId(domainId) } },
    { $set: { id: '$_id', domainId: '$domains_id' } },
    { $project: { _id: 0, domains_id: 0 } }
  ]).toArray() as Problem[]

  return problems
}
