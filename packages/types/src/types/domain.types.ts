import { type Static, Type } from '@sinclair/typebox'
import { UserPublicProfileSchema } from './user.types.js'

export const NewDomainSchema = Type.Object({
  name: Type.String(),
  description: Type.String(),
  path: Type.String()
}, { additionalProperties: false })
export type NewDomain = Static<typeof NewDomainSchema>

export const DomainSchema = Type.Object({
  name: Type.String(),
  description: Type.String(),
  path: Type.String(),

  id: Type.Optional(Type.String()),
  members: Type.Array(Type.String())
})
export type Domain = Static<typeof DomainSchema>

export const DomainMembersSchema = Type.Array(UserPublicProfileSchema)
export type DomainMembers = Static<typeof DomainMembersSchema>
