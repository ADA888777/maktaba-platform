import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { HttpError } from '../utils/http.js';

/** Accepted upload types: images for covers and PDF for project files */
export const ALLOWED_TYPES: Record<string, string> = {
'image/png': '.png',
'image/jpeg': '.jpg',
'image/webp': '.webp',
'application/pdf': '.pdf',
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

let client: SupabaseClient | null = null;

/** Supabase Storage is used whenever it is configured, so files survive every redeploy */
export const storageConfigured = (): boolean => Boolean(config.supabase.url && config.supabase.serviceKey);

function getClient(): SupabaseClient {
if (!client) {
client = createClient(config.supabase.url, config.supabase.serviceKey, {
auth: { persistSession: false, autoRefreshToken: false },
});
}
return client;
}

/** Checks the real file signature and not only the declared mime type */
export function matchesSignature(buf: Buffer, mimetype: string): boolean {
if (buf.length < 12) return false;
if (mimetype === 'image/png') return buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
if (mimetype === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8;
if (mimetype === 'image/webp') return buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
if (mimetype === 'application/pdf') return buf.toString('ascii', 0, 4) === '%PDF';
return false;
}

function buildObjectName(mimetype: string): string {
const ext = ALLOWED_TYPES[mimetype] ?? '';
const day = new Date().toISOString().slice(0, 10);
return `${day}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
}

/**
* Stores an uploaded file and returns its public URL.
* Supabase Storage in production; a local folder only when Supabase is not configured (development).
*/
export async function saveUpload(file: { buffer: Buffer; mimetype: string }): Promise<string> {
if (!ALLOWED_TYPES[file.mimetype]) throw new HttpError(400, 'نوع الملف غير مدعوم. المسموح: PNG, JPG, WEBP, PDF');
if (!matchesSignature(file.buffer, file.mimetype)) throw new HttpError(400, 'محتوى الملف لا يطابق نوعه');
const name = buildObjectName(file.mimetype);

if (storageConfigured()) {
const bucket = config.supabase.bucket;
const { error } = await getClient().storage.from(bucket).upload(name, file.buffer, {
contentType: file.mimetype,
cacheControl: '31536000',
upsert: false,
});
if (error) {
console.error('[storage] upload failed:', error.message);
throw new HttpError(502, 'تعذر رفع الملف إلى مساحة التخزين، حاولي مرة أخرى');
}
const { data } = getClient().storage.from(bucket).getPublicUrl(name);
return data.publicUrl;
}

const fileName = name.replace('/', '-');
fs.mkdirSync(config.uploadsDir, { recursive: true });
fs.writeFileSync(path.join(config.uploadsDir, fileName), file.buffer);
return `/uploads/${fileName}`;
}

/** Deletes a previously stored object when its public URL belongs to our bucket */
export async function deleteUpload(publicUrl: string): Promise<void> {
if (!storageConfigured() || !publicUrl) return;
const marker = `/storage/v1/object/public/${config.supabase.bucket}/`;
const index = publicUrl.indexOf(marker);
if (index === -1) return;
const objectName = decodeURIComponent(publicUrl.slice(index + marker.length));
const { error } = await getClient().storage.from(config.supabase.bucket).remove([objectName]);
if (error) console.error('[storage] delete failed:', error.message);
}
