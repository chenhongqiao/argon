import {
  AzureError,
  CosmosDB,
  NewProblem,
  NotFoundError,
  Problem
} from '@chenhongqiao/carbon-common'

const problemsContainer = CosmosDB.container('problems')

export async function createProblem (problem: NewProblem): Promise<{ problemID: string }> {
  const created = await problemsContainer.items.create(problem)
  if (created.resource != null) {
    return { problemID: created.resource.id }
  }
  throw new AzureError('No resource ID returned.', created)
}

export async function fetchProblem (problemID: string): Promise<Problem> {
  const problemItem = problemsContainer.item(problemID, problemID)
  const fetched = await problemItem.read<Problem>()
  if (fetched.resource != null) {
    return fetched.resource
  } if (fetched.statusCode === 404) {
    throw new NotFoundError('Problem not found.', problemID)
  } else {
    throw new AzureError('Unexpected CosmosDB return.', fetched)
  }
}

export async function updateProblem (problem: Problem): Promise<{ problemID: string }> {
  const problemItem = problemsContainer.item(problem.id, problem.id)
  const updated = await problemItem.replace(problem)
  if (updated.resource != null) {
    return { problemID: updated.resource.id }
  } if (updated.statusCode === 404) {
    throw new NotFoundError('Problem not found.', problem.id)
  } else {
    throw new AzureError('Unexpected CosmosDB return.', updated)
  }
}

export async function deleteProblem (problemID: string): Promise<{ problemID: string }> {
  const problemItem = problemsContainer.item(problemID, problemID)
  const deleted = await problemItem.delete<{ id: string }>()
  if (deleted.resource != null) {
    return { problemID: deleted.resource.id }
  } if (deleted.statusCode === 404) {
    throw new NotFoundError('Problem not found.', problemID)
  } else {
    throw new AzureError('Unexpected CosmosDB return.', deleted)
  }
}

export async function fetchAllProblems (): Promise<Problem[]> {
  return (await problemsContainer.items.readAll<Problem>().fetchAll()).resources
}
