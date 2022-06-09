import { CosmosClient } from '@azure/cosmos';
const client = new CosmosClient(
  'AccountEndpoint=https://project-carbon-dev.documents.azure.com:443/;AccountKey=BuH5IgvOltSCtpETTO5a4JxKCItSkbRT8rHnibb4291u4INVpEBNPnBx2cse8IgAYRnn4bmPEDZxVaw9TAWqzA=='
);
export const database = client.database('backend');
