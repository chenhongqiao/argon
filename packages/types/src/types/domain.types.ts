import { Static, Type } from '@sinclair/typebox'

export const NewDomainSchema = Type.Object({
  name: Type.String(),
  description: Type.String()
})
export type NewDomain = Static<typeof NewDomainSchema>

export const DomainSchema = Type.Intersect([NewDomainSchema, Type.Object({
  id: Type.String(),
  members: Type.Array(Type.String())
})])
export type Domain = Static<typeof DomainSchema>
