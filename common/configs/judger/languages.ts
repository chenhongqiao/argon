enum SubmissionLang {
  C,
  CPP,
}

interface SubmissionConfig {
  srcFile: string;
  binaryFile: string;
  displayName: string;
  compileCommand: string;
  executeCommand: string;
}

const languageConfigs: Record<SubmissionLang, SubmissionConfig> = {
  [SubmissionLang.CPP]: {
    srcFile: 'program.cpp',
    binaryFile: 'a.out',
    displayName: 'C++',
    compileCommand:
      '/usr/bin/g++ -DTEAMSCODE -O2 -w -fmax-errors=3 -std=c++17 {src_path} -lm -o {binary_path}',
    executeCommand: '{exe_path}',
  },
  [SubmissionLang.C]: {
    srcFile: 'program.c',
    binaryFile: 'a.out',
    displayName: 'C',
    compileCommand:
      '/usr/bin/gcc -DTEAMSCODE -O2 -w -fmax-errors=3 -std=c11 {src_path} -lm -o {binary_path}',
    executeCommand: '{exe_path}',
  },
};

export {SubmissionLang, languageConfigs};
