import { type Static, Type } from '@sinclair/typebox'
import { type User } from './user.types.js'

export const UserSessionSchema = Type.Object({
  id: Type.String(),
  token: Type.String(),
  userId: Type.String(),
  userAgent: Type.String(),
  loginIP: Type.String()
})
export type UserSession = Static<typeof UserSessionSchema>

export type AuthenticationProfile = Pick<User, 'scopes' | 'role' | 'id' | 'teams' | 'email'>

export interface EmailVerification {
  id: string
  userId: string
  email: string
  createdAt: number
}

export const UserLoginSchema = Type.Object({ usernameOrEmail: Type.String(), password: Type.String() })
export type UserLogin = Static<typeof UserLoginSchema>
