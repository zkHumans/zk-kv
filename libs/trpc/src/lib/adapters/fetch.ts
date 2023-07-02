import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { Context } from '../context';

export async function fetchCreateContext({
  req,
}: FetchCreateContextFnOptions): Promise<Context> {
  // get token from headers, for example: wget --header='Authorization: Token <api_token>'
  const APIToken = req.headers.get('Authorization')?.replace(/^Token /, '');
  return { APIToken };
}
