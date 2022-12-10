import { SubmissionLang, LanguageConfig } from '@argoncs/types'

export const languageConfigs: Record<SubmissionLang, LanguageConfig> = {
  [SubmissionLang.CPP]: {
    srcFile: 'program.cpp',
    binaryFile: 'a.out',
    displayName: 'C++17',
    compileCommand:
      '/usr/bin/g++ -o2 -w -fmax-errors=3 -std=c++17 {src_path} -lm -o {binary_path}',
    executeCommand: './{binary_path}',
    constraints: {
      time: 2000,
      memory: 262144,
      totalStorage: 262144,
      processes: 5
    }
  },
  [SubmissionLang.C]: {
    srcFile: 'program.c',
    binaryFile: 'a.out',
    displayName: 'C11',
    compileCommand:
      '/usr/bin/gcc -o2 -w -fmax-errors=3 -std=c11 {src_path} -lm -o {binary_path}',
    executeCommand: './{binary_path}',
    constraints: {
      time: 2000,
      memory: 262144,
      totalStorage: 262144,
      processes: 5
    }
  }
}
