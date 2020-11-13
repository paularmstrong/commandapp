// @flow
import * as docs from './docs';
import bootstrap from '.';
import glob from 'glob';
import Logger from './logger';

describe('bootstrap', () => {
  let globMock, requireMock;

  beforeEach(() => {
    globMock = jest.spyOn(glob, 'sync').mockReturnValue([]);
    requireMock = jest.fn();
  });

  describe('config', () => {
    test('subcommandDir pulls commands from a directory relative to the rootDir', async () => {
      globMock.mockReturnValueOnce(['/rootDir/subcommands/test-command.js']);
      const handlerSpy = jest.fn();
      requireMock.mockReturnValue({ description: 'some description', handler: handlerSpy });

      await expect(
        bootstrap(
          { subcommandDir: 'subcommands', rootDir: '/rootDir' },
          undefined,
          'test-command',
          // $FlowFixMe passing mock as typeof require
          requireMock
        )
      ).resolves.toBeUndefined();
      expect(globMock).toHaveBeenCalledWith('/rootDir/subcommands/**/*', { nodir: true });
      expect(requireMock).toHaveBeenCalledWith('/rootDir/subcommands/test-command.js');
      expect(handlerSpy).toHaveBeenCalledWith({ _: {}, verbosity: 0, 'logger-async': false }, expect.any(Logger));
    });
  });

  describe('malformed commands', () => {
    test('throws if a command does not have a description', async () => {
      globMock.mockReturnValueOnce(['foo/bar.js']);
      requireMock.mockReturnValueOnce({});
      await expect(
        bootstrap(
          undefined,
          undefined,
          'foo bar',
          // $FlowFixMe passing mock as typeof require
          requireMock
        )
      ).rejects.toEqual(new Error('Missing description for "foo bar"'));
    });

    test('throws if a command does not have a handler', async () => {
      globMock.mockReturnValueOnce(['foo/bar.js']);
      requireMock.mockReturnValueOnce({ description: 'some description' });
      await expect(
        bootstrap(
          undefined,
          undefined,
          'foo bar',
          // $FlowFixMe passing mock as typeof require
          requireMock
        )
      ).rejects.toEqual(new Error('Missing handler for "foo bar"'));
    });
  });

  describe('aliases', () => {
    test('replaced over the command, calls the correct handler', async () => {
      globMock.mockReturnValueOnce(['/rootDir/food/burritos.js', '/rootDir/food/good-stuff.js']);
      const handlerSpy = jest.fn();
      requireMock
        .mockReturnValueOnce({ aliasof: './burritos.js' })
        .mockReturnValueOnce({ description: 'burritos description', handler: handlerSpy });

      await expect(
        bootstrap(
          { rootDir: '/rootDir' },
          undefined,
          'food good-stuff',
          // $FlowFixMe passing mock as typeof require
          requireMock
        )
      ).resolves.toBeUndefined();
      expect(globMock).toHaveBeenCalledWith('/rootDir/**/*', { nodir: true });
      expect(requireMock).toHaveBeenCalledWith('/rootDir/food/good-stuff.js');
      expect(handlerSpy).toHaveBeenCalledWith({ _: {}, verbosity: 0, 'logger-async': false }, expect.any(Logger));
    });
  });

  describe('positional mapping', () => {
    test('maps positionals in order to keys', async () => {
      const handlerSpy = jest.fn();
      globMock.mockReturnValueOnce(['/tacos.js']);
      requireMock.mockReturnValueOnce({
        description: 'description',
        positionals: {
          topping1: { description: 'topping1' },
          topping2: { description: 'topping2' },
          topping3: { description: 'topping3' },
        },
        handler: handlerSpy,
      });
      await expect(
        bootstrap(
          { rootDir: '/' },
          undefined,
          'tacos lettuce peppers onions',
          // $FlowFixMe passing mock as typeof require
          requireMock
        )
      ).resolves.toBeUndefined();

      expect(handlerSpy).toHaveBeenCalledWith(
        {
          _: { topping1: 'lettuce', topping2: 'peppers', topping3: 'onions' },
          verbosity: 0,
          'logger-async': false,
        },
        expect.any(Logger)
      );
    });

    test('maps positionals using greedy', async () => {
      const handlerSpy = jest.fn();
      globMock.mockReturnValueOnce(['/tacos.js']);
      requireMock.mockReturnValueOnce({
        description: 'description',
        positionals: {
          shell: { description: 'shell' },
          toppings: { description: 'toppings', greedy: true },
        },
        handler: handlerSpy,
      });
      await expect(
        bootstrap(
          { rootDir: '/' },
          undefined,
          'tacos hard lettuce peppers onions',
          // $FlowFixMe passing mock as typeof require
          requireMock
        )
      ).resolves.toBeUndefined();
      expect(handlerSpy).toHaveBeenCalledWith(
        {
          _: { shell: 'hard', toppings: ['lettuce', 'peppers', 'onions'] },
          verbosity: 0,
          'logger-async': false,
        },
        expect.any(Logger)
      );
    });

    test('throws if greedy used before last', async () => {
      const handlerSpy = jest.fn();
      globMock.mockReturnValueOnce(['/tacos.js']);
      requireMock.mockReturnValueOnce({
        description: 'description',
        positionals: {
          toppings: { description: 'toppings', greedy: true },
          shell: { description: 'shell' },
        },
        handler: handlerSpy,
      });
      await expect(
        bootstrap(
          { rootDir: '/' },
          undefined,
          'tacos hard lettuce peppers onions',
          // $FlowFixMe passing mock as typeof require
          requireMock
        )
      ).rejects.toEqual(
        new Error(
          'Positional "toppings" defined as "greedy", but cannot be because it is not the last positional option'
        )
      );
    });
  });

  describe('help', () => {
    beforeEach(() => {
      jest.spyOn(Logger.prototype, 'plain').mockImplementation(() => {});
    });

    test('with no resolved command and --help, prints help', async () => {
      const handlerSpy = jest.fn();
      const helpSpy = jest.spyOn(docs, 'default').mockImplementation(() => '');
      globMock.mockReturnValue(['/tacos.js', '/burritos.js']);
      requireMock
        .mockReturnValueOnce({
          description: 'tacos description',
          handler: handlerSpy,
        })
        .mockReturnValueOnce({ description: 'burritos description', handler: handlerSpy });

      await expect(
        bootstrap(
          { rootDir: '/' },
          undefined,
          '--help',
          // $FlowFixMe passing mock as typeof require
          requireMock
        )
      ).resolves.toBeUndefined();
      expect(helpSpy).toHaveBeenCalledWith(
        [
          {
            alias: [],
            command: expect.any(String),
            description: '',
            handler: expect.any(Function),
            options: {
              help: { alias: 'h', description: 'Get help documentation', type: 'boolean' },
              'help-format': {
                'choices': ['json', 'markdown', 'stdout'],
                'description': 'Get help documentation in the given format',
                'type': 'string',
              },
              'logger-async': {
                'default': false,
                'description': 'Allow logger to interleave output of parallel asynchronous child loggers',
                'type': 'boolean',
              },
              'verbosity': {
                'alias': 'v',
                'default': 0,
                'description': "Increase the logger's verbosity",
                'type': 'count',
              },
            },
            positionals: {},
            examples: [],
          },
          {
            alias: [],
            command: 'tacos',
            description: 'tacos description',
            handler: handlerSpy,
            options: {},
            positionals: {},
            examples: [],
            path: 'tacos.js',
          },
          {
            alias: [],
            command: 'burritos',
            description: 'burritos description',
            handler: handlerSpy,
            options: {},
            positionals: {},
            examples: [],
            path: 'burritos.js',
          },
        ],
        undefined
      );
    });

    test('passes help format', async () => {
      const helpSpy = jest.spyOn(docs, 'default').mockImplementation(() => '');

      await expect(
        bootstrap(
          { rootDir: '/' },
          undefined,
          '--help --help-format=stdout',
          // $FlowFixMe passing mock as typeof require
          requireMock
        )
      ).resolves.toBeUndefined();
      expect(helpSpy).toHaveBeenCalledWith(expect.arrayContaining([]), 'stdout');
    });

    test('resolves aliases for commands', async () => {
      const handlerSpy = jest.fn();
      const helpSpy = jest.spyOn(docs, 'default').mockImplementation(() => '');
      globMock.mockReturnValue(['/food/tacos.js', '/food/index.js']);
      requireMock
        .mockReturnValueOnce({
          description: 'tacos description',
          handler: handlerSpy,
        })
        .mockReturnValueOnce({ aliasof: './tacos.js' });
      await expect(
        bootstrap(
          { rootDir: '/' },
          undefined,
          '--help',
          // $FlowFixMe passing mock as typeof require
          requireMock
        )
      ).resolves.toBeUndefined();
      expect(helpSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          {
            alias: ['food'],
            command: 'food tacos',
            description: 'tacos description',
            handler: handlerSpy,
            options: {},
            positionals: {},
            examples: [],
            path: 'food/tacos.js',
          },
        ]),
        undefined
      );
    });

    test('prints for individual commands', async () => {
      const handlerSpy = jest.fn();
      const helpSpy = jest.spyOn(docs, 'default').mockImplementation(() => '');
      globMock.mockReturnValue(['/food/tacos.js', '/food/index.js']);
      requireMock.mockReturnValueOnce({
        description: 'tacos description',
        handler: handlerSpy,
      });
      await expect(
        bootstrap(
          { rootDir: '/' },
          undefined,
          'food tacos --help',
          // $FlowFixMe passing mock as typeof require
          requireMock
        )
      ).resolves.toBeUndefined();
      expect(helpSpy).toHaveBeenCalledWith(
        {
          alias: [],
          command: 'food tacos',
          description: 'tacos description',
          handler: handlerSpy,
          options: {},
          positionals: {},
          examples: [],
          path: 'food/tacos.js',
        },
        undefined
      );
    });
  });
});
