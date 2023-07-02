const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Wait for tRPC-powered API to be ready before failing.
 */
export async function trpcWait(
  trpc: any /* eslint-disable-line @typescript-eslint/no-explicit-any */,
  retries = 5,
  sleep = 2_000,
  counter = 0
): Promise<boolean> {
  try {
    const r = await trpc.health.check.query();
    console.log('✅ API is ready, proceeding');
    if (r === 1) return true;
  } catch {
    if (counter >= retries) {
      console.log(`❌ API unavailable, aborting after ${counter} retries`);
      return false;
    }
    console.log('⏳ API is not ready, waiting...');
    await delay(sleep);
    return await trpcWait(trpc, retries, sleep, ++counter);
  }
  return false;
}
