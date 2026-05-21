import { SignJWT, jwtVerify } from 'jose';
import { serverEnv } from '@/lib/env/server.env';

function getSecretKey(env: Env) {
  const secret = serverEnv(env).JWT_SECRET || 'default-secret-change-me';
  return new TextEncoder().encode(secret);
}

/**
 * 签发文章访问令牌（默认有效期 30 分钟）
 */
export async function createPostAccessToken(
  env: Env,
  slug: string,
  expiresIn = '30m',
): Promise<string> {
  const secret = getSecretKey(env);
  return new SignJWT({ slug })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresIn)
    .sign(secret);
}

/**
 * 验证令牌，成功返回 payload，失败返回 null
 */
export async function verifyToken(
  env: Env,
  token: string,
): Promise<{ slug: string } | null> {
  try {
    const secret = getSecretKey(env);
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.slug === 'string') {
      return { slug: payload.slug };
    }
    return null;
  } catch {
    return null;
  }
}
