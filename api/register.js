import { getDb, saveDb } from './storage.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
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

  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  try {
    const { device_id, machine_name, license_type } = await req.json();
    if (!device_id) return Response.json({ error: 'Missing device_id' }, { status: 400 });

    const db = await getDb();
    let device = db.devices.find(d => d.device_id === device_id);

    if (device) {
      device.last_seen = new Date().toISOString();
      if (machine_name) device.machine_name = machine_name;
      if (license_type) device.license_type = license_type;
    } else {
      db.devices.push({
        device_id,
        machine_name: machine_name || 'Unknown',
        license_type: license_type || 'trial',
        activated_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        status: 'active',
      });
    }

    await saveDb(db);

    return Response.json({ status: 'registered' }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return Response.json({ error: 'Server error' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' }});
  }
}
