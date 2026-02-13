/**
 * Example backend tests.
 *
 * Keep this file CommonJS so `npm test` works with the current Node test runner config.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Example test suite', () => {
  it('placeholder test - replace with your actual tests', () => {
    assert.strictEqual(true, true);
  });

  it('demonstrates async testing', async () => {
    const promise = Promise.resolve('result');
    const result = await promise;
    assert.strictEqual(result, 'result');
  });

  it('demonstrates deep equality', () => {
    const obj = { foo: 'bar', nested: { value: 42 } };
    assert.deepStrictEqual(obj, { foo: 'bar', nested: { value: 42 } });
  });

  it('demonstrates error testing', () => {
    assert.throws(() => {
      throw new Error('Test error');
    }, { message: 'Test error' });
  });
});
