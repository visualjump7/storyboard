import 'server-only';

import { createHmac, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'storyboard-camera-references';
const COOKIE_PATH = '/camera-references';
const SESSION_SECONDS = 8 * 60 * 60;
const SIGNING_PURPOSE = 'storyboard:camera-references:session:v1';
const PASSWORD_SALT = '5c432647f53c7de92f537d0e743249fc';
const FALLBACK_PASSWORD_HASH = '56441255a76b42444a925716ade95d38ef38b84d3fffb8b37654efd344f49641';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Credential = { digest: Buffer; fingerprint: string; key: Buffer };
type Session = { version: 1; userId: string; issuedAt: number; expiresAt: number; credential: string };
type UnlockResult = 'unlocked' | 'incorrect-password' | 'unavailable';

let cachedOverride: string | undefined;
let cachedOverrideDigest: Buffer | undefined;

function credential(): Credential | null {
  const secret = (process.env.CAMERA_REFERENCES_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  if (!secret || secret.length > 16384) return null;

  const override = process.env.CAMERA_REFERENCES_PASSWORD;
  let digest: Buffer;
  if (override === undefined) {
    digest = Buffer.from(FALLBACK_PASSWORD_HASH, 'hex');
  } else {
    const password = override.trim();
    if (!password || password.length > 256 || Buffer.byteLength(password, 'utf8') > 1024) return null;
    if (password !== cachedOverride || !cachedOverrideDigest) {
      cachedOverrideDigest = scryptSync(password, PASSWORD_SALT, 32);
      cachedOverride = password;
    }
    digest = cachedOverrideDigest;
  }

  // Derive a separate key so an existing server secret cannot sign tokens for
  // another app feature using this protocol.
  const key = createHmac('sha256', secret).update(SIGNING_PURPOSE).digest();
  const fingerprint = createHmac('sha256', key).update('credential:').update(PASSWORD_SALT).update(digest).digest('base64url');
  return { digest, fingerprint, key };
}

function signature(payload: string, key: Buffer): Buffer {
  return createHmac('sha256', key).update(`${SIGNING_PURPOSE}:${payload}`).digest();
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: COOKIE_PATH,
  };
}

/** This extra gate supplements, and never replaces, the main Supabase session. */
export function hasCameraReferenceAccess(userId: string): boolean {
  if (!UUID.test(userId)) return false;
  try {
    const material = credential();
    const value = cookies().get(COOKIE_NAME)?.value;
    if (!material || !value || value.length > 2048) return false;
    const parts = value.split('.');
    if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return false;
    const actual = Buffer.from(parts[1], 'base64url');
    const expected = signature(parts[0], material.key);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;

    const session: unknown = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (!session || typeof session !== 'object') return false;
    const candidate = session as Partial<Session>;
    const now = Math.floor(Date.now() / 1000);
    return candidate.version === 1 && candidate.userId === userId &&
      candidate.credential === material.fingerprint &&
      typeof candidate.issuedAt === 'number' && Number.isSafeInteger(candidate.issuedAt) &&
      typeof candidate.expiresAt === 'number' && Number.isSafeInteger(candidate.expiresAt) &&
      candidate.issuedAt <= now && candidate.expiresAt > now &&
      candidate.expiresAt - candidate.issuedAt === SESSION_SECONDS;
  } catch {
    return false;
  }
}

/** Only call after validating the main session with Supabase auth.getUser(). */
export async function unlockCameraReferenceAccess(userId: string, password: string): Promise<UnlockResult> {
  if (!UUID.test(userId)) return 'unavailable';
  if (!password || password.length > 256 || Buffer.byteLength(password, 'utf8') > 1024) return 'incorrect-password';
  const material = credential();
  if (!material) return 'unavailable';

  const submitted = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, PASSWORD_SALT, 32, (error, digest) => error ? reject(error) : resolve(digest));
  });
  if (!timingSafeEqual(submitted, material.digest)) return 'incorrect-password';

  const issuedAt = Math.floor(Date.now() / 1000);
  const session: Session = { version: 1, userId, issuedAt, expiresAt: issuedAt + SESSION_SECONDS, credential: material.fingerprint };
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  const value = `${payload}.${signature(payload, material.key).toString('base64url')}`;
  cookies().set(COOKIE_NAME, value, {
    ...cookieOptions(),
    maxAge: SESSION_SECONDS,
    expires: new Date(session.expiresAt * 1000),
  });
  return 'unlocked';
}

export function clearCameraReferenceAccess(): void {
  // Match the original path explicitly; deleting a root-path cookie would
  // leave this section's cookie in place.
  cookies().set(COOKIE_NAME, '', { ...cookieOptions(), maxAge: 0, expires: new Date(0) });
}

/** Keep redirects on this route and admit only bounded project IDs/shot slugs. */
export function cameraReferenceReturnPath(project?: unknown, shot?: unknown): string {
  const query = new URLSearchParams();
  if (typeof project === 'string' && UUID.test(project)) query.set('project', project);
  if (typeof shot === 'string' && /^[a-z0-9][a-z0-9-]{0,99}$/i.test(shot)) query.set('shot', shot);
  return `${COOKIE_PATH}${query.size ? `?${query}` : ''}`;
}
