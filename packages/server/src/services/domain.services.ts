import { NewDomain, Domain, CosmosDB, AzureError, User, NotFoundError, Item } from '@project-carbon/shared'

const domainsContainer = CosmosDB.container('domains')
const usersContainer = CosmosDB.container('domains')

async function fetchUser (userId: string): Promise<{user: User, userItem: Item}> {
  const userItem = usersContainer.item(userId, userId)
  const fetchedUser = await userItem.read<User>()
  if (fetchedUser.statusCode === 404) {
    throw new NotFoundError('User not found.', userId)
  } else if (fetchedUser.resource == null) {
    throw new AzureError('Unexpected CosmosDB return.', fetchedUser)
  }
  const user = fetchedUser.resource
  return { user, userItem }
}

export async function createDomain (newDomain: NewDomain): Promise<{domainId: string}> {
  const created = await domainsContainer.items.create(newDomain)
  if (created.resource == null) {
    throw new AzureError('No resource ID returned while creating user.', created)
  }

  return { domainId: created.resource.id }
}

export async function addDomainMember (domainId: string, userId: string): Promise<{domainId: string, userId: string}> {
  const { user, userItem } = await fetchUser(userId)

  const domainItem = domainsContainer.item(domainId, domainId)
  const fetchedDomain = await domainItem.read<Domain>()
  if (fetchedDomain.statusCode === 404) {
    throw new NotFoundError('Domain not found.', userId)
  } else if (fetchedDomain.resource == null) {
    throw new AzureError('Unexpected CosmosDB return.', fetchedDomain)
  }
  const domain = fetchedDomain.resource

  if (!Boolean(domain.members.includes(userId))) {
    domain.members.push(userId)
  }

  if (user.scopes[domainId] == null) {
    user.scopes[domainId] = []
  }

  const updatedUser = await userItem.replace(user)
  if (updatedUser.resource == null) {
    throw new AzureError('Unexpected CosmosDB return.', updatedUser)
  }

  const updatedDomain = await domainItem.replace(domain)
  if (updatedDomain.resource == null) {
    throw new AzureError('Unexpected CosmosDB return.', updatedDomain)
  }

  return { userId: updatedUser.resource.id, domainId: updatedDomain.resource.id }
}

export async function removeDomainMember (domainId: string, userId: string): Promise<{domainId: string, userId: string}> {
  const userItem = usersContainer.item(userId, userId)
  const fetchedUser = await userItem.read<User>()
  if (fetchedUser.statusCode === 404) {
    throw new NotFoundError('User not found.', userId)
  } else if (fetchedUser.resource == null) {
    throw new AzureError('Unexpected CosmosDB return.', fetchedUser)
  }
  const user = fetchedUser.resource

  const domainItem = domainsContainer.item(domainId, domainId)
  const fetchedDomain = await domainItem.read<Domain>()
  if (fetchedDomain.statusCode === 404) {
    throw new NotFoundError('Domain not found.', userId)
  } else if (fetchedDomain.resource == null) {
    throw new AzureError('Unexpected CosmosDB return.', fetchedDomain)
  }
  const domain = fetchedDomain.resource

  if (Boolean(domain.members.includes(userId))) {
    domain.members.splice(domain.members.indexOf(userId), 1)
  }

  if (user.scopes[domainId] != null) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete user.scopes[domainId]
  }

  const updatedUser = await userItem.replace(user)
  if (updatedUser.resource == null) {
    throw new AzureError('Unexpected CosmosDB return.', updatedUser)
  }

  const updatedDomain = await domainItem.replace(domain)
  if (updatedDomain.resource == null) {
    throw new AzureError('Unexpected CosmosDB return.', updatedDomain)
  }

  return { userId: updatedUser.resource.id, domainId: updatedDomain.resource.id }
}
