import { AzureError, cosmosDB, NotFoundError, Problem, NewProblem } from '@project-carbon/shared'

const problemsContainer = cosmosDB.container('problems')

export async function createProblem (problem: NewProblem): Promise<{ problemID: string }> {
  const result = await problemsContainer.items.create(problem)
  if (result.resource != null) {
    return { problemID: result.resource.id }
  }
  throw new AzureError('No resource ID returned', result)
}

export async function fetchProblem (problemID: string): Promise<Problem> {
  const item = problemsContainer.item(problemID, problemID)
  const result = await item.read<Problem>()
  if (result.resource != null) {
    return result.resource
  } if (result.statusCode === 404) {
    throw new NotFoundError('Problem not found', problemID)
  } else {
    throw new AzureError('Unexpected CosmosDB return', result)
  }
}

export async function updateProblem (problem: Problem): Promise<{ problemID: string }> {
  const item = problemsContainer.item(problem.id, problem.id)
  const result = await item.replace(problem)
  if (result.resource != null) {
    return { problemID: result.resource.id }
  } if (result.statusCode === 404) {
    throw new NotFoundError('Problem not found', problem.id)
  } else {
    throw new AzureError('Unexpected CosmosDB return', result)
  }
}

export async function deleteProblem (problemID: string): Promise<{ problemID: string }> {
  const item = problemsContainer.item(problemID, problemID)
  const result = await item.delete<{ id: string }>()
  if (result.resource != null) {
    return { problemID: result.resource.id }
  } if (result.statusCode === 404) {
    throw new NotFoundError('Problem not found', problemID)
  } else {
    throw new AzureError('Unexpected CosmosDB return', result)
  }
}

export async function fetchAllProblems (): Promise<Problem[]> {
  return (await problemsContainer.items.readAll<Problem>().fetchAll()).resources
}
