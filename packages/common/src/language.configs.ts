export const languageConfigs = {
  'Java': {
    srcFile: 'Solution.java',
    binaryFile: 'Solution.class',
    displayName: 'Java',
    compileCommand: '/usr/lib/jvm/java-8-openjdk-amd64/bin/javac {src_path}',
    executeCommand: '/usr/lib/jvm/java-8-openjdk-amd64/bin/java Solution',
    compileConstraints: {
      time: 5000,
      memory: 262144,
      totalStorage: 262144,
      processes: 20
    },
    runConstraints: {
      processes: 20
    }
  },
  'C++': {
    srcFile: 'program.cpp',
    binaryFile: 'a.out',
    displayName: 'C++20',
    compileCommand: '/usr/bin/g++ -Wall -static -O2 --std=c++20 {src_path} -lm -o {binary_path}',
    executeCommand: './{binary_path}',
    compileConstraints: {
      time: 5000,
      memory: 262144,
      totalStorage: 262144,
      processes: 5
    },
    runConstraints: {
      processes: 1
    }
  },
  Python: {
    srcFile: 'program.py',
    binaryFile: 'run.py',
    displayName: 'Python 3',
    compileCommand: '/usr/bin/cp {src_path} {binary_path}',
    executeCommand: '/usr/bin/pypy3 {binary_path}',
    compileConstraints: {
      time: 1000,
      memory: 262144,
      totalStorage: 262144,
      processes: 5
    },
    runConstraints: {
      processes: 1
    }
  }
}
