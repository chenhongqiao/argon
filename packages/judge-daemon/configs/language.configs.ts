export const languageConfigs = {
  'C++': {
    srcFile: 'program.cpp',
    binaryFile: 'a.out',
    displayName: 'C++17',
    compileCommand: '/usr/bin/g++ -o2 -w -fmax-errors=3 -std=c++17 {src_path} -lm -o {binary_path}',
    executeCommand: './{binary_path}',
    constraints: {
      time: 2000,
      memory: 262144,
      totalStorage: 262144,
      processes: 5
    }
  },
  C: {
    srcFile: 'program.c',
    binaryFile: 'a.out',
    displayName: 'C11',
    compileCommand: '/usr/bin/gcc -o2 -w -fmax-errors=3 -std=c11 {src_path} -lm -o {binary_path}',
    executeCommand: './{binary_path}',
    constraints: {
      time: 2000,
      memory: 262144,
      totalStorage: 262144,
      processes: 5
    }
  },
  Python: {
    srcFile: 'program.py',
    binaryFile: 'run.py',
    displayName: 'Python 3',
    compileCommand: '/usr/bin/cp {src_path} {binary_path}',
    executeCommand: '/usr/bin/python3 {binary_path}',
    constraints: {
      time: 1000,
      memory: 10240,
      totalStorage: 10240,
      processes: 1
    }
  }
}
