import { User, NewUser, UserRole } from '@argoncs/types'
import { NotFoundError, ForbiddenError, UnauthorizedError, ConflictError } from 'http-errors-enhanced'
import { mongoDB, MongoServerError, ObjectId } from '../../../common/src'
import { randomBytes, pbkdf2 } from 'node:crypto'

import { promisify } from 'node:util'

import { emailClient } from '../connections/email.connections'

const randomBytesAsync = promisify(randomBytes)
const pbkdf2Async = promisify(pbkdf2)

type UserDB = Omit<User, 'id'> & { _id?: ObjectId }

const userCollection = mongoDB.collection<UserDB>('users')

export async function registerUser (newUser: NewUser): Promise<{ userId: string, email: string }> {
  const salt = (await randomBytesAsync(32)).toString('base64')
  const hash = (await pbkdf2Async(newUser.password, salt, 100000, 512, 'sha512')).toString('base64')
  const user: UserDB = {
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
  const user = await userCollection.findOne({ _id: new ObjectId(userId) })
  console.log(userId)
  if (user == null) {
    throw new NotFoundError('No user found with the given ID.', { userId })
  }
  const { _id, ...userContent } = user
  return { ...userContent, id: _id.toString() }
}

export async function userIdExists (userId: string): Promise<boolean> {
  return Boolean(userCollection.countDocuments({ _id: new ObjectId(userId) }))
}

export async function updateUser (userId: string, user: Partial<NewUser>): Promise<{ modified: boolean }> {
  const { matchedCount, modifiedCount } = await userCollection.updateOne({ _id: new ObjectId(userId) }, { $set: user })
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
  const { modifiedCount, matchedCount } = await userCollection.updateOne({ _id: new ObjectId(userId) }, {
    $set: {
      verifiedEmail: email
    }
  })

  if (matchedCount === 0) {
    throw new NotFoundError('No user found with the given ID.', { userId })
  }

  return { modified: modifiedCount > 0 }
}

export async function authenticateUser (usernameOrEmail: string, password: string): Promise<{ userId: string }> {
  const user = await userCollection.findOne({ $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }] })
  if (user == null) {
    throw new UnauthorizedError('Failed to authenticate user with the given credential.', { usernameOrEmail })
  }

  const hash = (await pbkdf2Async(password, user.credential.salt, 100000, 512, 'sha512')).toString('base64')
  if (hash === user.credential.hash) {
    if (user.email !== user.verifiedEmail) {
      throw new ForbiddenError('Please verify your email before logging in.', { userId: user._id })
    }
    return { userId: user._id.toString() }
  } else {
    throw new UnauthorizedError('Failed to authenticate user with the given credential.', { usernameOrEmail })
  }
}
