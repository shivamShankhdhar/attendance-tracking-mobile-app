/** Read standard OAuth query/fragment fields without logging or persisting tokens. */
export function parseGoogleCallback(url: string) {
  const parsed = new URL(url);
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const query = parsed.searchParams;
  return {
    idToken: fragment.get('id_token') || query.get('id_token'),
    error: fragment.get('error') || query.get('error'),
    errorDescription: fragment.get('error_description') || query.get('error_description'),
  };
}
