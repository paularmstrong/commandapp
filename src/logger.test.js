// @flow
import Logger from './logger';
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
    stdout = new MockWritable();
    stderr = new MockWritable();
  });

  test('defaults to verbosity=0', () => {
    const logger = new Logger({});
    expect(logger._verbosity).toBe(0);
  });

  test('writes log to stdout', () => {
    const logger = new Logger({ verbosity: 0, stdout, stderr });
    logger.log('some text');
    logger.log('some text');
    expect(stderr.toString()).toEqual('');
    expect(stdout.toString()).toEqual('some text\nsome text\n');
  });

  test('writes errors to stderr', () => {
    const logger = new Logger({ verbosity: 0, stdout, stderr });
    logger.error('some text');
    expect(stdout.toString()).toEqual('');
    expect(stderr.toString()).toEqual('some text\n');
  });

  test('does not write warnings if verbosity < 1', () => {
    const logger = new Logger({ verbosity: 0, stdout, stderr });
    logger.warn('some text');
    expect(stdout.toString()).toEqual('');
    expect(stderr.toString()).toEqual('');
  });

  test('writes warnings to stderr when verbosity >= 1', () => {
    const logger = new Logger({ verbosity: 1, stdout, stderr });
    logger.warn('some text');
    expect(stdout.toString()).toEqual('');
    expect(stderr.toString()).toEqual('some text\n');
  });

  test('does not info warnings if verbosity < 2', () => {
    const logger = new Logger({ verbosity: 1, stdout, stderr });
    logger.info('some text');
    expect(stdout.toString()).toEqual('');
    expect(stderr.toString()).toEqual('');
  });

  test('writes info to stderr when verbosity >= 2', () => {
    const logger = new Logger({ verbosity: 2, stdout, stderr });
    logger.info('some text');
    expect(stdout.toString()).toEqual('');
    expect(stderr.toString()).toEqual('some text\n');
  });

  test('does not write debug if verbosity < 3', () => {
    const logger = new Logger({ verbosity: 2, stdout, stderr });
    logger.debug('some text');
    expect(stdout.toString()).toEqual('');
    expect(stderr.toString()).toEqual('');
  });

  test('writes debug to stderr when verbosity >= 3', () => {
    const logger = new Logger({ verbosity: 3, stdout, stderr });
    logger.debug('some text');
    expect(stdout.toString()).toEqual('');
    expect(stderr.toString()).toEqual('some text +0ms\n');
  });

  test('includes timing information for each step when verbosity >= 3', () => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(25)
      .mockReturnValueOnce(45)
      .mockReturnValueOnce(50);
    const logger = new Logger({ verbosity: 3, stdout, stderr });
    logger.error('error 1');
    logger.log('log 1');
    logger.log('log 2');
    logger.warn('warn 1');
    expect(stdout.toString()).toEqual('log 1 +15ms\nlog 2 +20ms\n');
    expect(stderr.toString()).toEqual('error 1 +10ms\nwarn 1 +5ms\n');
  });

  describe('can log any value type', () => {
    test('strings are left as strings', () => {
      const logger = new Logger({ verbosity: 0, stdout, stderr });
      logger.log('hello');
      expect(stdout.toString()).toEqual('hello\n');
    });

    test('dates become ISOString', () => {
      const logger = new Logger({ verbosity: 0, stdout, stderr });
      logger.log(new Date(1603132052998));
      expect(stdout.toString()).toEqual('2020-10-19T18:27:32.998Z\n');
    });

    test('arrays are json-stringified', () => {
      const logger = new Logger({ verbosity: 0, stdout, stderr });
      logger.log(['foo', 2, true, new Date(1603132052998)]);
      expect(stdout.toString()).toMatchInlineSnapshot(`
        "[
          \\"foo\\",
          2,
          true,
          \\"2020-10-19T18:27:32.998Z\\"
        ]
        "
      `);
    });

    test('plain objects are json-stringified', () => {
      const logger = new Logger({ verbosity: 0, stdout, stderr });
      logger.log({ date: new Date(1603132052998), num: 2, str: 'string', bool: true });
      expect(stdout.toString()).toMatchInlineSnapshot(`
        "{
          \\"date\\": \\"2020-10-19T18:27:32.998Z\\",
          \\"num\\": 2,
          \\"str\\": \\"string\\",
          \\"bool\\": true
        }
        "
      `);
    });

    test('all others become strings', () => {
      const logger = new Logger({ verbosity: 0, stdout, stderr });

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
        "Symbol(foobar)
        true
        2
        function someFunction() {}
        test class to string
        "
      `);
    });
  });

  describe('child loggers', () => {
    test('can be created from a base logger', () => {
      const logger = new Logger({ verbosity: 0, stdout, stderr });
      const child = logger.createChild('prefix');
      expect(child._verbosity).toEqual(logger._verbosity);
      expect(child._stdout).toEqual(logger._stdout);
      expect(child._stderr).toEqual(logger._stderr);
    });

    test('disallows sub-children of children (for simplicity)', () => {
      const logger = new Logger({ verbosity: 0, stdout, stderr });
      const child = logger.createChild('prefix');
      expect(() => child.createChild('sub')).toThrow();
    });

    test('buffers when multiple child loggers are running in parallel', () => {
      const logger = new Logger({ verbosity: 2, stdout, stderr });
      const firstChild = logger.createChild('firstChild');
      const secondChild = logger.createChild('secondChild');

      firstChild.log('first log');
      secondChild.log('first log');
      firstChild.warn('first warn');
      secondChild.warn('first warn');
      firstChild.log('second log');

      expect(stdout.toString()).toEqual('[ firstChild ] first log\n[ firstChild ] second log\n');
      expect(stderr.toString()).toEqual('[ firstChild ] first warn\n');
      firstChild.end();
      expect(stdout.toString()).toEqual('[ secondChild ] first log\n');
      expect(stderr.toString()).toEqual('[ secondChild ] first warn\n');
      secondChild.end();
    });

    test('can be interleaved', () => {
      const logger = new Logger({ interleave: true, verbosity: 2, stdout, stderr });
      const firstChild = logger.createChild('firstChild');
      const secondChild = logger.createChild('secondChild');

      firstChild.log('first log');
      secondChild.log('first log');
      firstChild.log('second log');
      secondChild.log('second log');
      secondChild.end();
      firstChild.log('third log');
      firstChild.end();

      expect(stdout.toString()).toEqual(`[ firstChild ] first log
[ secondChild ] first log
[ firstChild ] second log
[ secondChild ] second log
[ firstChild ] third log
`);
    });
  });
});
