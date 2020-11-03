// @flow
type LoggerOptions = {|
  interleave?: boolean,
  verbosity?: number,
  stdout?: stream$Writable,
  stderr?: stream$Writable,
|};

function stringify(item: mixed): string {
  if (typeof item === 'string') {
    return item;
  }

  if (Array.isArray(item) || (typeof item === 'object' && (item === null || item.constructor === Object))) {
    return JSON.stringify(item, null, 2);
  }

  if (item instanceof Date) {
    return item.toISOString();
  }

  return `${String(item)}`;
}

export default class Logger {
  +_verbosity: number;
  +_interleave: boolean;
  +_stdout: stream$Writable;
  +_stderr: stream$Writable;
  +_children: Array<ChildLogger> = [];

  _lastTimestamp: number = Date.now();

  constructor({ verbosity = 0, interleave = false, stdout = process.stdout, stderr = process.stderr }: LoggerOptions) {
    this._verbosity = verbosity;
    this._interleave = interleave;
    this._stdout = stdout;
    this._stderr = stderr;
  }

  createChild(prefix: string): ChildLogger {
    const child = new ChildLogger({
      verbosity: this._verbosity,
      stdout: this._stdout,
      stderr: this._stderr,
      prefix,
      onEnd: this.onEnd,
      requestActivate: this.requestActivate,
    });
    this._children.push(child);
    return child;
  }

  requestActivate: (child: ChildLogger) => void = (child) => {
    if (this._interleave) {
      child.isActive = true;
      return;
    }

    if (!this._children.some((child) => child.isActive)) {
      child.isActive = true;
      child.flushStdout();
      child.flushStderr();
    }
  };

  onEnd: (child: ChildLogger) => void = (child) => {
    const childIndex = this._children.findIndex((childLogger) => childLogger === child);
    this._children.splice(childIndex, 1);
    if (this._children.length) {
      this._children[0].isActive = true;
      this._children[0].flushStderr();
      this._children[0].flushStdout();
    }
  };

  // [tacos, burritos, churros, nachos]

  log(output: mixed): void {
    this.writeStdout(output);
  }

  // -v 0
  error(output: mixed): void {
    this.writeStderr(output);
  }

  // -v 1
  warn(output: mixed): void {
    if (this._verbosity >= 1) {
      this.writeStderr(output);
    }
  }

  // -v 2
  info(output: mixed): void {
    if (this._verbosity >= 2) {
      this.writeStderr(output);
    }
  }

  // -v 3
  debug(output: mixed): void {
    if (this._verbosity >= 3) {
      this.writeStderr(output);
    }
  }

  getTimeDiff(timestamp: number): string {
    if (this._verbosity >= 3) {
      return ` +${timestamp - this._lastTimestamp}ms`;
    }
    return '';
  }

  writeStdout(output: mixed, timestamp: number = Date.now(), prefix?: string): void {
    this._stdout.write(`${prefix || ''}${stringify(output)}${this.getTimeDiff(timestamp)}\n`.replace(/\n{2,}$/, ''));
    this._lastTimestamp = timestamp;
  }

  writeStderr(output: mixed, timestamp: number = Date.now(), prefix?: string): void {
    this._stderr.write(`${prefix || ''}${stringify(output)}${this.getTimeDiff(timestamp)}\n`.replace(/\n{2,}$/, ''));
    this._lastTimestamp = timestamp;
  }
}

type ChildLoggerOptions = {|
  ...LoggerOptions,
  prefix: string,
  onEnd: (logger: ChildLogger) => void,
  requestActivate: (logger: ChildLogger) => void,
|};

const endSentinel = Symbol.for('logger end');

class ChildLogger extends Logger {
  +_stdoutBuffer: Array<{ timestamp: number, contents: mixed }> = [];
  +_stderrBuffer: Array<{ timestamp: number, contents: mixed }> = [];
  +_onEnd: (logger: ChildLogger) => void;
  +_requestActivate: (logger: ChildLogger) => void;

  +prefix: string;

  isActive: boolean = false;

  constructor(options: ChildLoggerOptions) {
    const { onEnd, prefix, requestActivate, ...parentOptions } = options;
    super(parentOptions);
    this.prefix = prefix;
    this._onEnd = onEnd;
    this._requestActivate = requestActivate;
  }

  createChild(prefix: string): ChildLogger {
    throw new Error('Cannot create sub-children');
  }

  end() {
    if (this.isActive) {
      this.isActive = false;
      this._onEnd(this);
      return;
    }

    this._stdoutBuffer.push({ timestamp: Date.now(), contents: endSentinel });
  }

  writeStdout(output: mixed, timestamp: number = Date.now()) {
    this._requestActivate(this);
    if (this.isActive) {
      super.writeStdout(output, timestamp, `[ ${this.prefix} ] `);
      return;
    }

    this._stdoutBuffer.push({ contents: output, timestamp });
  }

  flushStdout() {
    if (!this._stdoutBuffer.length) {
      return;
    }
    while (this._stdoutBuffer.length > 0) {
      const { contents, timestamp } = this._stdoutBuffer.shift();
      if (contents === endSentinel) {
        this.end();
        return;
      }
      this.writeStdout(contents, timestamp);
    }
  }

  writeStderr(output: mixed, timestamp: number = Date.now()) {
    this._requestActivate(this);
    if (this.isActive) {
      super.writeStderr(output, timestamp, `[ ${this.prefix} ] `);
      return;
    }

    this._stderrBuffer.push({ contents: output, timestamp });
  }

  flushStderr() {
    if (!this._stderrBuffer.length) {
      return;
    }
    while (this._stderrBuffer.length > 0) {
      const { contents, timestamp } = this._stderrBuffer.shift();
      this.writeStderr(contents, timestamp);
    }
  }
}
