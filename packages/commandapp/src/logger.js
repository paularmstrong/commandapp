// @flow
import chalk from 'chalk';
import random from 'random-seed';

type LoggerOptions = {|
  _random?: typeof random,
  useColor?: boolean,
  interleave?: boolean,
  verbosity?: number,
  stdout?: stream$Writable,
  stderr?: stream$Writable,
|};

type LogLevel = 'log' | 'error' | 'warn' | 'info' | 'debug';

function stringify(item: mixed): string {
  if (typeof item === 'string') {
    return item;
  }

  if (
    Array.isArray(item) ||
    (typeof item === 'object' && item !== null && item.constructor === Object) ||
    item === null
  ) {
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
  +_chalk: typeof chalk;
  +_useColor: boolean;

  _lastTimestamp: number = Date.now();
  +_random: typeof random;

  constructor({
    useColor,
    verbosity = 0,
    interleave = false,
    stdout = process.stdout,
    stderr = process.stderr,
    _random = random.create(),
  }: LoggerOptions) {
    this._useColor = Boolean(useColor === true ? true : useColor === false ? false : chalk.supportsColor);
    this._chalk = new chalk.Instance({
      level: this._useColor ? 3 : 0,
    });
    this._verbosity = verbosity;
    this._interleave = interleave;
    this._stdout = stdout;
    this._stderr = stderr;
    this._random = _random;
  }

  createChild(prefix: string): ChildLogger {
    const color = this._pickColor();
    const child = new ChildLogger({
      verbosity: this._verbosity,
      stdout: this._stdout,
      stderr: this._stderr,
      color,
      prefix,
      onEnd: this.onEnd,
      requestActivate: this.requestActivate,
      useColor: this._useColor,
    });
    this._children.push(child);
    return child;
  }

  _pickColor(): [number, number, number] {
    return [this._random(360), this._random.intBetween(55, 100), this._random.intBetween(55, 100)];
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

  plain(output: mixed): void {
    return this.writeStdout(stringify(output));
  }

  log(output: mixed): void {
    return this.writeStdout(stringify(output), [this._chalk.hex('#000').bgCyanBright.bold(' LOG ')]);
  }

  // -v 0
  error(output: mixed): void {
    return this.writeStderr(stringify(output), [this._chalk.hex('#FFF').bgRed.bold(' ERROR ')]);
  }

  // -v 1
  warn(output: mixed): void {
    if (this._verbosity >= 1) {
      return this.writeStderr(stringify(output), [this._chalk.hex('#000').bgYellow.bold(' WARN ')]);
    }
  }

  // -v 2
  info(output: mixed): void {
    if (this._verbosity >= 2) {
      return this.writeStderr(stringify(output), [this._chalk.hex('#FFF').bgBlue.bold(' INFO ')]);
    }
  }

  // -v 3
  debug(output: mixed): void {
    if (this._verbosity >= 3) {
      return this.writeStderr(stringify(output), [this._chalk.hex('#FFF').bgMagenta.bold(' DEBUG ')]);
    }
  }

  getTimeDiff(timestamp: number): string {
    if (this._verbosity >= 3) {
      return ` +${timestamp - this._lastTimestamp}ms`;
    }
    return '';
  }

  writeStdout(output: string, prefix: Array<string> = [], timestamp: number = Date.now()): void {
    this._stdout.write(
      `${prefix.length ? `${prefix.join(' ')} ` : ''}${output}${this.getTimeDiff(timestamp)}\n`.replace(/\n{2,}$/, ''),
      'utf8'
    );
    this._lastTimestamp = timestamp;
  }

  writeStderr(output: string, prefix: Array<string>, timestamp: number = Date.now()): void {
    this._stderr.write(
      `${prefix.length ? `${prefix.join(' ')} ` : ''}${output}${this.getTimeDiff(timestamp)}\n`.replace(/\n{2,}$/, ''),
      'utf8'
    );
    this._lastTimestamp = timestamp;
  }
}

type ChildLoggerOptions = {|
  ...LoggerOptions,
  prefix: string,
  color: [number, number, number],
  onEnd: (logger: ChildLogger) => void,
  requestActivate: (logger: ChildLogger) => void,
|};

const startSentinel = Symbol.for('logger start');
const endSentinel = Symbol.for('logger end');

class ChildLogger extends Logger {
  +_stdoutBuffer: Array<{ timestamp: number, prefix: Array<string>, contents: mixed }> = [];
  +_stderrBuffer: Array<{ timestamp: number, prefix: Array<string>, contents: mixed }> = [];
  +_onEnd: (logger: ChildLogger) => void;
  +_requestActivate: (logger: ChildLogger) => void;

  +prefix: string;
  +color: [number, number, number];

  isActive: boolean = false;

  constructor(options: ChildLoggerOptions) {
    const { onEnd, prefix, color, requestActivate, ...parentOptions } = options;
    super(parentOptions);
    this.prefix = prefix;
    this.color = color;
    this._onEnd = onEnd;
    this._requestActivate = requestActivate;
    this.start();
  }

  createChild(prefix: string): ChildLogger {
    throw new Error('Cannot create sub-children');
  }

  start(timestamp?: number = Date.now()): void {
    this._requestActivate(this);
    if (this.isActive) {
      this.writeStdout('', [this._chalk.bgCyan.bold(' START ')], timestamp);
      return;
    }

    this._stdoutBuffer.push({ timestamp, prefix: [], contents: startSentinel });
  }

  end(timestamp?: number = Date.now()): void {
    this._requestActivate(this);
    if (this.isActive) {
      this.writeStdout('', [this._chalk.bgCyan.bold(' DONE ')], timestamp);
      this.isActive = false;
      this._onEnd(this);
      return;
    }

    this._stdoutBuffer.push({ timestamp, prefix: [], contents: endSentinel });
  }

  getTimeDiff(timestamp: number): string {
    const text = super.getTimeDiff(timestamp);
    return this._chalk.hsv(...this.color)(text);
  }

  writeStdout(output: string, prefix: Array<string> = [], timestamp: number = Date.now()): void {
    this._requestActivate(this);
    if (this.isActive) {
      return super.writeStdout(output, [...prefix, this._chalk.hsv(...this.color)(this.prefix)], timestamp);
    }

    this._stdoutBuffer.push({ contents: output, timestamp, prefix });
  }

  flushStdout(): void {
    if (!this._stdoutBuffer.length) {
      return;
    }
    while (this._stdoutBuffer.length > 0) {
      const { contents, prefix, timestamp } = this._stdoutBuffer.shift();
      if (contents === startSentinel) {
        this.start(timestamp);
        continue;
      }
      if (contents === endSentinel) {
        this.end(timestamp);
        continue;
      }
      this.writeStdout(stringify(contents), prefix, timestamp);
    }
  }

  writeStderr(output: string, prefix: Array<string> = [], timestamp: number = Date.now()): void {
    this._requestActivate(this);
    if (this.isActive) {
      return super.writeStderr(output, [...prefix, this._chalk.hsv(...this.color)(this.prefix)], timestamp);
    }

    this._stderrBuffer.push({ contents: output, timestamp, prefix });
  }

  flushStderr() {
    if (!this._stderrBuffer.length) {
      return;
    }
    while (this._stderrBuffer.length > 0) {
      const { contents, prefix, timestamp } = this._stderrBuffer.shift();
      this.writeStderr(stringify(contents), prefix, timestamp);
    }
  }
}
