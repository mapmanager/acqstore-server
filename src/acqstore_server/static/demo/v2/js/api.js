// HTTP helpers for AcqStore Server API v2 JSON endpoints.
async function jsonRequest(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(`${payload.error || response.status}: ${payload.message || response.statusText}`);
  }
  return payload;
}
async function getJson(url, options={}) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(`${payload.error || response.status}: ${payload.message || response.statusText}`);
  }
  return payload;
}

export {jsonRequest, getJson};
