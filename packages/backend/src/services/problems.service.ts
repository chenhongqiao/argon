import { CosmosDB, AzureError, NotFoundError } from '@project-carbon/common'

import { Static, Type } from '@sinclair/typebox'

export const NewProblemSchema = Type.Object({
  name: Type.String(),
  context: Type.String(),
  inputFormat: Type.String(),
  outputFormat: Type.String(),
  samples: Type.Array(
    Type.Object({ input: Type.String(), output: Type.String() })
  ),
  testcases: Type.Array(
    Type.Object({ input: Type.String(), output: Type.String() })
  )
})

NewProblemSchema.additionalProperties = false

export type NewProblem = Static<typeof NewProblemSchema>

const container = CosmosDB.database.container('problems')
const { items } = container

export async function createProblem (problem: NewProblem): Promise<{ id: string }> {
  const result = await items.create(problem)
  if (result.resource != null) {
    return { id: result.resource.id }
  }
  throw new AzureError('No resource ID returned', result)
}

export const ProblemSchema = Type.Object({
  name: Type.String(),
  id: Type.String(),
  context: Type.String(),
  inputFormat: Type.String(),
  outputFormat: Type.String(),
  samples: Type.Array(
    Type.Object({ input: Type.String(), output: Type.String() })
  ),
  testcases: Type.Array(
    Type.Object({ input: Type.String(), output: Type.String() })
  )
})

ProblemSchema.additionalProperties = false

export type Problem = Static<typeof ProblemSchema>

export async function fetchProblem (id: string): Promise<Problem> {
  const item = container.item(id, id)
  const result = await item.read<Problem>()
  if (result.resource != null) {
    return result.resource
  } if (result.statusCode === 404) {
    throw new NotFoundError('Problem not found', id)
  } else {
    throw new AzureError('Unexpected CosmosDB return', result)
  }
}

export async function updateProblem (problem: Problem): Promise<{ id: string }> {
  const item = container.item(problem.id, problem.id)
  const result = await item.replace(problem)
  if (result.resource != null) {
    return { id: result.resource.id }
  } if (result.statusCode === 404) {
    throw new NotFoundError('Problem not found', problem.id)
  } else {
    throw new AzureError('Unexpected CosmosDB return', result)
  }
}

export async function deleteProblem (id: string): Promise<{ id: string }> {
  const item = container.item(id, id)
  const result = await item.delete<{ id: string }>()
  if (result.resource != null) {
    return { id: result.resource.id }
  } if (result.statusCode === 404) {
    throw new NotFoundError('Problem not found', id)
  } else {
    throw new AzureError('Unexpected CosmosDB return', result)
  }
}

export async function fetchAllProblems (): Promise<Problem[]> {
  return (await items.readAll<Problem>().fetchAll()).resources
}
