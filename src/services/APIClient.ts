// frontend/src/services/api.ts
const API_BASE =  "http://localhost:8000";

async function request(path: string, opts: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { ...opts });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function fetchHierarchy(level: string, params?: Record<string, string | undefined>) {
  const url = new URL(`${API_BASE}/api/rtms/filters/units`); // Create URL object
  if (params) {
    Object.entries(params).forEach(([k, v]) => v ? url.searchParams.set(k, v) : null);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to fetch hierarchy: ${res.statusText}`);
  return res.json();
}

export async function fetchAnalyze(params?: Record<string, string | undefined | number>) {
  const url = new URL(`${API_BASE}/api/rtms/analyze`);
  if (params) Object.entries(params).forEach(([k, v]) => v ? url.searchParams.set(k, String(v)) : null);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to fetch analyze: ${res.statusText}`);
  return res.json();
}

export async function fetchAlerts(params?: Record<string, string | undefined | number>) {
  const url = new URL(`${API_BASE}/api/rtms/alerts`);
  if (params) Object.entries(params).forEach(([k, v]) => v ? url.searchParams.set(k, String(v)) : null);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to fetch alerts: ${res.statusText}`);
  return res.json();
}

export async function testWhatsapp() {
  const res = await fetch(`${API_BASE}/api/rtms/test-whatsapp`);
  if (!res.ok) throw new Error("WhatsApp stub failed");
  return res.json();
}
