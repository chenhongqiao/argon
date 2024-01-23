import { type Static, Type } from '@sinclair/typebox'

export const UserPrivateSessionSchema = Type.Object({
  id: Type.String(),
  token: Type.String(),
  userId: Type.String(),
  userAgent: Type.String(),
  loginIP: Type.String()
})
export type UserPrivateSession = Static<typeof UserPrivateSessionSchema>

export const UserPublicSessionSchema = Type.Omit(UserPrivateSessionSchema, ['token'])
export type UserPublicSession = Static<typeof UserPublicSessionSchema>

export interface EmailVerification {
  id: string
  userId: string
  email: string
  createdAt: number
}

export const UserLoginSchema = Type.Object({ usernameOrEmail: Type.String(), password: Type.String() })
export type UserLogin = Static<typeof UserLoginSchema>
