import { UserRole } from '@cocs/common'

export enum JWTPayloadType {
  EmailVerification = 'EmailVerification',
  UserAuth = 'UserAuth'
}

export interface EmailVerification {
  type: JWTPayloadType.EmailVerification
  userID: string
}

export interface UserAuth {
  type: JWTPayloadType.UserAuth
  role: UserRole
  userID: string
}
