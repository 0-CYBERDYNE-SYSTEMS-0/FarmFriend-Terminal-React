import { type Static, Type } from "@sinclair/typebox";

const NonEmptyString = Type.String({ minLength: 1 });

export const PROTOCOL_VERSION = 1;

export const ConnectParamsSchema = Type.Object(
  {
    minProtocol: Type.Integer({ minimum: 1 }),
    maxProtocol: Type.Integer({ minimum: 1 }),
    client: Type.Object(
      {
        name: NonEmptyString,
        version: NonEmptyString,
        platform: NonEmptyString,
        mode: NonEmptyString,
        instanceId: Type.Optional(NonEmptyString)
      },
      { additionalProperties: false }
    ),
    caps: Type.Optional(Type.Array(NonEmptyString)),
    auth: Type.Optional(
      Type.Object(
        {
          token: Type.Optional(Type.String()),
          password: Type.Optional(Type.String())
        },
        { additionalProperties: false }
      )
    ),
    locale: Type.Optional(Type.String()),
    userAgent: Type.Optional(Type.String())
  },
  { additionalProperties: false }
);

export const ErrorShapeSchema = Type.Object(
  {
    code: NonEmptyString,
    message: NonEmptyString,
    details: Type.Optional(Type.Unknown())
  },
  { additionalProperties: false }
);

export const RequestFrameSchema = Type.Object(
  {
    type: Type.Literal("req"),
    id: NonEmptyString,
    method: NonEmptyString,
    params: Type.Optional(Type.Unknown())
  },
  { additionalProperties: false }
);

export const ResponseFrameSchema = Type.Object(
  {
    type: Type.Literal("res"),
    id: NonEmptyString,
    ok: Type.Boolean(),
    payload: Type.Optional(Type.Unknown()),
    error: Type.Optional(ErrorShapeSchema)
  },
  { additionalProperties: false }
);

export const EventFrameSchema = Type.Object(
  {
    type: Type.Literal("evt"),
    event: NonEmptyString,
    seq: Type.Integer({ minimum: 0 }),
    payload: Type.Optional(Type.Unknown())
  },
  { additionalProperties: false }
);

export const HelloOkSchema = Type.Object(
  {
    type: Type.Literal("hello-ok"),
    protocol: Type.Integer({ minimum: 1 }),
    server: Type.Object(
      {
        version: NonEmptyString,
        commit: Type.Optional(NonEmptyString),
        host: Type.Optional(NonEmptyString),
        connId: NonEmptyString
      },
      { additionalProperties: false }
    ),
    features: Type.Object(
      {
        methods: Type.Array(NonEmptyString),
        events: Type.Array(NonEmptyString)
      },
      { additionalProperties: false }
    ),
    snapshot: Type.Optional(Type.Unknown()),
    policy: Type.Object(
      {
        maxPayload: Type.Integer({ minimum: 1 }),
        maxBufferedBytes: Type.Integer({ minimum: 1 }),
        tickIntervalMs: Type.Integer({ minimum: 1 })
      },
      { additionalProperties: false }
    )
  },
  { additionalProperties: false }
);

export type ConnectParams = Static<typeof ConnectParamsSchema>;
export type ErrorShape = Static<typeof ErrorShapeSchema>;
export type RequestFrame = Static<typeof RequestFrameSchema>;
export type ResponseFrame = Static<typeof ResponseFrameSchema>;
export type EventFrame = Static<typeof EventFrameSchema>;
export type HelloOk = Static<typeof HelloOkSchema>;
