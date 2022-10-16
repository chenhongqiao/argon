import { NewDomain, Domain, CosmosDB, AzureError, NotFoundError } from '@project-carbon/shared'

import { fetchUser, updateUser } from './user.services'

const domainsContainer = CosmosDB.container('domains')

export async function createDomain (newDomain: NewDomain): Promise<{domainId: string}> {
  const created = await domainsContainer.items.create(newDomain)
  if (created.resource == null) {
    throw new AzureError('No resource ID returned while creating user.', created)
  }

  return { domainId: created.resource.id }
}

export async function addDomainMember (domainId: string, userId: string): Promise<{domainId: string, userId: string}> {
  const user = await fetchUser(userId)

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

  const updatedUser = await updateUser(user, userId)

  const updatedDomain = await domainItem.replace(domain)
  if (updatedDomain.resource == null) {
    throw new AzureError('Unexpected CosmosDB return.', updatedDomain)
  }

  return { userId: updatedUser.userId, domainId: updatedDomain.resource.id }
}

export async function removeDomainMember (domainId: string, userId: string): Promise<{domainId: string, userId: string}> {
  const user = await fetchUser(userId)

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

  const updatedUser = await updateUser(user, userId)

  const updatedDomain = await domainItem.replace(domain)
  if (updatedDomain.resource == null) {
    throw new AzureError('Unexpected CosmosDB return.', updatedDomain)
  }

  return { userId: updatedUser.userId, domainId: updatedDomain.resource.id }
}
