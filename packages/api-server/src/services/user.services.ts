import { type User, type NewUser, UserRole } from '@argoncs/types'
import { NotFoundError, UnauthorizedError, ConflictError } from 'http-errors-enhanced'
import { emailVerificationCollection, MongoServerError, userCollection } from '@argoncs/common'
import { randomBytes, pbkdf2 } from 'node:crypto'

import { promisify } from 'node:util'

import { longNanoid, nanoid } from '../utils/nanoid.utils.js'

import { sendEmail } from './emails.services.js'
const randomBytesAsync = promisify(randomBytes)
const pbkdf2Async = promisify(pbkdf2)

export async function registerUser ({ newUser }: { newUser: NewUser }): Promise<{ userId: string, email: string }> {
  const salt = (await randomBytesAsync(32)).toString('base64')
  const hash = (await pbkdf2Async(newUser.password, salt, 100000, 512, 'sha512')).toString('base64')
  const userId = await nanoid()
  const user: User = {
    id: userId,
    name: newUser.name,
    newEmail: newUser.email,
    credential: {
      salt,
      hash
    },
    role: UserRole.User,
    username: newUser.username,
    school: newUser.school,
    country: newUser.country,
    region: newUser.region,
    year: newUser.year,
    scopes: {},
    teams: {}
  }

  try {
    await userCollection.insertOne(user)
    return { userId, email: newUser.email }
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

export async function fetchUserById ({ userId }: { userId: string }): Promise<User> {
  const user = await userCollection.findOne({ id: userId })
  if (user == null) {
    throw new NotFoundError('User not found')
  }

  return user
}
export async function fetchUserByUsername ({ username }: { username: string }): Promise<User> {
  const user = await userCollection.findOne({ username })
  if (user == null) {
    throw new NotFoundError('User not found')
  }

  return user
}

export async function userIdExists ({ userId }: { userId: string }): Promise<boolean> {
  return Boolean(await userCollection.countDocuments({ id: userId }))
}

export async function usernameExists ({ username }: { username: string }): Promise<boolean> {
  return Boolean(await userCollection.countDocuments({ username }))
}

export async function emailExists ({ email }: { email: string }): Promise<boolean> {
  return Boolean(await userCollection.countDocuments({ email }))
}

export async function updateUser ({ userId, user }: { userId: string, user: Partial<NewUser> }): Promise<{ modified: boolean }> {
  const { matchedCount, modifiedCount } = await userCollection.updateOne({ id: userId }, { $set: user })
  if (matchedCount === 0) {
    throw new NotFoundError('User not found')
  }

  return { modified: modifiedCount > 0 }
}

export async function initiateVerification ({ userId }: { userId: string }): Promise<void> {
  const user = await userCollection.findOne({ id: userId })
  if (user == null) {
    throw new NotFoundError('User not found')
  }

  const { newEmail } = user
  if (newEmail == null) {
    throw new NotFoundError('User does not have an email pending verification')
  }

  const id = await longNanoid()
  await emailVerificationCollection.insertOne({
    id,
    userId,
    email: newEmail,
    createdAt: (new Date()).getTime()
  })

  await sendEmail({ to: newEmail, template: 'confirmEmail', subject: 'Confirm your email address', values: { name: user.name, verificationLink: `https://contest.teamscode.org/email-verification/${userId}-${id}` } })
}

export async function completeVerification ({ verificationId }: { verificationId: string }): Promise<{ modified: boolean }> {
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
