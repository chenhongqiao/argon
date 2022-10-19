export class NotFoundError extends Error {
  context: Record<string, any>

  constructor (message: string, context: object) {
    super(message)

    this.context = context

    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

export class ConflictError extends Error {
  context: Record<string, any>

  constructor (message: string, context: object) {
    super(message)

    this.context = context

    Object.setPrototypeOf(this, ConflictError.prototype)
  }
}

export class AuthorizationError extends Error {
  context: Record<string, any>

  constructor (message: string, context: object) {
    super(message)

    this.context = context

    Object.setPrototypeOf(this, AuthorizationError.prototype)
  }
}

export class AuthenticationError extends Error {
  context: Record<string, any>

  constructor (message: string, context: object) {
    super(message)

    this.context = context

    Object.setPrototypeOf(this, AuthenticationError.prototype)
  }
}

export class AzureError extends Error {
  context: Record<string, any>;

  constructor (message: string, context: object) {
    super(message)

    this.context = context

    Object.setPrototypeOf(this, AzureError.prototype)
  }
}

export class DataError extends Error {
  context: Record<string, any>;

  constructor (message: string, context: object) {
    super(message)

    this.context = context

    Object.setPrototypeOf(this, DataError.prototype)
  }
}
