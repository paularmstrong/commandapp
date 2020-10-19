// @flow

type LoggerOptions = {|
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
  +_stdout: stream$Writable;
  +_stderr: stream$Writable;
  +_children: Array<ChildLogger> = [];

  constructor({ verbosity = 0, stdout = process.stdout, stderr = process.stderr }: LoggerOptions) {
    this._verbosity = verbosity;
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

  requestActivate = (child: ChildLogger) => {
    if (!this._children.some((child) => child.isActive)) {
      child.isActive = true;
      child.flushStdout();
      child.flushStderr();
    }
  };

  onEnd = (child: ChildLogger) => {
    const childIndex = this._children.findIndex((childLogger) => childLogger === child);
    this._children.splice(childIndex, 1);
    if (this._children.length) {
      this._children[0].isActive = true;
      this._children[0].flushStdout();
      this._children[0].flushStderr();
    }
  };

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

  writeStdout(output: mixed): void {
    this._stdout.write(`${stringify(output)}\n`.replace(/\n{2,}$/, ''));
  }

  writeStderr(output: mixed): void {
    this._stderr.write(`${stringify(output)}\n`.replace(/\n{2,}$/, ''));
  }
}

type ChildLoggerOptions = {|
  ...LoggerOptions,
  prefix: string,
  onEnd: (logger: ChildLogger) => void,
  requestActivate: (logger: ChildLogger) => void,
|};

class ChildLogger extends Logger {
  +_stdoutBuffer: Array<mixed> = [];
  +_stderrBuffer: Array<mixed> = [];
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
    this.isActive = false;
    this._onEnd(this);
  }

  writeStdout(output: mixed) {
    this._requestActivate(this);
    if (this.isActive) {
      super.writeStdout(output);
      return;
    }

    this._stdoutBuffer.push(output);
  }

  flushStdout() {
    if (!this._stdoutBuffer.length) {
      return;
    }
    while (this._stdoutBuffer.length > 0) {
      super.writeStdout(this._stdoutBuffer.shift());
    }
  }

  writeStderr(output: mixed) {
    this._requestActivate(this);
    if (this.isActive) {
      super.writeStderr(output);
      return;
    }

    this._stderrBuffer.push(output);
  }

  flushStderr() {
    if (!this._stderrBuffer.length) {
      return;
    }
    while (this._stderrBuffer.length > 0) {
      super.writeStderr(this._stderrBuffer.shift());
    }
  }
}
