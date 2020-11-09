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

const prefixColors: Array<string> = [
  '#a6cee3',
  '#1f78b4',
  '#b2df8a',
  '#33a02c',
  '#fb9a99',
  '#e31a1c',
  '#fdbf6f',
  '#ff7f00',
  '#cab2d6',
  '#6a3d9a',
  '#ffff99',
  '#b15928',
];

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
      level: this._useColor ? 1 : 0,
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

  _pickColor(): string {
    const usedColors = this._children.map((child) => child.color);
    let availableColors = prefixColors.filter((color) => !usedColors.includes(color));
    if (availableColors.length === 0) {
      availableColors = prefixColors;
    }
    const colorIndex = this._random(availableColors.length);
    return availableColors[colorIndex];
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
    this.writeStdout(`${this._chalk.bgCyan.bold(' LOG ')} ${stringify(output)}`);
  }

  // -v 0
  error(output: mixed): void {
    this.writeStderr(`${this._chalk.bgRed.bold(' ERROR ')} ${stringify(output)}`);
  }

  // -v 1
  warn(output: mixed): void {
    if (this._verbosity >= 1) {
      this.writeStderr(`${this._chalk.bgYellow.bold(' WARN ')} ${stringify(output)}`);
    }
  }

  // -v 2
  info(output: mixed): void {
    if (this._verbosity >= 2) {
      this.writeStderr(`${this._chalk.bgBlue.bold(' INFO ')} ${stringify(output)}`);
    }
  }

  // -v 3
  debug(output: mixed): void {
    if (this._verbosity >= 3) {
      this.writeStderr(`${this._chalk.bgMagenta.bold(' DEBUG ')} ${stringify(output)}`);
    }
  }

  getTimeDiff(timestamp: number): string {
    if (this._verbosity >= 3) {
      return ` +${timestamp - this._lastTimestamp}ms`;
    }
    return '';
  }

  writeStdout(output: string, timestamp: number = Date.now(), prefix?: string): void {
    this._stdout.write(`${prefix || ''}${output}${this.getTimeDiff(timestamp)}\n`.replace(/\n{2,}$/, ''));
    this._lastTimestamp = timestamp;
  }

  writeStderr(output: string, timestamp: number = Date.now(), prefix?: string): void {
    this._stderr.write(`${prefix || ''}${output}${this.getTimeDiff(timestamp)}\n`.replace(/\n{2,}$/, ''));
    this._lastTimestamp = timestamp;
  }
}

type ChildLoggerOptions = {|
  ...LoggerOptions,
  prefix: string,
  color: string,
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
  +color: string;

  isActive: boolean = false;

  constructor(options: ChildLoggerOptions) {
    const { onEnd, prefix, color, requestActivate, ...parentOptions } = options;
    super(parentOptions);
    this.prefix = prefix;
    this.color = color;
    this._onEnd = onEnd;
    this._requestActivate = requestActivate;
  }

  createChild(prefix: string): ChildLogger {
    throw new Error('Cannot create sub-children');
  }

  end(timestamp?: number = Date.now()) {
    if (this.isActive) {
      this.isActive = false;
      this._onEnd(this);
      return;
    }

    this._stdoutBuffer.push({ timestamp: Date.now(), contents: endSentinel });
  }

  getTimeDiff(timestamp: number): string {
    const text = super.getTimeDiff(timestamp);
    return this._chalk.hex(this.color)(text);
  }

  writeStdout(output: string, timestamp: number = Date.now()) {
    this._requestActivate(this);
    if (this.isActive) {
      super.writeStdout(output, timestamp, this._chalk.hex(this.color).bold(` ${this.prefix} `));
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
        this.end(timestamp);
        return;
      }
      this.writeStdout(stringify(contents), timestamp);
    }
  }

  writeStderr(output: string, timestamp: number = Date.now()) {
    this._requestActivate(this);
    if (this.isActive) {
      super.writeStderr(output, timestamp, this._chalk.hex(this.color).bold(` ${this.prefix} `));
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
      this.writeStderr(stringify(contents), timestamp);
    }
  }
}
