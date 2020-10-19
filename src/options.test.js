// @flow
import parseOptions, { validate } from './options';

const defaultOptions = Object.freeze({
  alias: { help: 'h' },
  array: [],
  boolean: ['help'],
  count: [],
  default: {},
  normalize: [],
  number: [],
  string: [],
});

const description = 'descriptions are required';

describe('parseOptions', () => {
  describe('alias', () => {
    test('single alias', () => {
      expect(parseOptions({ foo: { description, alias: 'f', type: 'string' } })).toEqual({
        ...defaultOptions,
        alias: { help: 'h', foo: 'f' },
        string: ['foo'],
      });
    });

    test('array of aliases', () => {
      expect(parseOptions({ foo: { description, alias: ['f', 'b'], type: 'string' } })).toEqual({
        ...defaultOptions,
        alias: { help: 'h', foo: ['f', 'b'] },
        string: ['foo'],
      });
    });
  });

  test('array', () => {
    expect(parseOptions({ foo: { description, type: 'array' }, bar: { description, type: 'array' } })).toEqual({
      ...defaultOptions,
      array: ['foo', 'bar'],
    });
  });

  test('boolean', () => {
    expect(parseOptions({ foo: { description, type: 'boolean' }, bar: { description, type: 'boolean' } })).toEqual({
      ...defaultOptions,
      boolean: ['help', 'foo', 'bar'],
    });
  });

  test('count', () => {
    expect(parseOptions({ foo: { description, type: 'count' }, bar: { description, type: 'count' } })).toEqual({
      ...defaultOptions,
      count: ['foo', 'bar'],
    });
  });

  test('default', () => {
    expect(
      parseOptions({
        foo: { description, type: 'string', default: 'foo default' },
        bar: { description, type: 'number', default: 2 },
      })
    ).toEqual({
      ...defaultOptions,
      string: ['foo'],
      number: ['bar'],
      default: { foo: 'foo default', bar: 2 },
    });
  });

  test('normalize', () => {
    expect(
      parseOptions({ foo: { description, type: 'string', normalize: true }, bar: { description, type: 'string' } })
    ).toEqual({
      ...defaultOptions,
      normalize: ['foo'],
      string: ['foo', 'bar'],
    });
  });

  test('number', () => {
    expect(parseOptions({ foo: { description, type: 'number' }, bar: { description, type: 'number' } })).toEqual({
      ...defaultOptions,
      number: ['foo', 'bar'],
    });
  });

  test('string', () => {
    expect(parseOptions({ foo: { description, type: 'string' }, bar: { description, type: 'string' } })).toEqual({
      ...defaultOptions,
      string: ['foo', 'bar'],
    });
  });

  test('invalid type', () => {
    expect(() =>
      parseOptions(
        // $FlowExpectedError
        { foo: { description, type: 'foobar' } }
      )
    ).toThrow(new Error('Option "foo" has invalid type "foobar"'));
  });
});

describe('validate', () => {
  test('returns no errors', () => {
    expect(validate({ _: {} }, {}, {})).toEqual({ _isValid: true, _: {}, _unknown: [] });
  });

  describe('positionals', () => {
    test('required positional not provided', () => {
      expect(
        // $FlowExpectedError
        validate({ _: {} }, { foo: { required: true, description: 'required positional' } }, {})
      ).toEqual({
        _isValid: false,
        _: { foo: [new Error('No value provided for required positional "<foo>"')] },
        _unknown: [],
      });
    });

    test('required positional provided', () => {
      expect(
        // $FlowFixMe this should be working
        validate({ _: { foo: 'foo-value' } }, { foo: { required: true, description: 'required positional' } }, {})
      ).toEqual({
        _isValid: true,
        _: { foo: [] },
        _unknown: [],
      });
    });
  });

  describe('options', () => {
    test('string not in choices', () => {
      expect(
        // $FlowExpectedError
        validate({ _: {}, foo: 'tacos' }, {}, { foo: { description, type: 'string', choices: ['bar', 'qux'] } })
      ).toEqual({
        _isValid: false,
        _: {},
        _unknown: [],
        foo: [new Error('Value "tacos" for "--foo" failed to match one of "bar", "qux"')],
      });
    });

    test('string in choices', () => {
      expect(
        // $FlowExpectedError
        validate({ _: {}, foo: 'bar' }, {}, { foo: { description, type: 'string', choices: ['bar', 'qux'] } })
      ).toEqual({
        _isValid: true,
        _: {},
        _unknown: [],
        foo: [],
      });
    });

    test('required option not provided', () => {
      expect(
        // $FlowExpectedError
        validate({ _: {} }, {}, { foo: { description, type: 'string', required: true } })
      ).toEqual({
        _isValid: false,
        _: {},
        _unknown: [],
        foo: [new Error('No value provided for required argument "--foo"')],
      });
    });

    test('no error if required option is provided', () => {
      expect(
        // $FlowExpectedError
        validate({ _: {}, foo: 'foobar' }, {}, { foo: { description, type: 'string', required: true } })
      ).toEqual({
        _isValid: true,
        _: {},
        _unknown: [],
        foo: [],
      });
    });
  });

  test('returns errors for unknown options', () => {
    expect(
      // $FlowExpectedError
      validate({ _: {}, foo: 'is unknown', bar: 'is also uknown' }, {}, {})
    ).toEqual({
      _isValid: false,
      _: {},
      _unknown: [new Error('Received unknown argument "--foo"'), new Error('Received unknown argument "--bar"')],
    });
  });
});
