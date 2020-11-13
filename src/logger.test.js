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
        " START  firstChild 
         LOG  firstChild first log
         LOG  firstChild second log
        "
      `);
      expect(stderr.toString()).toMatchInlineSnapshot(`
        " WARN  firstChild first warn
        "
      `);
      firstChild.end();
      expect(stdout.toString()).toMatchInlineSnapshot(`
        " DONE  firstChild 
         START  secondChild 
         LOG  secondChild first log
        "
      `);
      expect(stderr.toString()).toMatchInlineSnapshot(`
        " WARN  secondChild first warn
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
        " START  firstChild 
         START  secondChild 
         LOG  firstChild first log
         LOG  secondChild first log
         LOG  firstChild second log
         LOG  secondChild second log
         DONE  secondChild 
         LOG  firstChild third log
         DONE  firstChild 
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
        .mockReturnValue(95); // 1, end
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
        " START  firstChild  +0ms
         LOG  firstChild first log +40ms
         LOG  firstChild second log +30ms
         LOG  firstChild third log +15ms
         DONE  firstChild  +0ms
         START  secondChild  +20ms
         LOG  secondChild first log +30ms
         LOG  secondChild second log +20ms
         DONE  secondChild  +0ms
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
        .mockReturnValue(95); // 1, end
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
        " START  firstChild  +0ms
         START  secondChild  +20ms
         LOG  firstChild first log +40ms
         LOG  secondChild first log +30ms
         LOG  firstChild second log +30ms
         LOG  secondChild second log +20ms
         DONE  secondChild  +0ms
         LOG  firstChild third log +15ms
         DONE  firstChild  +0ms
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
        "[46m[1m START [22m[49m [38;2;237;40;165mchild0[39m [38;2;237;40;165m +0ms[39m
        [46m[1m START [22m[49m [38;2;211;7;222mchild1[39m [38;2;211;7;222m +0ms[39m
        [46m[1m START [22m[49m [38;2;214;155;36mchild2[39m [38;2;214;155;36m +0ms[39m
        [46m[1m START [22m[49m [38;2;245;88;96mchild3[39m [38;2;245;88;96m +0ms[39m
        [46m[1m START [22m[49m [38;2;74;255;140mchild4[39m [38;2;74;255;140m +0ms[39m
        [46m[1m START [22m[49m [38;2;209;212;30mchild5[39m [38;2;209;212;30m +0ms[39m
        [46m[1m START [22m[49m [38;2;66;245;197mchild6[39m [38;2;66;245;197m +0ms[39m
        [46m[1m START [22m[49m [38;2;91;105;201mchild7[39m [38;2;91;105;201m +0ms[39m
        [46m[1m START [22m[49m [38;2;28;232;215mchild8[39m [38;2;28;232;215m +0ms[39m
        [46m[1m START [22m[49m [38;2;76;230;163mchild9[39m [38;2;76;230;163m +0ms[39m
        [46m[1m START [22m[49m [38;2;16;158;224mchild10[39m [38;2;16;158;224m +0ms[39m
        [46m[1m START [22m[49m [38;2;212;51;107mchild11[39m [38;2;212;51;107m +0ms[39m
        [46m[1m START [22m[49m [38;2;209;202;59mchild12[39m [38;2;209;202;59m +0ms[39m
        [46m[1m LOG [22m[49m [38;2;237;40;165mchild0[39m hello[38;2;237;40;165m +0ms[39m
        [46m[1m LOG [22m[49m [38;2;211;7;222mchild1[39m hello[38;2;211;7;222m +0ms[39m
        [46m[1m LOG [22m[49m [38;2;214;155;36mchild2[39m hello[38;2;214;155;36m +0ms[39m
        [46m[1m LOG [22m[49m [38;2;245;88;96mchild3[39m hello[38;2;245;88;96m +0ms[39m
        [46m[1m LOG [22m[49m [38;2;74;255;140mchild4[39m hello[38;2;74;255;140m +0ms[39m
        [46m[1m LOG [22m[49m [38;2;209;212;30mchild5[39m hello[38;2;209;212;30m +0ms[39m
        [46m[1m LOG [22m[49m [38;2;66;245;197mchild6[39m hello[38;2;66;245;197m +0ms[39m
        [46m[1m LOG [22m[49m [38;2;91;105;201mchild7[39m hello[38;2;91;105;201m +0ms[39m
        [46m[1m LOG [22m[49m [38;2;28;232;215mchild8[39m hello[38;2;28;232;215m +0ms[39m
        [46m[1m LOG [22m[49m [38;2;76;230;163mchild9[39m hello[38;2;76;230;163m +0ms[39m
        [46m[1m LOG [22m[49m [38;2;16;158;224mchild10[39m hello[38;2;16;158;224m +0ms[39m
        [46m[1m LOG [22m[49m [38;2;212;51;107mchild11[39m hello[38;2;212;51;107m +0ms[39m
        [46m[1m LOG [22m[49m [38;2;209;202;59mchild12[39m hello[38;2;209;202;59m +0ms[39m
        "
      `);
    });
  });
});
