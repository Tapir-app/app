/* Schrankblick standalone runtime: local storage, photo store, optional AI key, file sharing. */
(() => {
"use strict";
const LS_KEY = "schrankblick:v1";
const KEY_AI = "schrankblick:ai-key";
const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));

/* ---------- photos in IndexedDB ---------- */
let idbP = null;
function idb() {
  if (idbP) return idbP;
  idbP = new Promise((res, rej) => {
    const r = indexedDB.open("schrankblick", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("blobs");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return idbP;
}
async function tx(mode, fn) {
  const d = await idb();
  return new Promise((res, rej) => {
    const t = d.transaction("blobs", mode), s = t.objectStore("blobs");
    const out = fn(s);
    t.oncomplete = () => res(out && "result" in out ? out.result : undefined);
    t.onerror = () => rej(t.error);
  });
}
const urls = new Map();
const blobs = {
  async put(id, blob) { await tx("readwrite", s => s.put(blob, id)); if (urls.has(id)) URL.revokeObjectURL(urls.get(id)); urls.set(id, URL.createObjectURL(blob)); },
  async get(id) { return tx("readonly", s => s.get(id)); },
  async del(id) { await tx("readwrite", s => s.delete(id)); if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); } },
  async keys() { return tx("readonly", s => s.getAllKeys()); },
  async clear() { await tx("readwrite", s => s.clear()); urls.forEach(u => URL.revokeObjectURL(u)); urls.clear(); },
  async preload() { try { for (const k of await this.keys()) { const b = await this.get(k); if (b) urls.set(k, URL.createObjectURL(b)); } } catch {} },
  url(id) { return urls.get(id) || ""; }
};

/* ---------- documents in localStorage ---------- */
let store = { items: {}, listings: {}, plan: null };
try { const raw = localStorage.getItem(LS_KEY); if (raw) store = Object.assign(store, JSON.parse(raw)); } catch {}
const listeners = { items: new Set(), listings: new Set(), plan: new Set() };
function persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(store)); }
  catch (e) { throw { code: "quota_exceeded" }; }
}
function snapOf(name) {
  if (name === "plan") return { exists: !!store.plan, data: () => clone(store.plan) };
  const docs = Object.entries(store[name]).map(([id, v]) => ({ id, data: () => clone(v) }));
  return { empty: !docs.length, docs };
}
function emit(name) { const s = snapOf(name); listeners[name].forEach(cb => { try { cb(s); } catch (e) { console.error(e); } }); }
function coll(name) {
  return {
    doc: id => ({
      async set(body) { store[name][id] = clone(body); persist(); emit(name); },
      async update(patch) { store[name][id] = Object.assign(store[name][id] || {}, clone(patch)); persist(); emit(name); },
      async delete() { delete store[name][id]; persist(); emit(name); }
    }),
    onSnapshot(cb) { listeners[name].add(cb); setTimeout(() => cb(snapOf(name)), 0); return () => listeners[name].delete(cb); }
  };
}
const planDoc = {
  async set(v) { store.plan = clone(v); persist(); emit("plan"); },
  onSnapshot(cb) { listeners.plan.add(cb); setTimeout(() => cb(snapOf("plan")), 0); return () => listeners.plan.delete(cb); }
};

const assets = {
  async upload(blob) { const id = "ph" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); await blobs.put(id, blob); return { id }; },
  async delete(id) { await blobs.del(id); }
};

/* ---------- optional AI with the owner's own key ---------- */
function aiKey() { try { return localStorage.getItem(KEY_AI) || ""; } catch { return ""; } }
const b64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(blob); });
function makeSample() {
  const key = aiKey();
  if (!key) return null;
  const call = async (prompt, opts = {}) => {
    const content = [];
    for (const img of (opts.images || []).slice(0, 5)) content.push({ type: "image", source: { type: "base64", media_type: img.type || "image/jpeg", data: await b64(img) } });
    content.push({ type: "text", text: prompt });
    let r;
    try {
      r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2026-10-21",
          "anthropic-beta": "server-side-fallback-2026-07-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-opus-5-5",
          max_tokens: 16000,
          output_config: { effort: opts.modelTier === "quick" ? "low" : "medium" },
          fallbacks: "default",
          messages: [{ role: "user", content }]
        })
      });
    } catch { throw { code: "network" }; }
    if (r.status === 401 || r.status === 403) throw { code: "bad_key" };
    if (r.status === 429) throw { code: "rate_limited" };
    if (!r.ok) throw { code: "api_error", status: r.status };
    const m = await r.json();
    if (m.stop_reason === "refusal") throw { code: "refused" };
    return (m.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  };
  const fn = async (prompt, opts) => ({ text: await call(prompt, opts), truncated: false });
  fn.json = async (prompt, opts) => {
    const t = await call(prompt + "\nGib nur das JSON aus, ohne Erklärung und ohne Codeblock.", opts);
    const s = t.indexOf("{"), e = t.lastIndexOf("}");
    if (s < 0 || e < s) throw { code: "invalid_json" };
    try { return JSON.parse(t.slice(s, e + 1)); } catch { throw { code: "invalid_json" }; }
  };
  fn.limits = async () => ({ images: { maxCount: 5 } });
  return fn;
}

/* ---------- give the viewer a file ---------- */
const downloads = {
  async save({ filename, data }) {
    const file = new File([data], filename, { type: data.type || "application/octet-stream" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return; }
      catch (e) { if (e && e.name === "AbortError") throw { code: "declined" }; }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
};

/* ---------- backup ---------- */
const toDataUrl = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
async function exportAll() {
  const photos = {};
  for (const k of await blobs.keys()) { const b = await blobs.get(k); if (b) photos[k] = await toDataUrl(b); }
  return new Blob([JSON.stringify({ app: "schrankblick", version: 1, exportedAt: new Date().toISOString(), data: store, photos })], { type: "application/json" });
}
async function importAll(file) {
  const j = JSON.parse(await file.text());
  if (j?.app !== "schrankblick" || !j.data) throw new Error("format");
  await blobs.clear();
  for (const [k, u] of Object.entries(j.photos || {})) { const b = await (await fetch(u)).blob(); await blobs.put(k, b); }
  store = { items: j.data.items || {}, listings: j.data.listings || {}, plan: j.data.plan || null };
  persist(); emit("items"); emit("listings"); emit("plan");
}
async function wipe() {
  store = { items: {}, listings: {}, plan: null };
  try { localStorage.removeItem(LS_KEY); } catch {}
  await blobs.clear();
  emit("items"); emit("listings"); emit("plan");
}

window.SB = {
  db: { items: coll("items"), listings: coll("listings"), plan: planDoc },
  hasData: () => Object.keys(store.items).length > 0,
  assets, blobs, downloads, makeSample, aiKey,
  setAiKey(k) { try { if (k) localStorage.setItem(KEY_AI, k); else localStorage.removeItem(KEY_AI); } catch {} },
  exportAll, importAll, wipe
};
})();
