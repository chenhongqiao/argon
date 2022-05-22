export class NotFoundError extends Error {
  resource = '';

  constructor(message: string, resource: string) {
    super(message);

    this.resource = resource;

    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends Error {
  resource = '';

  constructor(message: string, resource: string) {
    super(message);

    this.resource = resource;

    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class AzureError extends Error {
  context = {};

  constructor(message: string, context: object) {
    super(message);

    this.context = context;

    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
