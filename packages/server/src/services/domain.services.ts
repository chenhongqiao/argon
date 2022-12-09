import { NewDomain, Domain, AzureError, NotFoundError, ConflictError } from '@cocs/types'
import { CosmosDB } from '@cocs/libraries'
import { deleteInProblemBank, fetchDomainProblems } from './problem.services'

import { fetchUser, updateUser } from './user.services'

const domainsContainer = CosmosDB.container('domains')

export async function createDomain (newDomain: NewDomain): Promise<{domainId: string}> {
  const domain: Omit<Domain, 'id'> = { ...newDomain, members: [] }
  const created = await domainsContainer.items.create(domain)
  if (created.resource == null) {
    throw new AzureError('No resource ID returned when creating domain.', created)
  }

  return { domainId: created.resource.id }
}

export async function deleteDomain (domainId: string): Promise<{ domainId: string }> {
  const domainItem = domainsContainer.item(domainId, domainId)
  const fetched = await domainItem.read<Domain>()
  if (fetched.resource == null) {
    if (fetched.statusCode === 404) {
      throw new NotFoundError('Domain not found.', { domainId })
    } else {
      throw new AzureError('Unexpected CosmosDB return when reading the domain to be deleted.', fetched)
    }
  }
  const domain = fetched.resource

  const removedMembers: Array<Promise<{ domainId: string, userId: string }>> = []
  domain.members.forEach((userId) => {
    removedMembers.push(removeDomainMember(domainId, userId))
  })

  await Promise.allSettled(removedMembers)

  const deletedProblems: Array<Promise<{problemId: string}>> = []
  const domainProblems = await fetchDomainProblems(domainId)
  domainProblems.forEach((problem) => {
    deletedProblems.push(deleteInProblemBank(problem.id, domainId))
  })

  await Promise.allSettled(deletedProblems)

  const deletedDomain = await domainItem.delete<{ id: string }>()
  if (deletedDomain.statusCode >= 400) {
    throw new AzureError('Unexpected CosmosDB return when deleting the domain.', deletedDomain)
  }

  return { domainId: deletedDomain.item.id }
}

export async function addDomainMember (domainId: string, userId: string, scopes: string[]): Promise<{domainId: string, userId: string}> {
  const user = await fetchUser(userId)

  const domainItem = domainsContainer.item(domainId, domainId)
  const fetchedDomain = await domainItem.read<Domain>()
  if (fetchedDomain.statusCode === 404) {
    throw new NotFoundError('Domain not found.', { userId })
  } else if (fetchedDomain.resource == null) {
    throw new AzureError('Unexpected CosmosDB return when reading the domain to be added with the new member.', fetchedDomain)
  }
  const domain = fetchedDomain.resource

  if (Boolean(domain.members.includes(userId)) || user.scopes[domainId] != null) {
    throw new ConflictError('User already exists in domain.', { userId, domainId })
  }

  domain.members.push(userId)
  user.scopes[domainId] = scopes

  const updatedUser = await updateUser(user, userId)

  const updatedDomain = await domainItem.replace(domain)
  if (updatedDomain.resource == null) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete user.scopes[domainId]
    await updateUser(user, userId)
    throw new AzureError('Unexpected CosmosDB return when updating the domain after a member was added.', updatedDomain)
  }

  return { userId: updatedUser.userId, domainId: updatedDomain.resource.id }
}

export async function removeDomainMember (domainId: string, userId: string): Promise<{domainId: string, userId: string}> {
  const user = await fetchUser(userId)

  const domainItem = domainsContainer.item(domainId, domainId)
  const fetchedDomain = await domainItem.read<Domain>()
  if (fetchedDomain.statusCode === 404) {
    throw new NotFoundError('Domain not found.', { domainId })
  } else if (fetchedDomain.resource == null) {
    throw new AzureError('Unexpected CosmosDB return when reading the domain with the member to be removed.', fetchedDomain)
  }
  const domain = fetchedDomain.resource

  if (Boolean(domain.members.includes(userId))) {
    domain.members.splice(domain.members.indexOf(userId), 1)
  }

  const oldScopes = user.scopes[domainId]
  if (user.scopes[domainId] != null) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete user.scopes[domainId]
  }

  const updatedUser = await updateUser(user, userId)

  const updatedDomain = await domainItem.replace(domain)
  if (updatedDomain.resource == null) {
    user.scopes[domainId] = oldScopes
    await updateUser(user, userId)
    throw new AzureError('Unexpected CosmosDB return when updating the domain with the member removed.', updatedDomain)
  }

  return { userId: updatedUser.userId, domainId: updatedDomain.resource.id }
}

export async function updateMemberScopes (domainId: string, userId: string, scopes: string[]): Promise<{domainId: string, userId: string}> {
  const user = await fetchUser(userId)

  if (user.scopes[domainId] == null) {
    throw new NotFoundError('User not part of this domain', { userId, domainId })
  }

  user.scopes[domainId] = scopes

  const updatedUser = await updateUser(user, userId)

  return { userId: updatedUser.userId, domainId }
}
