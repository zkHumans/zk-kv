export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// https://stackoverflow.com/a/264180
export function strToBool(s: string | undefined): boolean | undefined {
  return s === undefined ? undefined : RegExp(/^\s*(true|1|on)\s*$/i).test(s);
}

// Show first 6 and last 4 characters of user's Mina account.
export const displayAccount = (account: string) =>
  `${account.slice(0, 6)}...${account.slice(-4)}`;
