import { User, NewUser, UserRole, UserSession, AuthenticationProfile } from '@argoncs/types'
import { NotFoundError, ForbiddenError, UnauthorizedError, ConflictError } from 'http-errors-enhanced'
import { mongoDB, MongoServerError } from '@argoncs/common'
import { randomBytes, pbkdf2 } from 'node:crypto'

import { promisify } from 'node:util'

import { nanoid } from '../utils/nanoid.utils'

import { emailClient } from '../connections/email.connections'
import { fetchCache, setCache } from './cache.services'

const randomBytesAsync = promisify(randomBytes)
const pbkdf2Async = promisify(pbkdf2)

const userCollection = mongoDB.collection<User>('users')
const sessionCollection = mongoDB.collection<UserSession>('sessions')

export async function registerUser (newUser: NewUser): Promise<{ userId: string, email: string }> {
  const salt = (await randomBytesAsync(32)).toString('base64')
  const hash = (await pbkdf2Async(newUser.password, salt, 100000, 512, 'sha512')).toString('base64')
  const userId = await nanoid()
  const user: User = {
    id: userId,
    name: newUser.name,
    email: newUser.email,
    credential: {
      salt,
      hash
    },
    role: UserRole.User,
    verifiedEmail: null,
    username: newUser.username,
    scopes: {}
  }

  try {
    await userCollection.insertOne(user)
    return { userId, email: user.email }
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000 && err.keyValue != null) {
      if (err.keyValue.email !== undefined) {
        throw new ConflictError('Email taken by another user.', { user })
      } else if (err.keyValue.username !== undefined) {
        throw new ConflictError('Username taken by another user.', { user })
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
    throw new NotFoundError('No user found with the given ID.', { userId })
  }

  return user
}

export async function userIdExists (userId: string): Promise<boolean> {
  return Boolean(userCollection.countDocuments({ id: userId }))
}

export async function updateUser (userId: string, user: Partial<NewUser>): Promise<{ modified: boolean }> {
  const { matchedCount, modifiedCount } = await userCollection.updateOne({ id: userId }, { $set: user })
  if (matchedCount === 0) {
    throw new NotFoundError('No user found with the given ID.', { userId })
  }

  return { modified: modifiedCount > 0 }
}

export async function initiateVerification (email: string, token: string): Promise<void> {
  const verificationEmail: emailClient.MailDataRequired = {
    to: email,
    from: { name: 'Argon Contest Server', email: process.env.EMAIL_SENDER_ADDRESS ?? '' },
    subject: '[ArgonCS] Please Verify Your Email',
    html: `Token: ${token}`
  }

  await emailClient.send(verificationEmail)
}

export async function completeVerification (userId: string, email: string): Promise<{ modified: boolean }> {
  const { modifiedCount, matchedCount } = await userCollection.updateOne({ id: userId }, {
    $set: {
      verifiedEmail: email
    }
  })

  if (matchedCount === 0) {
    throw new NotFoundError('No user found with the given ID.', { userId })
  }

  return { modified: modifiedCount > 0 }
}

export async function authenticateUser (usernameOrEmail: string, password: string, loginIP: string, userAgent: string): Promise<{ userId: string, sessionId: string }> {
  const user = await userCollection.findOne({ $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }] })
  if (user == null) {
    throw new UnauthorizedError('Failed to authenticate user with the given credential.', { usernameOrEmail })
  }
  const { id: userId } = user

  const hash = (await pbkdf2Async(password, user.credential.salt, 100000, 512, 'sha512')).toString('base64')
  if (hash === user.credential.hash) {
    if (user.email !== user.verifiedEmail) {
      throw new ForbiddenError('Please verify your email before logging in.', { userId: user.id })
    }
    const sessionId = await nanoid()
    await sessionCollection.insertOne({ id: sessionId, userId, userAgent, loginIP })
    return { userId, sessionId }
  } else {
    throw new UnauthorizedError('Failed to authenticate user with the given credential.', { usernameOrEmail })
  }
}

export async function fetchSession (sessionId: string): Promise<UserSession> {
  const cache = await fetchCache<UserSession>(`session:${sessionId}`)
  if (cache != null) {
    return cache
  }

  const session = await sessionCollection.findOne({ id: sessionId })
  if (session == null) {
    throw new NotFoundError('No session found with the given ID.', { sessionId })
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
    throw new NotFoundError('No user found with the given ID.', { userId })
  }

  const authProfile: AuthenticationProfile = {
    role: user.role,
    scopes: user.scopes,
    id: user.id
  }

  await setCache(`auth-profile:${userId}`, authProfile)

  return authProfile
}
