import bootstrap from '.';
import glob from 'glob';

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
      expect(handlerSpy).toHaveBeenCalledWith({ _: {} });
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
          'foo',
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
          'foo',
          // $FlowFixMe passing mock as typeof require
          requireMock
        )
      ).rejects.toEqual(new Error('Missing handler for "foo bar"'));
    });
  });

  describe('aliases', () => {
    test('replaced over the command, calls the correct handler', async () => {
      globMock.mockReturnValueOnce(['/rootDir/food/burritos.js', '/rootDir/food/test-command.js']);
      const handlerSpy = jest.fn();
      requireMock
        .mockReturnValueOnce({ description: 'burritos description', handler: handlerSpy })
        .mockReturnValueOnce({ description: 'tacos description', handler: handlerSpy, alias: 'tacos' });

      await expect(
        bootstrap(
          { rootDir: '/rootDir' },
          undefined,
          'food tacos',
          // $FlowFixMe passing mock as typeof require
          requireMock
        )
      ).resolves.toBeUndefined();
      expect(globMock).toHaveBeenCalledWith('/rootDir/**/*', { nodir: true });
      expect(requireMock).toHaveBeenCalledWith('/rootDir/food/test-command.js');
      expect(handlerSpy).toHaveBeenCalledWith({ _: {} });
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

      expect(handlerSpy).toHaveBeenCalledWith({ _: { topping1: 'lettuce', topping2: 'peppers', topping3: 'onions' } });
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
      expect(handlerSpy).toHaveBeenCalledWith({ _: { shell: 'hard', toppings: ['lettuce', 'peppers', 'onions'] } });
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
});
