enum ErrorCode {
  NotFound = -1,
  Conflict = -2,
  AccessDenied = -3,
}

interface UseCaseError {
  status: ErrorCode;
}

export {ErrorCode, UseCaseError};
