// @flow
import { type Argv, Logger } from '../../src';

export const description = 'Spawn a bunch of processes in parallel to test the logger';

export const options = {
  'num-processes': {
    alias: 'n',
    type: 'count',
    description: 'Number of processes to spawn',
  },
};

export const handler = async (argv: Argv<{}, typeof options>, logger: Logger) => {
  const { 'num-processes': numProcesses } = argv;
  logger.log(`num processes ${numProcesses}`);
  const logs = new Array(numProcesses).fill(void 0).map((_value, i) => spawnRandomLogs(names[i], logger));
  await Promise.all(logs);
};

async function spawnRandomLogs(name: string, logger: Logger) {
  const childLogger = logger.createChild(name);
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      const numLogs = Math.ceil(Math.random() * 6);
      childLogger.log(`will write ${numLogs} entries`);
      let logsWritten = 0;
      while (logsWritten < numLogs) {
        await new Promise((resolve) => {
          setTimeout(() => {
            childLogger.log(`this is log ${logsWritten}`);
            resolve();
          }, Math.ceil(Math.random() * 100));
        });
        logsWritten += 1;
      }
      childLogger.log('ended');
      childLogger.end();
      resolve();
    }, Math.ceil(Math.random() * 500));
  });
}

const names = ['tacos', 'burritos', 'churros', 'nachos'];
