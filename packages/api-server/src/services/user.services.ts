import { type User, type NewUser, UserRole, type UserSession, type AuthenticationProfile } from '@argoncs/types'
import { NotFoundError, UnauthorizedError, ConflictError } from 'http-errors-enhanced'
import { emailVerificationCollection, MongoServerError, sessionCollection, userCollection } from '@argoncs/common'
import { randomBytes, pbkdf2 } from 'node:crypto'

import { promisify } from 'node:util'

import { longNanoId, nanoid } from '../utils/nanoid.utils.js'

import { emailClient } from '../connections/email.connections.js'
import { fetchCache, setCache } from './cache.services.js'

const randomBytesAsync = promisify(randomBytes)
const pbkdf2Async = promisify(pbkdf2)

export async function registerUser (newUser: NewUser): Promise<{ userId: string, email: string }> {
  const salt = (await randomBytesAsync(32)).toString('base64')
  const hash = (await pbkdf2Async(newUser.password, salt, 100000, 512, 'sha512')).toString('base64')
  const userId = await nanoid()
  const user: User = {
    id: userId,
    name: newUser.name,
    email: '',
    newEmail: newUser.email,
    credential: {
      salt,
      hash
    },
    role: UserRole.User,
    username: newUser.username,
    scopes: {},
    teams: {}
  }

  try {
    await userCollection.insertOne(user)
    return { userId, email: user.email }
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000 && err.keyValue != null) {
      if (err.keyValue.email !== undefined) {
        throw new ConflictError('Email taken by another user')
      } else if (err.keyValue.username !== undefined) {
        throw new ConflictError('Username taken by another user')
      } else {
        throw err
      }
    } else {
      throw err
    }
  }
}

export async function fetchUser (userId: string): Promise<User> {
  const user = await userCollection.findOne({ id: userId })
  if (user == null) {
    throw new NotFoundError('User not found')
  }

  return user
}

export async function userIdExists (userId: string): Promise<boolean> {
  return Boolean(userCollection.countDocuments({ id: userId }))
}

export async function updateUser (userId: string, user: Partial<NewUser>): Promise<{ modified: boolean }> {
  const { matchedCount, modifiedCount } = await userCollection.updateOne({ id: userId }, { $set: user })
  if (matchedCount === 0) {
    throw new NotFoundError('User not found')
  }

  return { modified: modifiedCount > 0 }
}

export async function initiateVerification (userId: string): Promise<void> {
  const user = await userCollection.findOne({ id: userId })
  if (user == null) {
    throw new NotFoundError('User not found')
  }

  const { newEmail } = user
  if (newEmail == null) {
    throw new NotFoundError('User does not have an email pending verification')
  }

  const id = await longNanoId()
  await emailVerificationCollection.insertOne({
    id,
    userId,
    email: newEmail,
    createdAt: (new Date()).getTime()
  })

  const verificationEmail: emailClient.MailDataRequired = {
    to: newEmail,
    from: { name: 'Argon Contest Server', email: process.env.EMAIL_SENDER_ADDRESS ?? '' },
    subject: '[ArgonCS] Please Verify Your Email',
    html: `Token: ${id}`
  }

  await emailClient.send(verificationEmail)
}

export async function completeVerification (verificationId: string): Promise<{ modified: boolean }> {
  const verification = await emailVerificationCollection.findOneAndDelete({ id: verificationId })
  if (verification.value == null) {
    throw new UnauthorizedError('Invalid verification token')
  }

  const { userId, email } = verification.value

  const { modifiedCount, matchedCount } = await userCollection.updateOne({ id: userId }, {
    $set: {
      email
    },
    $unset: {
      newEmail: ''
    }
  })

  if (matchedCount === 0) {
    throw new NotFoundError('User not found')
  }

  return { modified: modifiedCount > 0 }
}

export async function authenticateUser (usernameOrEmail: string, password: string, loginIP: string, userAgent: string): Promise<{ userId: string, sessionId: string }> {
  console.log(userCollection)
  const user = await userCollection.findOne({ $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }] })
  if (user == null) {
    throw new UnauthorizedError('Authentication failed')
  }
  const { id: userId } = user

  const hash = (await pbkdf2Async(password, user.credential.salt, 100000, 512, 'sha512')).toString('base64')
  if (hash === user.credential.hash) {
    const sessionId = await nanoid()
    await sessionCollection.insertOne({ id: sessionId, userId, userAgent, loginIP })
    return { userId, sessionId }
  } else {
    throw new UnauthorizedError('Authentication failed')
  }
}

export async function fetchSession (sessionId: string): Promise<UserSession> {
  const cache = await fetchCache<UserSession>(`session:${sessionId}`)
  if (cache != null) {
    return cache
  }

  const session = await sessionCollection.findOne({ id: sessionId })
  if (session == null) {
    throw new NotFoundError('Session not found')
  }

  await setCache(`session:${sessionId}`, session)

  return session
}

export async function fetchAuthenticationProfile (userId: string): Promise<AuthenticationProfile> {
  const cache = await fetchCache<AuthenticationProfile>(`auth-profile:${userId}`)
  if (cache != null) {
    return cache
  }

  const user = await userCollection.findOne({ id: userId })
  if (user == null) {
    throw new NotFoundError('User not found')
  }

  const authProfile: AuthenticationProfile = {
    role: user.role,
    scopes: user.scopes,
    id: user.id,
    teams: user.teams,
    email: user.email
  }

  await setCache(`auth-profile:${userId}`, authProfile)

  return authProfile
}
