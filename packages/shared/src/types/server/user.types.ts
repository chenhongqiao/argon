import { Static, Type } from '@sinclair/typebox'

export const NewUserSchema = Type.Object({
  name: Type.String(),
  email: Type.String(),
  password: Type.String(),
  username: Type.String()
}, { additionalProperties: false })
export type NewUser = Static<typeof NewUserSchema>

export const UserSchema = Type.Intersect([Type.Omit(NewUserSchema, ['password']), Type.Object({
  password: Type.Object({
    hash: Type.String(),
    salt: Type.String()
  }),
  superAdmin: Type.Boolean(),
  id: Type.String(),
  verifiedEmail: Type.Union([Type.String(), Type.Null()]),
  scopes: Type.Record(Type.String(), Type.Array(Type.String()))
})])
export type User = Static<typeof UserSchema>

export const PublicUserProfileSchema = Type.Pick(UserSchema, ['username', 'name'])
export type PublicUserProfile = Static<typeof PublicUserProfileSchema>

export const PrivateUserProfileSchema = Type.Omit(UserSchema, ['password'])
export type PrivateUserProfile = Static<typeof PrivateUserProfileSchema>
