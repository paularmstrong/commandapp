import bootstrap from '.';
import glob from 'glob';
import Logger from './logger';
import { Command } from './options';

describe('bootstrap', () => {
  let globMock: jest.SpyInstance<Array<string>>;

  beforeEach(() => {
    globMock = jest.spyOn(glob, 'sync').mockReturnValue([]);
  });

  describe('config', () => {
    test('subcommandDir pulls commands from a directory relative to the rootDir', async () => {
      globMock.mockReturnValueOnce(['/rootDir/subcommands/test-command.js']);
      const handlerSpy = jest.fn();
      const requireMock = () => ({ description: 'some description', handler: handlerSpy });
      await expect(
        bootstrap({ subcommandDir: 'subcommands', rootDir: '/rootDir' }, undefined, 'test-command', requireMock)
      ).resolves.toBeUndefined();
      expect(globMock).toHaveBeenCalledWith('/rootDir/subcommands/**/*', { nodir: true });
      expect(handlerSpy).toHaveBeenCalledWith({ verbosity: 0, 'logger-async': false }, expect.any(Logger));
    });
  });

  describe('malformed commands', () => {
    test('throws if a command does not have a description', async () => {
      globMock.mockReturnValueOnce(['foo/bar.js']);
      const requireMock = () => ({});
      await expect(bootstrap(undefined, undefined, 'foo', requireMock)).rejects.toEqual(
        new Error('Missing description for "foo bar"')
      );
    });

    test('throws if a command does not have a handler', async () => {
      globMock.mockReturnValueOnce(['foo/bar.js']);
      const requireMock = () => ({ description: 'some description' });
      await expect(bootstrap(undefined, undefined, 'foo', requireMock)).rejects.toEqual(
        new Error('Missing handler for "foo bar"')
      );
    });
  });

  describe('aliases', () => {
    test('replaced over the command, calls the correct handler', async () => {
      globMock.mockReturnValueOnce(['/rootDir/food/burritos.js', '/rootDir/food/test-command.js']);
      const handlerSpy = jest.fn();
      const requireMock = (input: string) => {
        if (input.endsWith('burritos.js')) {
          return { description: 'burritos description', handler: async () => {} };
        }
        if (input.endsWith('test-command.js')) {
          return { description: 'tacos description', handler: handlerSpy, alias: 'tacos' };
        }
        return {};
      };

      await expect(bootstrap({ rootDir: '/rootDir' }, undefined, 'food tacos', requireMock)).resolves.toBeUndefined();
      expect(globMock).toHaveBeenCalledWith('/rootDir/**/*', { nodir: true });
      expect(handlerSpy).toHaveBeenCalledWith({ verbosity: 0, 'logger-async': false }, expect.any(Logger));
    });
  });

  describe('positional mapping', () => {
    test('maps positionals in order to keys', async () => {
      const handlerSpy = jest.fn();
      globMock.mockReturnValueOnce(['/tacos.js']);
      const requireMock = () => ({
        description: 'description',
        positionals: {
          topping1: { description: 'topping1' },
          topping2: { description: 'topping2' },
          topping3: { description: 'topping3' },
        },
        handler: handlerSpy,
      });
      await expect(
        bootstrap({ rootDir: '/' }, undefined, 'tacos lettuce peppers onions', requireMock)
      ).resolves.toBeUndefined();

      expect(handlerSpy).toHaveBeenCalledWith(
        {
          topping1: 'lettuce',
          topping2: 'peppers',
          topping3: 'onions',
          verbosity: 0,
          'logger-async': false,
        },
        expect.any(Logger)
      );
    });

    test('maps positionals using greedy', async () => {
      const handlerSpy = jest.fn();
      globMock.mockReturnValueOnce(['/tacos.js']);
      const requireMock = () => ({
        description: 'description',
        positionals: {
          shell: { description: 'shell' },
          toppings: { description: 'toppings', greedy: true },
        },
        handler: handlerSpy,
      });
      await expect(
        bootstrap({ rootDir: '/' }, undefined, 'tacos hard lettuce peppers onions', requireMock)
      ).resolves.toBeUndefined();
      expect(handlerSpy).toHaveBeenCalledWith(
        {
          shell: 'hard',
          toppings: ['lettuce', 'peppers', 'onions'],
          verbosity: 0,
          'logger-async': false,
        },
        expect.any(Logger)
      );
    });

    test('throws if greedy used before last', async () => {
      const handlerSpy = jest.fn();
      globMock.mockReturnValueOnce(['/tacos.js']);
      const requireMock = () => ({
        description: 'description',
        positionals: {
          toppings: { description: 'toppings', greedy: true },
          shell: { description: 'shell' },
        },
        handler: handlerSpy,
      });
      await expect(
        bootstrap({ rootDir: '/' }, undefined, 'tacos hard lettuce peppers onions', requireMock)
      ).rejects.toEqual(
        new Error(
          'Positional "toppings" defined as "greedy", but cannot be because it is not the last positional option'
        )
      );
    });
  });
});
