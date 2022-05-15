interface Constraints {
  memory?: number;
  time?: number;
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
  status: string;
  message?: string;
  memory?: string;
  time?: string;
}

export {SandboxTask, Constraints, SandboxTaskResult};
