import { Constraints } from '../types/judger/grade.types'

export enum SubmissionLang {
  C='C',
  CPP='C++',
}

interface LanguageConfig {
  srcFile: string
  binaryFile: string
  displayName: string
  compileCommand: string
  executeCommand: string
  constrains: Constraints
}

export const languageConfigs: Record<SubmissionLang, LanguageConfig> = {
  [SubmissionLang.CPP]: {
    srcFile: 'program.cpp',
    binaryFile: 'a.out',
    displayName: 'C++17',
    compileCommand:
      '/usr/bin/g++ -o2 -w -fmax-errors=3 -std=c++17 {src_path} -lm -o {binary_path}',
    executeCommand: '{exe_path}',
    constrains: {
      time: 1000,
      memory: 65536,
      totalStorage: 65536
    }
  },
  [SubmissionLang.C]: {
    srcFile: 'program.c',
    binaryFile: 'a.out',
    displayName: 'C11',
    compileCommand:
      '/usr/bin/gcc -o2 -w -fmax-errors=3 -std=c11 {src_path} -lm -o {binary_path}',
    executeCommand: '{exe_path}',
    constrains: {
      time: 1000,
      memory: 65536,
      totalStorage: 65536
    }
  }
}
