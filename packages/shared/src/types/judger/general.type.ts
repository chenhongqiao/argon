import { Static, Type } from '@sinclair/typebox'

export enum JudgerTaskType {
  Compile = 'Compile',
  Grade = 'Grade',
}

export enum SandboxStatus {
  Succeeded = 'OK',
  MemoryExceeded = 'MLE',
  TimeExceeded = 'TLE',
  RuntimeError = 'RE',
  SystemError = 'SE',
}

export const ConstraintsSchema = Type.Object({
  memory: Type.Optional(Type.Number()), // kilobytes
  time: Type.Optional(Type.Number()), // milliseconds
  wallTime: Type.Optional(Type.Number()), // milliseconds
  totalStorage: Type.Optional(Type.Number()), // kilobytes
  processes: Type.Optional(Type.Number())
}, { additionalProperties: false })
export type Constraints = Static<typeof ConstraintsSchema>

export const SandboxMemoryExceededSchema = Type.Object({
  status: Type.Literal(SandboxStatus.MemoryExceeded),
  message: Type.String(),
  memory: Type.Number()
}, { additionalProperties: false })
export type SandboxMemoryExceeded = Static<typeof SandboxMemoryExceededSchema>

export const SandboxTimeExceededSchema = Type.Object({
  status: Type.Literal(SandboxStatus.TimeExceeded),
  message: Type.String(),
  time: Type.Number(),
  wallTime: Type.Number()
}, { additionalProperties: false })
export type SandboxTimeExceeded = Static<typeof SandboxTimeExceededSchema>

export const SandboxRuntimeErrorSchema = Type.Object({
  status: Type.Literal(SandboxStatus.RuntimeError),
  message: Type.String()
}, { additionalProperties: false })
export type SandboxRuntimeError = Static<typeof SandboxRuntimeErrorSchema>

export const SandboxSystemErrorSchema = Type.Object({
  status: Type.Literal(SandboxStatus.SystemError),
  message: Type.String()
}, { additionalProperties: false })
export type SandboxSystemError = Static<typeof SandboxSystemErrorSchema>
