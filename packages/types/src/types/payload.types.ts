import { UserRole } from './user.types'

export enum JWTPayloadType {
  Identification = 'Identification',
  Upload = 'Upload',
  EmailVerification = 'EmailVerification'
}

interface IdentificationPayload {
  type: JWTPayloadType.Identification
  userId: string
  scopes: Record<string, string[]>
  role: UserRole
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
