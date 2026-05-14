import { getDb, saveDb } from '../storage.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
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

  const adminKey = process.env.ADMIN_KEY || 'dragler_admin_2024';
  const authHeader = req.headers.get('Authorization');

  if (authHeader !== `Bearer ${adminKey}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const headers = { 'Access-Control-Allow-Origin': '*' };

  try {
    const db = await getDb();

    if (req.method === 'GET') {
      const devices = db.devices || [];
      devices.sort((a, b) => new Date(b.activated_at || 0) - new Date(a.activated_at || 0));
      return Response.json({ devices }, { headers });
    }

    if (req.method === 'POST') {
      const { device_id, action } = await req.json();
      if (!device_id || !action) return Response.json({ error: 'Missing device_id or action' }, { status: 400, headers });

      const deviceIndex = db.devices.findIndex(d => d.device_id === device_id);

      if (deviceIndex === -1) {
        return Response.json({ error: 'Device not found' }, { status: 404, headers });
      }

      if (action === 'revoke') {
        db.devices[deviceIndex].status = 'revoked';
        await saveDb(db);
        return Response.json({ status: 'revoked', device_id }, { headers });
      }

      if (action === 'restore') {
        db.devices[deviceIndex].status = 'active';
        await saveDb(db);
        return Response.json({ status: 'active', device_id }, { headers });
      }

      if (action === 'delete') {
        db.devices.splice(deviceIndex, 1);
        await saveDb(db);
        return Response.json({ status: 'deleted', device_id }, { headers });
      }

      return Response.json({ error: 'Unknown action' }, { status: 400, headers });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405, headers });
  } catch (err) {
    return Response.json({ error: 'Server error: ' + err.message }, { status: 500, headers });
  }
}
