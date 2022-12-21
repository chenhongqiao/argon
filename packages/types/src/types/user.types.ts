import { Static, Type } from '@sinclair/typebox'

export const NewUserSchema = Type.Object({
  name: Type.String(),
  email: Type.String(),
  password: Type.String(),
  username: Type.String()
}, { additionalProperties: false })
export type NewUser = Static<typeof NewUserSchema>

export enum UserRole {
  User = 'User',
  Admin = 'Admin',
  Judger = 'Judger'
}

export const UserSchema = Type.Intersect([Type.Omit(NewUserSchema, ['password']), Type.Object({
  credential: Type.Object({
    hash: Type.String(),
    salt: Type.String()
  }),
  role: Type.Enum(UserRole),
  id: Type.String(),
  verifiedEmail: Type.Union([Type.String(), Type.Null()]),
  scopes: Type.Record(Type.String(), Type.Array(Type.String()))
})])
export type User = Static<typeof UserSchema>

export const PublicUserProfileSchema = Type.Pick(UserSchema, ['username', 'name', 'id'])
export type PublicUserProfile = Static<typeof PublicUserProfileSchema>

export const PrivateUserProfileSchema = Type.Omit(UserSchema, ['credential'])
export type PrivateUserProfile = Static<typeof PrivateUserProfileSchema>
