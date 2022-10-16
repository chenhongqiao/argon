import { NewDomain, Domain, CosmosDB, AzureError, NotFoundError, ConflictError } from '@project-carbon/shared'
import { deleteInProblemBank, fetchDomainProblems } from './problem.services'

import { fetchUser, updateUser } from './user.services'

const domainsContainer = CosmosDB.container('domains')

export async function createDomain (newDomain: NewDomain): Promise<{domainId: string}> {
  const created = await domainsContainer.items.create(newDomain)
  if (created.resource == null) {
    throw new AzureError('No resource ID returned while creating user.', created)
  }

  return { domainId: created.resource.id }
}

export async function deleteDomain (domainId: string): Promise<{ domainId: string }> {
  const domainItem = domainsContainer.item(domainId, domainId)
  const fetched = await domainItem.read<Domain>()
  if (fetched.resource == null) {
    if (fetched.statusCode === 404) {
      throw new NotFoundError('Domain not found.', domainId)
    } else {
      throw new AzureError('Unexpected CosmosDB return.', fetched)
    }
  }
  const domain = fetched.resource

  const removedMembers: Array<Promise<{ domainId: string, userId: string }>> = []
  domain.members.forEach((userId) => {
    removedMembers.push(removeDomainMember(domainId, userId))
  })

  await Promise.all(removedMembers)

  const deletedProblems: Array<Promise<{problemId: string}>> = []
  const domainProblems = await fetchDomainProblems(domainId)
  domainProblems.forEach((problem) => {
    deletedProblems.push(deleteInProblemBank(problem.id, domainId))
  })

  await Promise.all(deletedProblems)

  const deleted = await domainItem.delete<{ id: string }>()
  if (deleted.resource == null) {
    throw new AzureError('Unexpected CosmosDB return.', deleted)
  }

  return { domainId: deleted.resource.id }
}

export async function addDomainMember (domainId: string, userId: string, scopes: string[]): Promise<{domainId: string, userId: string}> {
  const user = await fetchUser(userId)

  const domainItem = domainsContainer.item(domainId, domainId)
  const fetchedDomain = await domainItem.read<Domain>()
  if (fetchedDomain.statusCode === 404) {
    throw new NotFoundError('Domain not found.', userId)
  } else if (fetchedDomain.resource == null) {
    throw new AzureError('Unexpected CosmosDB return.', fetchedDomain)
  }
  const domain = fetchedDomain.resource

  if (Boolean(domain.members.includes(userId)) || user.scopes[domainId] != null) {
    throw new ConflictError('User already exists in domain.', `${userId} in ${domainId}`)
  }

  domain.members.push(userId)
  user.scopes[domainId] = scopes

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

export async function updateMemberScopes (domainId: string, userId: string, scopes: string[]): Promise<{domainId: string, userId: string}> {
  const user = await fetchUser(userId)

  if (user.scopes[domainId] == null) {
    throw new NotFoundError('User not part of this domain', `${userId} in ${domainId}`)
  }

  user.scopes[domainId] = scopes

  const updatedUser = await updateUser(user, userId)

  return { userId: updatedUser.userId, domainId }
}
