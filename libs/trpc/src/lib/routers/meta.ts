import { t } from '../server';

// serve meta information for client consumption
export const metaProcedure = t.procedure.query(async () => {
  return {
    env: process.env['NODE_ENV'] ?? '',
    address: {
      Add: process.env['ZKAPP_ADDRESS_ADD'] ?? '',
      ZKKV: process.env['ZKAPP_ADDRESS_ZKKV'] ?? '',
    },
    url: {
      auth: process.env['AUTH_URL'] ?? '',
    },
  };
});
