import { Static, Type } from '@sinclair/typebox'
import { User } from './user.types.js'

export const UserSessionSchema = Type.Object({
  id: Type.String(),
  userId: Type.String(),
  userAgent: Type.String(),
  loginIP: Type.String()
})
export type UserSession = Static<typeof UserSessionSchema>

export type AuthenticationProfile = Pick<User, 'scopes' | 'role' | 'id' | 'teams'>

export interface EmailVerification {
  id: string
  userId: string
  email: string
  createdAt: Date
}
