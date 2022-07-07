import { CosmosClient } from '@azure/cosmos'

const client = new CosmosClient(process.env.COSMOS_DB_STRING ?? '')
export const cosmosDB = client.database('server')
