import AjvPkg, { type ErrorObject } from "ajv";
import {
  ConnectParamsSchema,
  ErrorShapeSchema,
  EventFrameSchema,
  HelloOkSchema,
  PROTOCOL_VERSION,
  RequestFrameSchema,
  ResponseFrameSchema
} from "./schema.js";
import type {
  ConnectParams,
  ErrorShape,
  EventFrame,
  HelloOk,
  RequestFrame,
  ResponseFrame
} from "./schema.js";

const ajv = new (
  AjvPkg as unknown as new (opts?: object) => import("ajv").default
)({
  allErrors: true,
  strict: false,
  removeAdditional: false
});

export const validateConnectParams = ajv.compile<ConnectParams>(ConnectParamsSchema);
export const validateRequestFrame = ajv.compile<RequestFrame>(RequestFrameSchema);
export const validateResponseFrame = ajv.compile<ResponseFrame>(ResponseFrameSchema);
export const validateEventFrame = ajv.compile<EventFrame>(EventFrameSchema);
export const validateHelloOk = ajv.compile<HelloOk>(HelloOkSchema);
export const validateErrorShape = ajv.compile<ErrorShape>(ErrorShapeSchema);

export function formatValidationErrors(errors: ErrorObject[] | null | undefined): string {
  if (!errors) return "unknown validation error";
  return ajv.errorsText(errors, { separator: "; " });
}

export {
  PROTOCOL_VERSION,
  ConnectParamsSchema,
  HelloOkSchema,
  RequestFrameSchema,
  ResponseFrameSchema,
  EventFrameSchema,
  ErrorShapeSchema
};

export type { ConnectParams, HelloOk, RequestFrame, ResponseFrame, EventFrame, ErrorShape };
