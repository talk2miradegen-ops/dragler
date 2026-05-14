import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Verify admin key
  const adminKey = process.env.ADMIN_KEY || 'dragler_admin_2024';
  const authHeader = req.headers.get('Authorization');

  if (authHeader !== `Bearer ${adminKey}`) {
    return Response.json({ error: 'Unauthorized' }, {
      status: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  const headers = { 'Access-Control-Allow-Origin': '*' };

  try {
    // GET — List all devices
    if (req.method === 'GET') {
      const deviceIds = await kv.smembers('devices');

      if (!deviceIds || deviceIds.length === 0) {
        return Response.json({ devices: [] }, { headers });
      }

      const devices = [];
      for (const id of deviceIds) {
        const device = await kv.hgetall(`device:${id}`);
        if (device && device.device_id) {
          devices.push(device);
        }
      }

      // Sort by activated_at descending (newest first)
      devices.sort((a, b) =>
        new Date(b.activated_at || 0) - new Date(a.activated_at || 0)
      );

      return Response.json({ devices }, { headers });
    }

    // POST — Revoke or restore a device
    if (req.method === 'POST') {
      const { device_id, action } = await req.json();

      if (!device_id || !action) {
        return Response.json({ error: 'Missing device_id or action' }, {
          status: 400, headers,
        });
      }

      const device = await kv.hgetall(`device:${device_id}`);

      if (!device || !device.device_id) {
        return Response.json({ error: 'Device not found' }, {
          status: 404, headers,
        });
      }

      if (action === 'revoke') {
        await kv.hset(`device:${device_id}`, { status: 'revoked' });
        return Response.json({ status: 'revoked', device_id }, { headers });
      }

      if (action === 'restore') {
        await kv.hset(`device:${device_id}`, { status: 'active' });
        return Response.json({ status: 'active', device_id }, { headers });
      }

      if (action === 'delete') {
        await kv.del(`device:${device_id}`);
        await kv.srem('devices', device_id);
        return Response.json({ status: 'deleted', device_id }, { headers });
      }

      return Response.json({ error: 'Unknown action' }, {
        status: 400, headers,
      });
    }

    return Response.json({ error: 'Method not allowed' }, {
      status: 405, headers,
    });
  } catch (err) {
    return Response.json({ error: 'Server error: ' + err.message }, {
      status: 500, headers,
    });
  }
}
