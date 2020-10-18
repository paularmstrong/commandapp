import bootstrap from '.';
import glob from 'glob';

describe('bootstrap', () => {
  let globMock, requireMock;

  beforeEach(() => {
    globMock = jest.spyOn(glob, 'sync').mockReturnValue([]);
    requireMock = jest.fn();
  });

  describe('malformed commands', () => {
    test('throws if a command does not have a description', async () => {
      globMock.mockReturnValueOnce(['foo/bar.js']);
      requireMock.mockReturnValueOnce({});
      await expect(bootstrap(undefined, undefined, ['foo'], requireMock)).rejects.toEqual(
        new Error('Missing description for "foo bar"')
      );
    });

    test('throws if a command does not have a handler', async () => {
      globMock.mockReturnValueOnce(['foo/bar.js']);
      requireMock.mockReturnValueOnce({ description: 'some description' });
      await expect(bootstrap(undefined, undefined, ['foo'], requireMock)).rejects.toEqual(
        new Error('Missing handler for "foo bar"')
      );
    });
  });
});
