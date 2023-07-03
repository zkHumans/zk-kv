import { trpc } from '@zk-kv/trpc-client';

describe('API e2e', () => {
  it('has process.env.API_URL', async () => {
    console.log('API_URL', process.env.API_URL);
    expect(process.env.API_URL).toBeDefined();
  });

  it('/api/health.check', async () => {
    const r = await trpc.health.check.query();
    expect(r).toBe(1);
  });

  it('/api/meta', async () => {
    const meta = await trpc.meta.query();
    console.log('meta', meta);

    expect(meta.env).toEqual(process.env['NODE_ENV']);
    expect(meta.address.Add).toEqual(process.env['ZKAPP_ADDRESS_ADD'] ?? '');
    expect(meta.address.ZKKV).toEqual(process.env['ZKAPP_ADDRESS_ZKKV'] ?? '');
  });
});
