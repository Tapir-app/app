/* Giyo: Kleidung auf dem Handy erkennen. Kein Foto verlässt das Gerät.
   Modell: Marqo-FashionSigLIP (Bildteil, 4-Bit), Laufzeit: ONNX Runtime Web (WebAssembly).
   Die Texte der Arten und Farben wurden vorab in Zahlen umgerechnet (labels.json). */
import * as ort from "./ort.wasm.min.mjs";

const BASE = new URL("./", import.meta.url).href;
ort.env.wasm.wasmPaths = BASE;
ort.env.wasm.numThreads = 1; // GitHub Pages erlaubt keine Threads (fehlende Isolations-Header)
ort.env.logLevel = "error";

let ready = null;
let labels = null;

function unpack(x) {
  const bin = atob(x.q), q = new Int8Array(bin.length);
  for (let i = 0; i < bin.length; i++) q[i] = (bin.charCodeAt(i) << 24) >> 24;
  const v = new Float32Array(q.length);
  for (let i = 0; i < q.length; i++) v[i] = q[i] * x.s;
  return v;
}

/* Lädt Modell und Daten mit Fortschritt (0..1). Beim zweiten Mal kommen sie aus dem Speicher des Handys. */
export function laden(onProgress) {
  if (ready) return ready;
  ready = (async () => {
    const lr = await fetch(BASE + "labels.json");
    if (!lr.ok) throw new Error("labels");
    const raw = await lr.json();
    labels = { ...raw, arten: raw.arten.map(a => ({ ...a, v: unpack(a) })), farben: raw.farben.map(f => ({ ...f, v: unpack(f) })) };
    const res = await fetch(BASE + "modell.onnx");
    if (!res.ok) throw new Error("modell");
    const total = Number(res.headers.get("content-length")) || 61181030;
    let buf;
    if (res.body && onProgress) {
      const reader = res.body.getReader(), parts = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value); got += value.length;
        onProgress(Math.min(1, got / total));
      }
      buf = new Uint8Array(got);
      let o = 0; for (const p of parts) { buf.set(p, o); o += p.length; }
    } else buf = new Uint8Array(await res.arrayBuffer());
    const session = await ort.InferenceSession.create(buf, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
    return session;
  })();
  ready.catch(() => { ready = null; });
  return ready;
}

async function pixels(blob) {
  const n = labels.groesse;
  const bmp = await createImageBitmap(blob);
  const c = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(n, n) : Object.assign(document.createElement("canvas"), { width: n, height: n });
  const x = c.getContext("2d", { willReadFrequently: true });
  x.fillStyle = "#fff"; x.fillRect(0, 0, n, n);
  x.drawImage(bmp, 0, 0, n, n); // wie beim Training: ganzes Bild auf 224 × 224
  bmp.close?.();
  const d = x.getImageData(0, 0, n, n).data, out = new Float32Array(3 * n * n), { mean, std } = labels;
  for (let i = 0; i < n * n; i++) for (let k = 0; k < 3; k++) out[k * n * n + i] = (d[i * 4 + k] / 255 - mean[k]) / std[k];
  return new ort.Tensor("float32", out, [1, 3, n, n]);
}

const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

/* Ergebnis: { cat, type, color, arten: [{cat, type}] (beste 6), sicher: 0..1 } */
export async function erkennen(blob) {
  const session = await laden();
  const out = await session.run({ pixel_values: await pixels(blob) });
  const e = out.image_embeds.data, n = Math.hypot(...e), v = Float32Array.from(e, z => z / n);
  const arten = labels.arten.map(a => ({ cat: a.cat, type: a.type, s: dot(v, a.v) })).sort((a, b) => b.s - a.s);
  const farben = labels.farben.map(f => ({ color: f.color, s: dot(v, f.v) })).sort((a, b) => b.s - a.s);
  // Sicherheit grob: Abstand zwischen bester und zweitbester Art
  const sicher = Math.max(0, Math.min(1, (arten[0].s - arten[1].s) * 20));
  return { cat: arten[0].cat, type: arten[0].type, color: farben[0].color, arten: arten.slice(0, 6).map(({ cat, type }) => ({ cat, type })), sicher };
}
