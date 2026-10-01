/**
 * Client for the indexer's HTTP API (indexer/src/api). The feed, token pages
 * and receipts read indexed on-chain data from here.
 */
const baseUrl = process.env.EXPO_PUBLIC_INDEXER_URL;

/** POST a JSON body to one of the indexer's own routes (indexer/src/api) and return its JSON. */
export async function indexerPost<T>(path: `/${string}`, body: unknown): Promise<T> {
  if (!baseUrl) throw new Error('Missing EXPO_PUBLIC_INDEXER_URL — see app/.env.example');

  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Indexer request failed: ${res.status}`);
  return (await res.json()) as T;
}

export async function indexerGraphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (!baseUrl) throw new Error('Missing EXPO_PUBLIC_INDEXER_URL — see app/.env.example');

  const res = await fetch(`${baseUrl}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Indexer request failed: ${res.status}`);

  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (body.errors?.length || body.data === undefined) {
    throw new Error(`Indexer query failed: ${body.errors?.[0]?.message ?? 'no data'}`);
  }
  return body.data;
}
