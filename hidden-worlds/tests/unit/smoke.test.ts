import { describe, expect, it } from 'vitest';
import { APP_NAME } from '../../src/config';

describe('scaffold', () => {
  it('has an app name', () => {
    expect(APP_NAME.length).toBeGreaterThan(0);
  });
});
