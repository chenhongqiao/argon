import {
  AzureError,
  CosmosDB,
  NewProblem,
  NotFoundError,
  Problem
} from '@project-carbon/shared'

const problemsContainer = CosmosDB.container('problems')

export async function createProblem (newProblem: NewProblem, domainId: string): Promise<{ problemId: string }> {
  const problem: Omit<Problem, 'id'> = { ...newProblem, domainId }
  const created = await problemsContainer.items.create(problem)
  if (created.resource != null) {
    return { problemId: created.resource.id }
  }
  throw new AzureError('No resource ID returned.', created)
}

export async function fetchProblem (problemId: string, domainId: string): Promise<Problem> {
  const problemItem = problemsContainer.item(problemId, domainId)
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
  const problemItem = problemsContainer.item(problemId, domainId)
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
  const problemItem = problemsContainer.item(problemId, domainId)
  const deleted = await problemItem.delete<{ id: string }>()
  if (deleted.resource != null) {
    return { problemId: deleted.resource.id }
  } if (deleted.statusCode === 404) {
    throw new NotFoundError('Problem not found.', problemId)
  } else {
    throw new AzureError('Unexpected CosmosDB return.', deleted)
  }
}

export async function fetchAllProblems (domainId: string): Promise<Problem[]> {
  const query = {
    query: 'SELECT * FROM p WHERE p.domainId = @domainId',
    parameters: [
      {
        name: '@domainId',
        value: domainId
      }
    ]
  }
  return (await problemsContainer.items.query(query).fetchAll()).resources
}
