import {database} from '../../common/databases/cosmos.infra';

import {Static, Type} from '@sinclair/typebox';

import {AzureError, NotFoundError} from '../../common/classes/error.class';

export const NewProblemSchema = Type.Object({
  name: Type.String(),
  context: Type.String(),
  inputFormat: Type.String(),
  outputFormat: Type.String(),
  samples: Type.Array(
    Type.Object({input: Type.String(), output: Type.String()})
  ),
  testcases: Type.Array(
    Type.Object({input: Type.String(), output: Type.String()})
  ),
});

NewProblemSchema.additionalProperties = false;

export type NewProblem = Static<typeof NewProblemSchema>;

const container = database.container('problems');
const items = container.items;

export async function create(problem: NewProblem): Promise<{id: string}> {
  const result = await items.create(problem);
  if (result.resource) {
    return {id: result.resource.id};
  } else {
    throw new AzureError('No resource ID returned', result);
  }
}

export const ProblemSchema = Type.Object({
  name: Type.String(),
  id: Type.String(),
  context: Type.String(),
  inputFormat: Type.String(),
  outputFormat: Type.String(),
  samples: Type.Array(
    Type.Object({input: Type.String(), output: Type.String()})
  ),
  testcases: Type.Array(
    Type.Object({input: Type.String(), output: Type.String()})
  ),
});

ProblemSchema.additionalProperties = false;

export type Problem = Static<typeof ProblemSchema>;

export async function fetch(id: string): Promise<Problem> {
  const item = container.item(id, id);
  const result = await item.read<Problem>();
  if (result.resource) {
    return result.resource;
  } else if (result.statusCode === 404) {
    throw new NotFoundError('Problem not found', id);
  } else {
    throw new AzureError('Unexpected CosmosDB return', result);
  }
}

export async function update(problem: Problem): Promise<{id: string}> {
  const item = container.item(problem.id, problem.id);
  const result = await item.replace(problem);
  if (result.resource) {
    return {id: result.resource.id};
  } else if (result.statusCode === 404) {
    throw new NotFoundError('Problem not found', problem.id);
  } else {
    throw new AzureError('Unexpected CosmosDB return', result);
  }
}

export async function remove(id: string): Promise<{id: string}> {
  const item = container.item(id, id);
  const result = await item.delete();
  if (result.resource) {
    return {id: result.resource.id};
  } else if (result.statusCode === 404) {
    throw new NotFoundError('Problem not found', id);
  } else {
    throw new AzureError('Unexpected CosmosDB return', result);
  }
}

export async function fetchAll(): Promise<Problem[]> {
  const problems = (await items.readAll<Problem>().fetchAll()).resources;
  return problems;
}
