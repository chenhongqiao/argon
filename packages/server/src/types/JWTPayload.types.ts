export enum JWTPayloadType {
  EmailVerification = 'EmailVerification'
}

export interface EmailVerification {
  type: JWTPayloadType.EmailVerification
  userID: string
}
