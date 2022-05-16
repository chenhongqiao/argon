enum ServiceErrorCode {
  NotFound,
  Conflict,
  AccessDenied,
}

interface ServiceError {
  error: ServiceErrorCode;
  message?: string;
}

export {ServiceErrorCode, ServiceError};
