import {
  AzureError,
  NewProblem,
  NotFoundError,
  Problem
} from '@cocs/types'
import { CosmosDB } from '@cocs/libraries'
import { verifyTestcaseDomain } from './testcase.services'

const problemBankContainer = CosmosDB.container('problemBank')

export async function createInProblemBank (newProblem: NewProblem, domainId: string): Promise<{ problemId: string }> {
  const problem: Omit<Problem, 'id'> = { ...newProblem, domainId }
  const testcasesVerifyQueue: Array<Promise<{testcaseId: string}>> = []
  problem.testcases.forEach((testcase) => {
    testcasesVerifyQueue.push(verifyTestcaseDomain(testcase.input, domainId))
    testcasesVerifyQueue.push(verifyTestcaseDomain(testcase.output, domainId))
  })
  await Promise.all(testcasesVerifyQueue)
  const createdProblem = await problemBankContainer.items.create(problem)
  if (createdProblem.resource == null) {
    throw new AzureError('No resource ID returned.', createdProblem)
  }
  return { problemId: createdProblem.resource.id }
}

export async function fetchFromProblemBank (problemId: string, domainId: string): Promise<Problem> {
  const problemItem = problemBankContainer.item(problemId, domainId)
  const fetched = await problemItem.read<Problem>()
  if (fetched.resource != null) {
    return fetched.resource
  } if (fetched.statusCode === 404) {
    throw new NotFoundError('Problem not found.', { problemId })
  } else {
    throw new AzureError('Unexpected CosmosDB return when reading from problem bank.', fetched)
  }
}

export async function updateInProblemBank (problem: Problem, problemId: string, domainId: string): Promise<{ problemId: string }> {
  const problemWithId = { ...problem, problemId, domainId }
  const testcasesVerifyQueue: Array<Promise<{testcaseId: string}>> = []
  problemWithId.testcases.forEach((testcase) => {
    testcasesVerifyQueue.push(verifyTestcaseDomain(testcase.input, domainId))
    testcasesVerifyQueue.push(verifyTestcaseDomain(testcase.output, domainId))
  })
  await Promise.all(testcasesVerifyQueue)
  const problemItem = problemBankContainer.item(problemId, domainId)
  const updated = await problemItem.replace(problemWithId)
  if (updated.resource != null) {
    return { problemId: updated.resource.id }
  } if (updated.statusCode === 404) {
    throw new NotFoundError('Problem not found.', { problemId })
  } else {
    throw new AzureError('Unexpected CosmosDB return when updating a problem in problem bank.', updated)
  }
}

export async function deleteInProblemBank (problemId: string, domainId: string): Promise<{ problemId: string }> {
  const problemItem = problemBankContainer.item(problemId, domainId)
  const deletedProblem = await problemItem.delete<{ id: string }>()
  if (deletedProblem.statusCode >= 400) {
    if (deletedProblem.statusCode === 404) {
      throw new NotFoundError('Problem not found.', { problemId })
    } else {
      throw new AzureError('Unexpected CosmosDB return when deleting a problem in problem bank.', deletedProblem)
    }
  }

  return { problemId: deletedProblem.item.id }
}

export async function fetchDomainProblems (domainId: string): Promise<Problem[]> {
  const query = {
    query: 'SELECT * FROM p WHERE p.domainId = @domainId',
    parameters: [
      {
        name: '@domainId',
        value: domainId
      }
    ]
  }
  return (await problemBankContainer.items.query(query).fetchAll()).resources
}
