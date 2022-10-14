import {
  AzureError,
  CosmosDB,
  NewProblem,
  NotFoundError,
  Problem
} from '@project-carbon/shared'

const problemBankContainer = CosmosDB.container('problemBank')

export async function createInProblemBank (newProblem: NewProblem, domainId: string): Promise<{ problemId: string }> {
  const problem: Omit<Problem, 'id'> = { ...newProblem, domainId }
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
    throw new NotFoundError('Problem not found.', problemId)
  } else {
    throw new AzureError('Unexpected CosmosDB return.', fetched)
  }
}

export async function updateProblem (problem: NewProblem, problemId: string, domainId: string): Promise<{ problemId: string }> {
  const problemItem = problemBankContainer.item(problemId, domainId)
  const updated = await problemItem.replace(problem)
  if (updated.resource != null) {
    return { problemId: updated.resource.id }
  } if (updated.statusCode === 404) {
    throw new NotFoundError('Problem not found.', problemId)
  } else {
    throw new AzureError('Unexpected CosmosDB return.', updated)
  }
}

export async function deleteProblem (problemId: string, domainId: string): Promise<{ problemId: string }> {
  const problemItem = problemBankContainer.item(problemId, domainId)
  const deletedProblem = await problemItem.delete<{ id: string }>()
  if (deletedProblem.resource == null) {
    if (deletedProblem.statusCode === 404) {
      throw new NotFoundError('Problem not found.', problemId)
    } else {
      throw new AzureError('Unexpected CosmosDB return.', deletedProblem)
    }
  }

  return { problemId: deletedProblem.resource.id }
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
