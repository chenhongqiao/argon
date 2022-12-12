import { User, NewUser, NotFoundError, AuthenticationError, AuthorizationError, UserRole, ConflictError, UserDB } from '@argoncs/types'
import { mongoDB, MongoServerError } from '@argoncs/libraries'
import { randomBytes, pbkdf2 } from 'node:crypto'

import { promisify } from 'node:util'

import { emailClient } from '../connections/email.connections'

const randomBytesAsync = promisify(randomBytes)
const pbkdf2Async = promisify(pbkdf2)

const userCollection = mongoDB.collection<UserDB>('users')
const verificationCollection = mongoDB.collection('emailVerifications')

export async function registerUser (newUser: NewUser): Promise<{ userId: string, email: string }> {
  const salt = (await randomBytesAsync(32)).toString('base64')
  const hash = (await pbkdf2Async(newUser.password, salt, 100000, 512, 'sha512')).toString('base64')
  const user: Omit<User, '_id'> = {
    name: newUser.name,
    email: newUser.email,
    password: {
      salt,
      hash
    },
    role: UserRole.User,
    verifiedEmail: null,
    username: newUser.username,
    scopes: {}
  }

  try {
    const { insertedId } = await userCollection.insertOne(user)
    return { userId: insertedId.toString(), email: user.email }
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
  const user = await userCollection.findOne({ _id: userId })
  if (user == null) {
    throw new NotFoundError('User not found.', { userId })
  }
  return user
}

export async function userIdExists (userId: string): Promise<boolean> {
  return Boolean(userCollection.countDocuments({ _id: userId }))
}

export async function updateUser (user: User, userId: string): Promise<{ userId: string }> {
  const { upsertedId, matchedCount } = await userCollection.updateOne({ _id: userId }, { $set: user })
  if (matchedCount === 0) {
    throw new NotFoundError('User not found.', { userId })
  }
  return { userId: upsertedId.toString() }
}

interface EmailVerification {
  _id: string
  userId: string
  email: string
  secret: string
  createdAt: Date
}

export async function initiateVerification (userId: string, email: string): Promise<void> {
  const secret = (await randomBytesAsync(32)).toString('hex')
  const verification: Omit<EmailVerification, '_id'> = { userId, email, createdAt: new Date(), secret }
  const { insertedId } = await verificationCollection.insertOne(verification)
  const verificationEmail: emailClient.MailDataRequired = {
    to: verification.email,
    from: { name: 'Argon Contest Server', email: 'noreply@argoncs.io' },
    subject: 'Please verify your email',
    html: `User: ${verification.userId}<br>Token: ${insertedId.toString()}${secret}`
  }

  await emailClient.send(verificationEmail)
}

export async function completeVerification (userId: string, token: string): Promise<{ userId: string, statusChanged: boolean }> {
  const user = await userCollection.findOne({ _id: userId })
  if (user == null) {
    throw new NotFoundError('User does not exist.', { userId })
  }
  if (user.email === user.verifiedEmail) {
    return { userId: user._id, statusChanged: false }
  }

  const id = token.slice(0, 24)
  const secret = token.slice(24)

  const verification = await verificationCollection.findOne<EmailVerification>({ _id: id })
  if (verification == null || verification.secret !== secret) {
    throw new AuthenticationError('Invalid verification.', { userId, token })
  }
  user.verifiedEmail = verification?.email
  const { upsertedId } = await userCollection.updateOne({ _id: userId }, { $set: user })
  return { userId: upsertedId.toString(), statusChanged: true }
}

export async function authenticateUser (usernameOrEmail: string, password: string): Promise<{ userId: string, scopes: Record<string, string[]>, role: UserRole }> {
  const user = await userCollection.findOne({ $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }] })
  if (user == null) {
    throw new AuthenticationError('Authentication failed.', { usernameOrEmail })
  }

  const hash = (await pbkdf2Async(password, user.password.salt, 100000, 512, 'sha512')).toString('base64')
  if (hash === user.password.hash) {
    if (user.email !== user.verifiedEmail) {
      throw new AuthorizationError('Please verify your email first.', { userId: user._id })
    }
    return { userId: user._id, scopes: user.scopes, role: user.role }
  } else {
    throw new AuthenticationError('Authentication failed.', { usernameOrEmail })
  }
}
