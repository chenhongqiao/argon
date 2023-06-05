import { Static, Type } from '@sinclair/typebox'
import { User } from './user.types'

export enum JWTPayloadType {
  Identification = 'Identification',
  Upload = 'Upload',
  EmailVerification = 'EmailVerification'
}

interface IdentificationPayload {
  type: JWTPayloadType.Identification
  userId: string
  sessionId: string
}

interface UploadPayload {
  type: JWTPayloadType.Upload
  userId: string
  resource: Record<string, string>
}

interface EmailVerificationPayload {
  type: JWTPayloadType.EmailVerification
  userId: string
  email: string
}

export type JWTPayload = IdentificationPayload | UploadPayload | EmailVerificationPayload

export const UserSessionSchema = Type.Object({
  id: Type.String(),
  userId: Type.String(),
  userAgent: Type.String(),
  loginIP: Type.String()
})

export type UserSession = Static<typeof UserSessionSchema>

export type AuthenticationProfile = Pick<User, 'scopes' | 'role' | 'id'>
