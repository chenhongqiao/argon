import { User, NewUser, CosmosDB, ConflictError, AzureError, NotFoundError, AuthenticationError, AuthorizationError, UserRole } from '@cocs/shared'
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
    role: UserRole.User,
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
      throw new ConflictError('Username exists.', { user })
    } else {
      throw err
    }
  }

  try {
    await emailIndexContainer.items.create(emailIndex)
  } catch (err) {
    if (err.code === 409) {
      await usernameIndexContainer.item(user.username, user.username).delete()
      throw new ConflictError('Email exists.', { user })
    } else {
      throw err
    }
  }

  const created = await usersContainer.items.create(user)
  if (created.resource == null) {
    await usernameIndexContainer.item(user.username, user.username).delete().catch()
    await emailIndexContainer.item(user.email, user.email).delete().catch()
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
    throw new NotFoundError('User not found.', { userId })
  } else {
    throw new AzureError('Unexpected CosmosDB return.', fetched)
  }
}

export async function userIdExists (userId: string): Promise<boolean> {
  const userItem = usersContainer.item(userId, userId)
  const fetched = await userItem.read<User>()
  if (fetched.resource != null) {
    return true
  } if (fetched.statusCode === 404) {
    return false
  } else {
    throw new AzureError('Unexpected CosmosDB return.', fetched)
  }
}

export async function updateUser (user: User, userId: string): Promise<{ userId: string }> {
  const userWithId = { ...user, userId }
  const userItem = usersContainer.item(userId, userId)
  const updated = await userItem.replace(userWithId)
  if (updated.resource != null) {
    return { userId: updated.resource.id }
  } if (updated.statusCode === 404) {
    throw new NotFoundError('User not found.', { userId })
  } else {
    throw new AzureError('Unexpected CosmosDB return.', updated)
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
    throw new NotFoundError('User not found.', { userId })
  }
  const user = fetchedUser.resource
  if (user.email === user.verifiedEmail) {
    return { userId: user.id, statusChanged: false }
  }

  const verificationItem = verificationsContainer.item(verificationId, userId)
  const fetchedVerification = await verificationItem.read<EmailVerification>()
  if (fetchedVerification.resource == null || fetchedVerification.resource.userId !== user.id) {
    throw new AuthenticationError('Invalid verification.', { token: verificationId })
  }
  user.verifiedEmail = fetchedVerification.resource.email
  const replaced = await userItem.replace(user)
  if (replaced.resource == null) {
    throw new AzureError('Unexpected CosmosDB return.', replaced)
  }
  await verificationItem.delete()
  return { userId: replaced.resource.id, statusChanged: true }
}

export async function authenticateUser (usernameOrEmail: string, password: string): Promise<{userId: string, scopes: Record<string, string[]>, role: UserRole}> {
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
      throw new AuthorizationError('Please verify your email first.', { userId })
    }
    return { userId: user.id, scopes: user.scopes, role: user.role }
  } else {
    throw new AuthenticationError('Authentication failed.', { usernameOrEmail })
  }
}
