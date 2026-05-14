import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { device_id } = await req.json();

    if (!device_id) {
      return Response.json({ allowed: true, message: '' }, {
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const device = await kv.hgetall(`device:${device_id}`);

    // If device not found, allow (not registered yet)
    if (!device || !device.device_id) {
      return Response.json({ allowed: true, message: '' }, {
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Update last seen
    await kv.hset(`device:${device_id}`, {
      last_seen: new Date().toISOString(),
    });

    const allowed = device.status !== 'revoked';
    const message = allowed
      ? ''
      : 'Your license has been revoked. Contact @miradegen11 on Telegram for unlocking.';

    return Response.json({ allowed, message }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    // On error, allow (don't lock users out due to server issues)
    return Response.json({ allowed: true, message: '' }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
