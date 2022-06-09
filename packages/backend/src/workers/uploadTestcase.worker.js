const path = require('path');

require('ts-node').register({ swc: true });
require(path.resolve(__dirname, 'uploadTestcase.worker.ts'));
