"use strict";
exports.__esModule = true;
exports.ErrorCode = void 0;
var ErrorCode;
(function (ErrorCode) {
    ErrorCode[ErrorCode["NotFound"] = -1] = "NotFound";
    ErrorCode[ErrorCode["Conflict"] = -2] = "Conflict";
    ErrorCode[ErrorCode["AccessDenied"] = -3] = "AccessDenied";
})(ErrorCode || (ErrorCode = {}));
exports.ErrorCode = ErrorCode;
