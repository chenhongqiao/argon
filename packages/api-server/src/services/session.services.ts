import { type UserSession, type AuthenticationProfile } from '@argoncs/types'
import { NotFoundError, UnauthorizedError } from 'http-errors-enhanced'
import { sessionCollection, userCollection } from '@argoncs/common'
import { pbkdf2 } from 'node:crypto'

import { promisify } from 'node:util'

import { nanoid } from '../utils/nanoid.utils.js'

import { SESSION_CACHE_KEY, deleteCache, fetchCache, setCache } from './cache.services.js'

const pbkdf2Async = promisify(pbkdf2)

export async function authenticateUser ({ usernameOrEmail, password, loginIP, userAgent }: { usernameOrEmail: string, password: string, loginIP: string, userAgent: string }): Promise<{ userId: string, sessionId: string, token: string }> {
  const user = await userCollection.findOne({ $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }] })
  if (user == null) {
    throw new UnauthorizedError('Authentication failed')
  }
  const { id: userId } = user

  const hash = (await pbkdf2Async(password, user.credential.salt, 100000, 512, 'sha512')).toString('base64')
  if (hash === user.credential.hash) {
    const sessionId = await nanoid()
    const token = await nanoid()
    await sessionCollection.insertOne({ id: sessionId, token, userId, userAgent, loginIP })
    return { userId, sessionId, token }
  } else {
    throw new UnauthorizedError('Authentication failed')
  }
}

export async function fetchSessionByToken ({ sessionToken }: { sessionToken: string }): Promise<UserSession> {
  const cache = await fetchCache<UserSession>({ key: `${SESSION_CACHE_KEY}:${sessionToken}` })
  if (cache != null) {
    return cache
  }

  const session = await sessionCollection.findOne({ token: sessionToken })
  if (session == null) {
    throw new NotFoundError('Session not found')
  }

  await setCache({ key: `${SESSION_CACHE_KEY}:${sessionToken}`, data: session })

  return session
}

export async function deleteSessionByToken ({ sessionToken }: { sessionToken: string }): Promise<void> {
  const { deletedCount } = await sessionCollection.deleteOne({ token: sessionToken })

  if (deletedCount === 0) {
    throw new NotFoundError('Session not found')
  }

  await deleteCache({ key: `${SESSION_CACHE_KEY}:${sessionToken}` })
}

export async function fetchSessionById ({ sessionId }: { sessionId: string }): Promise<UserSession> {
  const session = await sessionCollection.findOne({ id: sessionId })
  if (session == null) {
    throw new NotFoundError('Session not found')
  }
  return session
}

export async function fetchUserSessions ({ userId }: { userId: string }): Promise<UserSession[]> {
  const sessions = await sessionCollection.find({ userId }).toArray()
  return sessions
}

export async function fetchAuthenticationProfile ({ userId }: { userId: string }): Promise<AuthenticationProfile> {
  const cache = await fetchCache<AuthenticationProfile>({ key: `auth-profile:${userId}` })
  if (cache != null) {
    return cache
  }

  const user = await userCollection.findOne({ id: userId }, { projection: { role: 1, scopes: 1, id: 1, teams: 1, email: 1 } })
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

  await setCache({ key: `auth-profile:${userId}`, data: authProfile })

  return authProfile
}
