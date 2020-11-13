// @flow
import genRandom from 'random-seed';
import { type Argv, Logger } from '../../src';

export const description = 'Spawn a bunch of processes in parallel to test the logger';

export const options = {
  'num-processes': {
    alias: 'n',
    type: 'count',
    description: 'Number of processes to spawn',
  },
  'seed': {
    type: 'string',
    description: 'A seed to use for random number generation',
  },
};

export const handler = async (argv: Argv<{}, typeof options>, logger: Logger) => {
  const { 'num-processes': numProcesses, seed } = argv;
  const random = genRandom.create(seed);
  logger.log(`num processes ${numProcesses}`);
  const logs = new Array(numProcesses).fill(void 0).map((_value, i) => spawnRandomLogs(names[i], logger, random));
  const ret = await Promise.all(logs);
  logger.log(`done ${JSON.stringify(ret)}`);
};

async function spawnRandomLogs(name: string, logger: Logger, random: typeof genRandom) {
  const childLogger = logger.createChild(name);
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      const numLogs = random.intBetween(2, 6);
      let logsWritten = 0;
      while (logsWritten <= numLogs) {
        await new Promise((resolve) => {
          setTimeout(async () => {
            // console.log(name, logsWritten);
            let method: typeof childLogger.log = childLogger.log.bind(childLogger);
            const val = random.intBetween(0, 5);
            switch (val) {
              case 1:
                method = childLogger.error.bind(childLogger);
                break;
              case 2:
                method = childLogger.warn.bind(childLogger);
                break;
              case 3:
                method = childLogger.info.bind(childLogger);
                break;
              case 4:
                method = childLogger.debug.bind(childLogger);
                break;
              // no default
            }
            method(`this is log ${logsWritten} [rand ${val}]`);
            resolve();
          }, random.intBetween(1, 100));
        });
        logsWritten += 1;
      }
      childLogger.end();
      resolve(`${name} done`);
    }, random.intBetween(1, 100));
  });
}

const names = ['tacos', 'burritos', 'churros', 'nachos', 'chalupas', 'tortillas', 'chorta'];
