import { CosmosDB } from '@aocs/libraries'

export async function createContainers (): Promise<any[]> {
  const DbContainers = [
    { id: 'problemBank', partitionKey: '/domainId' },
    { id: 'submissions', partitionKey: '/id' },
    { id: 'domains', partitionKey: '/id' },
    { id: 'users', partitionKey: '/id' },
    { id: 'usernameIndex', partitionKey: '/id' },
    { id: 'emailIndex', partitionKey: '/id' },
    { id: 'emailVerifications', partitionKey: '/userId', defaultTtl: 900 }]

  const DbInitQueue: Array<Promise<any>> = []
  DbContainers.forEach((container) => {
    DbInitQueue.push(CosmosDB.containers.createIfNotExists(container))
  })
  return await Promise.all(DbInitQueue)
}
