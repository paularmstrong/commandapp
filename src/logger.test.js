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
    return this._chunks.join('');
  }
}

describe('Logger', () => {
  let stdout, stderr;

  beforeEach(() => {
    stdout = new MockWritable();
    stderr = new MockWritable();
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
    expect(stderr.toString()).toEqual('some text\n');
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
      const logger = new Logger({ verbosity: 3, stdout, stderr });
      const firstChild = logger.createChild('firstChild');
      const secondChild = logger.createChild('secondChild');

      firstChild.log('first child first log');
      secondChild.log('second child first log');
      firstChild.log('first child second log');

      expect(stdout.toString()).toEqual('first child first log\nfirst child second log\n');
      firstChild.end();
      expect(stdout.toString()).toEqual('first child first log\nfirst child second log\nsecond child first log\n');
      secondChild.end();
    });
  });
});
