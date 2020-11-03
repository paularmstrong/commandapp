// @flow
import Logger from './logger';
import random from 'random-seed';
import { Writable } from 'stream';

class MockWritable extends Writable {
  _chunks: Array<string> = [];

  write(chunk: string | Buffer | Uint8Array): boolean {
    this._chunks.push(chunk.toString());
    return true;
  }

  toString() {
    const out = this._chunks.join('');
    this._chunks = [];
    return out;
  }
}

describe('Logger', () => {
  let stdout, stderr;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(0);
    stdout = new MockWritable();
    stderr = new MockWritable();
  });

  test('defaults to verbosity=0', () => {
    const logger = new Logger({ useColor: false });
    expect(logger._verbosity).toBe(0);
  });

  test('writes log to stdout', () => {
    const logger = new Logger({ useColor: false, verbosity: 0, stdout, stderr });
    logger.log('some text');
    logger.log('some text');
    expect(stderr.toString()).toMatchInlineSnapshot(`""`);
    expect(stdout.toString()).toMatchInlineSnapshot(`
      " LOG  some text
       LOG  some text
      "
    `);
  });

  test('writes errors to stderr', () => {
    const logger = new Logger({ useColor: false, verbosity: 0, stdout, stderr });
    logger.error('some text');
    expect(stdout.toString()).toMatchInlineSnapshot(`""`);
    expect(stderr.toString()).toMatchInlineSnapshot(`
      " ERROR  some text
      "
    `);
  });

  test('does not write warnings if verbosity < 1', () => {
    const logger = new Logger({ useColor: false, verbosity: 0, stdout, stderr });
    logger.warn('some text');
    expect(stdout.toString()).toMatchInlineSnapshot(`""`);
    expect(stderr.toString()).toMatchInlineSnapshot(`""`);
  });

  test('writes warnings to stderr when verbosity >= 1', () => {
    const logger = new Logger({ useColor: false, verbosity: 1, stdout, stderr });
    logger.warn('some text');
    expect(stdout.toString()).toMatchInlineSnapshot(`""`);
    expect(stderr.toString()).toMatchInlineSnapshot(`
      " WARN  some text
      "
    `);
  });

  test('does not info warnings if verbosity < 2', () => {
    const logger = new Logger({ useColor: false, verbosity: 1, stdout, stderr });
    logger.info('some text');
    expect(stdout.toString()).toMatchInlineSnapshot(`""`);
    expect(stderr.toString()).toMatchInlineSnapshot(`""`);
  });

  test('writes info to stderr when verbosity >= 2', () => {
    const logger = new Logger({ useColor: false, verbosity: 2, stdout, stderr });
    logger.info('some text');
    expect(stdout.toString()).toMatchInlineSnapshot(`""`);
    expect(stderr.toString()).toMatchInlineSnapshot(`
      " INFO  some text
      "
    `);
  });

  test('does not write debug if verbosity < 3', () => {
    const logger = new Logger({ useColor: false, verbosity: 2, stdout, stderr });
    logger.debug('some text');
    expect(stdout.toString()).toMatchInlineSnapshot(`""`);
    expect(stderr.toString()).toMatchInlineSnapshot(`""`);
  });

  test('writes debug to stderr when verbosity >= 3', () => {
    const logger = new Logger({ useColor: false, verbosity: 3, stdout, stderr });
    logger.debug('some text');
    expect(stdout.toString()).toMatchInlineSnapshot(`""`);
    expect(stderr.toString()).toMatchInlineSnapshot(`
      " DEBUG  some text +0ms
      "
    `);
  });

  test('includes timing information for each step when verbosity >= 3', () => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(25)
      .mockReturnValueOnce(45)
      .mockReturnValueOnce(50);
    const logger = new Logger({ useColor: false, verbosity: 3, stdout, stderr });
    logger.error('error 1');
    logger.log('log 1');
    logger.log('log 2');
    logger.warn('warn 1');
    expect(stdout.toString()).toMatchInlineSnapshot(`
      " LOG  log 1 +15ms
       LOG  log 2 +20ms
      "
    `);
    expect(stderr.toString()).toMatchInlineSnapshot(`
      " ERROR  error 1 +10ms
       WARN  warn 1 +5ms
      "
    `);
  });

  describe('can log any value type', () => {
    test('strings are left as strings', () => {
      const logger = new Logger({ useColor: false, verbosity: 0, stdout, stderr });
      logger.log('hello');
      expect(stdout.toString()).toMatchInlineSnapshot(`
        " LOG  hello
        "
      `);
    });

    test('dates become ISOString', () => {
      const logger = new Logger({ useColor: false, verbosity: 0, stdout, stderr });
      logger.log(new Date(1603132052998));
      expect(stdout.toString()).toMatchInlineSnapshot(`
        " LOG  2020-10-19T18:27:32.998Z
        "
      `);
    });

    test('arrays are json-stringified', () => {
      const logger = new Logger({ useColor: false, verbosity: 0, stdout, stderr });
      logger.log(['foo', 2, true, new Date(1603132052998)]);
      expect(stdout.toString()).toMatchInlineSnapshot(`
        " LOG  [
          \\"foo\\",
          2,
          true,
          \\"2020-10-19T18:27:32.998Z\\"
        ]
        "
      `);
    });

    test('plain objects are json-stringified', () => {
      const logger = new Logger({ useColor: false, verbosity: 0, stdout, stderr });
      logger.log({ date: new Date(1603132052998), num: 2, str: 'string', bool: true });
      expect(stdout.toString()).toMatchInlineSnapshot(`
        " LOG  {
          \\"date\\": \\"2020-10-19T18:27:32.998Z\\",
          \\"num\\": 2,
          \\"str\\": \\"string\\",
          \\"bool\\": true
        }
        "
      `);
    });

    test('all others become strings', () => {
      const logger = new Logger({ useColor: false, verbosity: 0, stdout, stderr });

      class TestClass {
        toString() {
          return 'test class to string';
        }
      }

      logger.log(Symbol.for('foobar'));
      logger.log(true);
      logger.log(2);
      logger.log(function someFunction() {});
      logger.log(new TestClass());

      expect(stdout.toString()).toMatchInlineSnapshot(`
        " LOG  Symbol(foobar)
         LOG  true
         LOG  2
         LOG  function someFunction() {}
         LOG  test class to string
        "
      `);
    });
  });

  describe('child loggers', () => {
    test('can be created from a base logger', () => {
      const logger = new Logger({ useColor: false, verbosity: 0, stdout, stderr });
      const child = logger.createChild('prefix');
      expect(child._verbosity).toEqual(logger._verbosity);
      expect(child._stdout).toEqual(logger._stdout);
      expect(child._stderr).toEqual(logger._stderr);
    });

    test('disallows sub-children of children (for simplicity)', () => {
      const logger = new Logger({ useColor: false, verbosity: 0, stdout, stderr });
      const child = logger.createChild('prefix');
      expect(() => child.createChild('sub')).toThrow();
    });

    test('buffers when multiple child loggers are running in parallel', () => {
      const logger = new Logger({ useColor: false, verbosity: 2, stdout, stderr });
      const firstChild = logger.createChild('firstChild');
      const secondChild = logger.createChild('secondChild');

      firstChild.log('first log');
      secondChild.log('first log');
      firstChild.warn('first warn');
      secondChild.warn('first warn');
      firstChild.log('second log');

      expect(stdout.toString()).toMatchInlineSnapshot(`
        " firstChild  LOG  first log
         firstChild  LOG  second log
        "
      `);
      expect(stderr.toString()).toMatchInlineSnapshot(`
        " firstChild  WARN  first warn
        "
      `);
      firstChild.end();
      expect(stdout.toString()).toMatchInlineSnapshot(`
        " secondChild  LOG  first log
        "
      `);
      expect(stderr.toString()).toMatchInlineSnapshot(`
        " secondChild  WARN  first warn
        "
      `);
      secondChild.end();
    });

    test('can be interleaved', () => {
      const logger = new Logger({ useColor: false, interleave: true, verbosity: 2, stdout, stderr });
      const firstChild = logger.createChild('firstChild');
      const secondChild = logger.createChild('secondChild');

      firstChild.log('first log');
      secondChild.log('first log');
      firstChild.log('second log');
      secondChild.log('second log');
      secondChild.end();
      firstChild.log('third log');
      firstChild.end();

      expect(stdout.toString()).toMatchInlineSnapshot(`
        " firstChild  LOG  first log
         secondChild  LOG  first log
         firstChild  LOG  second log
         secondChild  LOG  second log
         firstChild  LOG  third log
        "
      `);
    });

    test('includes timing information for each step when verbosity >= 3', () => {
      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(0) // startup
        .mockReturnValueOnce(10) // 1 create
        .mockReturnValueOnce(10) // 2 create
        .mockReturnValueOnce(25) // 1, 1
        .mockReturnValueOnce(45) // 2, 1
        .mockReturnValueOnce(50) // 1, 2
        .mockReturnValueOnce(75) // 2, 2
        .mockReturnValueOnce(80) // 2, end
        .mockReturnValueOnce(95) // 1, 3
        .mockReturnValueOnce(95); // 1, end
      const logger = new Logger({ useColor: false, interleave: false, verbosity: 3, stdout, stderr });
      const firstChild = logger.createChild('firstChild');
      const secondChild = logger.createChild('secondChild');

      firstChild.log('first log');
      secondChild.log('first log');
      firstChild.log('second log');
      secondChild.log('second log');
      secondChild.end();
      firstChild.log('third log');
      firstChild.end();

      expect(stdout.toString()).toMatchInlineSnapshot(`
        " firstChild  LOG  first log +15ms
         firstChild  LOG  second log +25ms
         firstChild  LOG  third log +45ms
         secondChild  LOG  first log +35ms
         secondChild  LOG  second log +30ms
        "
      `);

      expect(stderr.toString()).toMatchInlineSnapshot(`""`);
    });

    test('includes timing information for each step when verbosity >= 3 with interleave', () => {
      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(0) // startup
        .mockReturnValueOnce(10) // 1 create
        .mockReturnValueOnce(10) // 2 create
        .mockReturnValueOnce(25) // 1, 1
        .mockReturnValueOnce(45) // 2, 1
        .mockReturnValueOnce(50) // 1, 2
        .mockReturnValueOnce(75) // 2, 2
        .mockReturnValueOnce(80) // 2, end
        .mockReturnValueOnce(95) // 1, 3
        .mockReturnValueOnce(95); // 1, end
      const logger = new Logger({ useColor: false, interleave: true, verbosity: 3, stdout, stderr });
      const firstChild = logger.createChild('firstChild');
      const secondChild = logger.createChild('secondChild');

      firstChild.log('first log');
      secondChild.log('first log');
      firstChild.log('second log');
      secondChild.log('second log');
      secondChild.end();
      firstChild.log('third log');
      firstChild.end();

      expect(stdout.toString()).toMatchInlineSnapshot(`
        " firstChild  LOG  first log +15ms
         secondChild  LOG  first log +35ms
         firstChild  LOG  second log +25ms
         secondChild  LOG  second log +30ms
         firstChild  LOG  third log +45ms
        "
      `);

      expect(stderr.toString()).toMatchInlineSnapshot(`""`);
    });

    test('uses lots of colors by default', () => {
      const logger = new Logger({
        useColor: true,
        interleave: true,
        verbosity: 3,
        stdout,
        stderr,
        _random: random.create('tacos-seed'),
      });
      const loggers = new Array(13).fill('').map((_v, i) => logger.createChild(`child${i}`));
      loggers.forEach((logger) => {
        logger.log('hello');
      });

      expect(stdout.toString()).toMatchInlineSnapshot(`
        "[97m[1m child0 [22m[39m[46m[1m LOG [22m[49m hello[97m +0ms[39m
        [93m[1m child1 [22m[39m[46m[1m LOG [22m[49m hello[93m +0ms[39m
        [34m[1m child2 [22m[39m[46m[1m LOG [22m[49m hello[34m +0ms[39m
        [97m[1m child3 [22m[39m[46m[1m LOG [22m[49m hello[97m +0ms[39m
        [31m[1m child4 [22m[39m[46m[1m LOG [22m[49m hello[31m +0ms[39m
        [97m[1m child5 [22m[39m[46m[1m LOG [22m[49m hello[97m +0ms[39m
        [97m[1m child6 [22m[39m[46m[1m LOG [22m[49m hello[97m +0ms[39m
        [91m[1m child7 [22m[39m[46m[1m LOG [22m[49m hello[91m +0ms[39m
        [32m[1m child8 [22m[39m[46m[1m LOG [22m[49m hello[32m +0ms[39m
        [91m[1m child9 [22m[39m[46m[1m LOG [22m[49m hello[91m +0ms[39m
        [34m[1m child10 [22m[39m[46m[1m LOG [22m[49m hello[34m +0ms[39m
        [97m[1m child11 [22m[39m[46m[1m LOG [22m[49m hello[97m +0ms[39m
        [97m[1m child12 [22m[39m[46m[1m LOG [22m[49m hello[97m +0ms[39m
        "
      `);
    });
  });
});
