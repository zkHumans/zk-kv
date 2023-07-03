import { displayAccount, strToBool } from './utils';

describe('utils', () => {
  it('strToBool', () => {
    expect(strToBool('0')).toEqual(false);
    expect(strToBool('1')).toEqual(true);
    expect(strToBool('ON')).toEqual(true);
    expect(strToBool('foo')).toEqual(false);
    expect(strToBool('true')).toEqual(true);
    expect(strToBool(undefined)).toEqual(undefined);
  });

  it('displayAccount', () => {
    expect(
      displayAccount('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
    ).toEqual('XXXXXX...XXXX');
  });
});
