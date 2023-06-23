import { Static, Type } from '@sinclair/typebox'
import { PublicUserProfileSchema } from './user.types.js'

export const NewDomainSchema = Type.Object({
  name: Type.String(),
  description: Type.String()
}, { additionalProperties: false })
export type NewDomain = Static<typeof NewDomainSchema>

export const DomainSchema = Type.Intersect([NewDomainSchema, Type.Object({
  id: Type.Optional(Type.String()),
  members: Type.Array(Type.String())
})])
export type Domain = Static<typeof DomainSchema>

export const DomainMembersSchema = Type.Array(PublicUserProfileSchema)
export type DomainMembers = Static<typeof DomainMembersSchema>
