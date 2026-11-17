// A read started under one identity must never populate another identity's stores.
let revision = 0;
let pendingWrites = 0;

export function getAccountDataRevision(): number { return revision; }
export function invalidateAccountData(): void { revision++; }
export function hasPendingAccountWrites(): boolean { return pendingWrites > 0; }

export const accountScopedFetch: typeof fetch = async (input, init) => {
  const url = String(input instanceof Request ? input.url : input);
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(method)
    && /\/(rest|storage|functions)\/v1\//.test(url);
  if (isWrite) pendingWrites++;
  try {
    const response = await fetch(input, init);
    // Keep writes marked pending until their response body has arrived.
    if (isWrite) await response.clone().arrayBuffer();
    return response;
  } finally {
    if (isWrite) pendingWrites--;
  }
};
