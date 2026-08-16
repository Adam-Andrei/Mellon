function bytesToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(base64Url) {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function packData(dataObject) {
  const jsonString = JSON.stringify(dataObject);
  const stream = new Blob([jsonString]).stream();
  const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
  const response = new Response(compressedStream);
  const buffer = await response.arrayBuffer();
  return bytesToBase64Url(buffer);
}

export async function unpackData(base64UrlString) {
  const bytes = base64UrlToBytes(base64UrlString);
  const stream = new Blob([bytes]).stream();
  const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
  const response = new Response(decompressedStream);
  const jsonString = await response.text();
  return JSON.parse(jsonString);
}

export function cardsToPackObject(cards, columns) {
  const obj = {};
  for (const col of columns) {
    const items = cards
      .filter((c) => c.column === col)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((c) => [c.title, c.description || '', c.dueDate || '']);
    if (items.length > 0) obj[col] = items;
  }
  return obj;
}

export function packObjectToCards(obj, columns) {
  const cards = [];
  for (const col of columns) {
    const items = obj[col] || [];
    for (const item of items) {
      let title, description, dueDate;
      if (Array.isArray(item)) {
        [title, description = '', dueDate = ''] = item;
      } else {
        title = item;
        description = '';
        dueDate = '';
      }
      if (!title || !String(title).trim()) continue;
      cards.push({
        title: String(title).trim(),
        description: String(description || '').trim(),
        dueDate: dueDate || null,
        column: col,
      });
    }
  }
  return cards;
}
