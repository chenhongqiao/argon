enum SandboxStatus {
  Succeeded,
  MemoryExceeded,
  TimeExceeded,
  RuntimeError,
  SystemError,
}

interface Constraints {
  memory?: number;
  time?: number;
  wallTime?: number;
  totalStorage?: number;
  processes?: number;
}

interface SandboxTask {
  command: string;
  inputPath?: string;
  outputPath?: string;
  constrains: Constraints;
  env?: string;
}

interface SandboxTaskResult {
  status: SandboxStatus;
  message: string;
  memory?: number;
  time?: number;
  wallTime?: number;
  signal?: number;
}

export {SandboxTask, Constraints, SandboxTaskResult, SandboxStatus};
