import {
  NewProblem,
  NotFoundError,
  Problem
} from '@argoncs/types'
import { mongoDB, ObjectId } from '@argoncs/libraries'
import { verifyTestcaseDomain } from './testcase.services'

type ProblemDB = Omit<Problem, 'id' | 'domainId'> & { _id?: ObjectId, domains_id: ObjectId }

const problemBankCollection = mongoDB.collection<ProblemDB>('problemBank')

export async function createInProblemBank (newProblem: NewProblem, domainId: string): Promise<{ problemId: string }> {
  const problem: ProblemDB = { ...newProblem, domains_id: new ObjectId(domainId) }
  const testcasesVerifyQueue: Array<Promise<void>> = []
  problem.testcases.forEach((testcase) => {
    testcasesVerifyQueue.push(verifyTestcaseDomain(testcase.input, domainId))
    testcasesVerifyQueue.push(verifyTestcaseDomain(testcase.output, domainId))
  })
  await Promise.all(testcasesVerifyQueue)
  const { insertedId } = await problemBankCollection.insertOne(problem)
  return { problemId: insertedId.toString() }
}

export async function fetchFromProblemBank (problemId: string, domainId: string): Promise<Problem> {
  const problem = await problemBankCollection.findOne({ _id: new ObjectId(problemId), domains_id: new ObjectId(domainId) })
  if (problem == null) {
    throw new NotFoundError('Problem does not exist in problem bank.', { problemId, domainId })
  }
  const { _id, domains_id, ...problemContent } = problem
  return { ...problemContent, id: _id.toString(), domainId: domains_id.toString() }
}

export async function updateInProblemBank (problemId: string, domainId: string, problem: Partial<NewProblem>): Promise<{ modified: boolean }> {
  if (problem.testcases != null) {
    const testcasesVerifyQueue: Array<Promise<void>> = []
    problem.testcases.forEach((testcase) => {
      testcasesVerifyQueue.push(verifyTestcaseDomain(testcase.input, domainId))
      testcasesVerifyQueue.push(verifyTestcaseDomain(testcase.output, domainId))
    })
    await Promise.all(testcasesVerifyQueue)
  }

  const { matchedCount, modifiedCount } = await problemBankCollection.updateOne({ _id: new ObjectId(problemId), domains_id: new ObjectId(domainId) }, { $set: problem })
  if (matchedCount === 0) {
    throw new NotFoundError('Problem does not exist in problem bank.', { problemId, domainId })
  }

  return { modified: modifiedCount > 0 }
}

export async function deleteInProblemBank (problemId: string, domainId: string): Promise<void> {
  const { deletedCount } = await problemBankCollection.deleteOne({ _id: new ObjectId(problemId), domains_id: new ObjectId(domainId) })

  if (deletedCount === 0) {
    throw new NotFoundError('Problem does not exist in problem bank.', { problemId, domainId })
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
