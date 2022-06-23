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
})

ConstraintsSchema.additionalProperties = false

export type Constraints = Static<typeof ConstraintsSchema>

export interface SandboxMemoryExceeded {
  status: SandboxStatus.MemoryExceeded
  message: string
  memory: number
}

export interface SandboxTimeExceeded {
  status: SandboxStatus.TimeExceeded
  message: string
  time: number
  wallTime: number
}

export interface SandboxRuntimeError {
  status: SandboxStatus.RuntimeError
  message: string
}

export interface SandboxSystemError {
  status: SandboxStatus.SystemError
  message: string
}
