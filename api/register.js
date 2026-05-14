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
    const { device_id, machine_name, license_type } = await req.json();

    if (!device_id) {
      return Response.json({ error: 'Missing device_id' }, { status: 400 });
    }

    // Check if device already exists
    const existing = await kv.hgetall(`device:${device_id}`);

    if (existing && existing.device_id) {
      // Update last seen
      await kv.hset(`device:${device_id}`, {
        last_seen: new Date().toISOString(),
        machine_name: machine_name || existing.machine_name,
        license_type: license_type || existing.license_type,
      });
      return Response.json({ status: 'updated' }, {
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Register new device
    await kv.hset(`device:${device_id}`, {
      device_id,
      machine_name: machine_name || 'Unknown',
      license_type: license_type || 'trial',
      activated_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      status: 'active',
    });

    // Add to device index
    await kv.sadd('devices', device_id);

    return Response.json({ status: 'registered' }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return Response.json({ error: 'Server error' }, {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
