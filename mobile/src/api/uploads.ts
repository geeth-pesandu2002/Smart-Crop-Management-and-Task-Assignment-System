import { API_URL } from '../config/env';

export async function uploadFile(uri: string, fieldName = 'file') {
  const url = `${API_URL.replace(/\/+$/, '')}/uploads`;
  const form = new FormData();
  // Extract filename
  const filename = uri.split('/').pop() || 'file';
  // Infer mime type naive
  const match = filename.match(/\.([0-9a-z]+)$/i);
  const type = match ? (match[1].toLowerCase() === 'jpg' || match[1].toLowerCase() === 'jpeg' ? 'image/jpeg' : `audio/${match[1]}`) : 'application/octet-stream';
  form.append(fieldName, {
    uri,
    name: filename,
    type,
  } as any);

  const res = await fetch(url, { method: 'POST', body: form });
  if (!res.ok) throw new Error('upload failed');
  return res.json();
}
