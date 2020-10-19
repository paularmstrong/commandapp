// @flow

type LoggerOptions = {|
  verbosity?: number,
  stdout?: stream$Writable,
  stderr?: stream$Writable,
|};

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
    }
  };

  log(output: string): void {
    this.writeStdout(output);
  }

  // -v 0
  error(output: string): void {
    this.writeStderr(output);
  }

  // -v 1
  warn(output: string): void {
    if (this._verbosity >= 1) {
      this.writeStderr(output);
    }
  }

  // -v 2
  info(output: string): void {
    if (this._verbosity >= 2) {
      this.writeStderr(output);
    }
  }

  // -v 3
  debug(output: string): void {
    if (this._verbosity >= 3) {
      this.writeStderr(output);
    }
  }

  writeStdout(output: string | Buffer): void {
    this._stdout.write(`${output.toString()}\n`.replace(/\n{2,}$/, ''));
  }

  writeStderr(output: string | Buffer): void {
    this._stderr.write(`${output.toString()}\n`.replace(/\n{2,}$/, ''));
  }
}

type ChildLoggerOptions = {|
  ...LoggerOptions,
  prefix: string,
  onEnd: (logger: ChildLogger) => void,
  requestActivate: (logger: ChildLogger) => void,
|};

class ChildLogger extends Logger {
  +_stdoutBuffer: Array<string> = [];
  +_stderrBuffer: Array<string> = [];
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

  writeStdout(output: string | Buffer) {
    this._requestActivate(this);
    if (this.isActive) {
      super.writeStdout(output);
      return;
    }

    this._stdoutBuffer.push(output.toString());
  }

  flushStdout() {
    if (!this._stdoutBuffer.length) {
      return;
    }
    super.writeStdout(this._stdoutBuffer.join(''));
    this._stdoutBuffer.splice(0, this._stdoutBuffer.length);
  }

  writeStderr(output: string | Buffer) {
    this._requestActivate(this);
    if (this.isActive) {
      super.writeStderr(output);
      return;
    }

    this._stderrBuffer.push(output.toString());
    this._stderrBuffer.splice(0, this._stderrBuffer.length);
  }

  flushStderr() {
    if (!this._stderrBuffer.length) {
      return;
    }
    super.writeStderr(this._stderrBuffer.join(''));
    this._stderrBuffer.splice(0, this._stdoutBuffer.length);
  }
}
