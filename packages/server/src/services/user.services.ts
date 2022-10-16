import { User, NewUser, CosmosDB, ConflictError, AzureError, NotFoundError, AuthenticationError, AuthorizationError } from '@project-carbon/shared'
import { randomUUID, randomBytes, pbkdf2 } from 'node:crypto'

import { promisify } from 'node:util'

import { emailClient } from '../connections/email.connections'

const randomBytesAsync = promisify(randomBytes)
const pbkdf2Async = promisify(pbkdf2)

const usersContainer = CosmosDB.container('users')
const usernameIndexContainer = CosmosDB.container('usernameIndex')
const emailIndexContainer = CosmosDB.container('emailIndex')
const verificationsContainer = CosmosDB.container('emailVerifications')

interface UserIndex {
  id: string
  userId: string
}

export async function registerUser (newUser: NewUser): Promise<{userId: string, email: string}> {
  const salt = (await randomBytesAsync(32)).toString('base64')
  const hash = (await pbkdf2Async(newUser.password, salt, 100000, 512, 'sha512')).toString('base64')
  const userId = randomUUID()
  const user: User = {
    name: newUser.name,
    email: newUser.email,
    password: {
      salt,
      hash
    },
    verifiedEmail: null,
    id: userId,
    username: newUser.username,
    scopes: {}
  }
  const usernameIndex: UserIndex = {
    id: user.username,
    userId: userId
  }
  const emailIndex: UserIndex = {
    id: user.email,
    userId: userId
  }

  try {
    await usernameIndexContainer.items.create(usernameIndex)
  } catch (err) {
    if (err.code === 409) {
      throw new ConflictError('Username exists.', user.username)
    } else {
      throw new AzureError('Error while creating username mapping.', err)
    }
  }

  try {
    await emailIndexContainer.items.create(emailIndex)
  } catch (err) {
    if (err.code === 409) {
      await usernameIndexContainer.item(user.username, user.username).delete()
      throw new ConflictError('Email exists.', user.email)
    } else {
      throw new AzureError('Error while creating Email mapping.', err)
    }
  }

  const created = await usersContainer.items.create(user)
  if (created.resource == null) {
    await usernameIndexContainer.item(user.username, user.username).delete()
    await emailIndexContainer.item(user.email, user.email).delete()
    throw new AzureError('No resource ID returned while creating user.', created)
  }
  return { userId: created.resource.id, email: user.email }
}

export async function fetchUser (userId: string): Promise<User> {
  const userItem = usersContainer.item(userId, userId)
  const fetched = await userItem.read<User>()
  if (fetched.resource != null) {
    return fetched.resource
  } if (fetched.statusCode === 404) {
    throw new NotFoundError('User not found.', userId)
  } else {
    throw new AzureError('Unexpected CosmosDB return.', fetched)
  }
}

interface EmailVerification {
  userId: string
  email: string
  id: string
}

export async function initiateVerification (userId: string, email: string): Promise<void> {
  const created = await verificationsContainer.items.create({ userId, email })
  if (created.resource == null) {
    throw new AzureError('Unexpected CosmosDB return.', created)
  }

  const verification = created.resource
  const verificationEmail: emailClient.MailDataRequired = {
    to: verification.email,
    from: { name: 'Carbon Online Contest Server', email: 'noreply@cocs.io' },
    subject: 'Please verify your email',
    html: `User: ${verification.userId}<br>Token: ${verification.id}`
  }

  await emailClient.send(verificationEmail)
}

export async function completeVerification (userId: string, verificationId: string): Promise<{userId: string, statusChanged: boolean}> {
  const userItem = usersContainer.item(userId, userId)
  const fetchedUser = await userItem.read<User>()
  if (fetchedUser.resource == null) {
    throw new AuthorizationError('Invalid verification.', `User: ${userId}`)
  }
  const user = fetchedUser.resource
  if (user.email === user.verifiedEmail) {
    return { userId: user.id, statusChanged: false }
  }

  const verificationItem = verificationsContainer.item(verificationId, userId)
  const fetchedVerification = await verificationItem.read<EmailVerification>()
  if (fetchedVerification.resource == null || fetchedVerification.resource.userId !== user.id) {
    throw new AuthorizationError('Invalid verification.', `Token: ${verificationId}`)
  }
  user.verifiedEmail = fetchedVerification.resource.email
  const replaced = await userItem.replace(user)
  if (replaced.resource == null) {
    throw new AzureError('Unexpected CosmosDB return.', replaced)
  }
  await verificationItem.delete()
  return { userId: replaced.resource.id, statusChanged: true }
}

export async function authenticateUser (usernameOrEmail: string, password: string): Promise<{userId: string, scopes: Record<string, string[]>}> {
  let userIndex = await usernameIndexContainer.item(usernameOrEmail, usernameOrEmail).read<UserIndex>()

  if (userIndex.resource == null) {
    if (userIndex.statusCode === 404) {
      userIndex = await emailIndexContainer.item(usernameOrEmail, usernameOrEmail).read<UserIndex>()
    } else {
      throw new AzureError('Unexpected CosmosDB return.', userIndex)
    }
  }

  if (userIndex.resource == null) {
    if (userIndex.statusCode === 404) {
      throw new AuthenticationError('Authentication failed.', { usernameOrEmail })
    } else {
      throw new AzureError('Unexpected CosmosDB return.', userIndex)
    }
  }

  const { userId } = userIndex.resource
  const fetchedUser = await usersContainer.item(userId, userId).read<User>()
  if (fetchedUser.resource == null) {
    throw new AzureError('User does not exist but mapping exists.', fetchedUser)
  }

  const user = fetchedUser.resource
  const hash = (await pbkdf2Async(password, user.password.salt, 100000, 512, 'sha512')).toString('base64')
  if (hash === user.password.hash) {
    if (user.email !== user.verifiedEmail) {
      throw new AuthorizationError('Please verify your email first.', userId)
    }
    return { userId: user.id, scopes: user.scopes }
  } else {
    throw new AuthenticationError('Authentication failed.', { usernameOrEmail })
  }
}
