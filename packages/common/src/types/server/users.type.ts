import { Static, Type } from '@sinclair/typebox'

export enum UserRole {
  Admin = 'Admin',
  User = 'User'
}

export const NewUserSchema = Type.Object({
  name: Type.String(),
  email: Type.String(),
  password: Type.String(),
  username: Type.String()
}, { additionalProperties: false })
export type NewUser = Static<typeof NewUserSchema>

export const UserSchema = Type.Object({
  name: Type.String(),
  email: Type.String(),
  password: Type.Object({
    hash: Type.String(),
    salt: Type.String()
  }),
  id: Type.String(),
  emailVerified: Type.Boolean(),
  role: Type.Enum(UserRole),
  username: Type.String()
})
export type User = Static<typeof UserSchema>
