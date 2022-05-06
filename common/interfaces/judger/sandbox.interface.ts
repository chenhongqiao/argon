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
  metaPath: string;
  constrains: Constraints;
}

interface ExecResult {
  status: string;
  message?: string;
  memory: string;
  time: string;
}

export {SandboxTask, Constraints, ExecResult};
