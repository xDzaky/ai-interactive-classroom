/**
 * manimgx.worker.ts — Client-Side ManimGX Runtime Capability & Static Sandbox Worker (V6)
 *
 * - Probes WebGPU availability (`navigator.gpu`) for browser-side ManimGX acceleration
 * - Validates user-edited Python ManimGX code against forbidden imports/builtins
 *   before rendering or sending to the FastAPI AI service.
 */

export interface ManimGxValidationResult {
  valid: boolean;
  errors: string[];
  runtime: 'browser_webgpu' | 'procedural_canvas' | 'server_mp4';
  webgpuAvailable: boolean;
}

const FORBIDDEN_IMPORT_RE =
  /\b(?:import|from)\s+(os|sys|subprocess|socket|http|urllib|pathlib|shutil|ctypes|pickle|importlib|builtins|pty|signal|multiprocessing|threading)\b/g;

const FORBIDDEN_CALL_RE =
  /\b(eval|exec|compile|__import__|open|getattr|setattr|delattr|globals|locals|vars|input|breakpoint)\s*\(/g;

const FORBIDDEN_DUNDER_RE = /\.__[a-zA-Z0-9_]+__/g;

/**
 * Pure static validator (can also be imported directly in UI/tests without spawning a Worker).
 */
export function validateManimGxSourceClient(code: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!code || !code.trim()) {
    errors.push('Kode Python ManimGX tidak boleh kosong.');
    return { valid: false, errors };
  }

  for (const m of code.matchAll(FORBIDDEN_IMPORT_RE)) {
    errors.push(`Import terlarang terdeteksi: "${m[1]}" tidak diizinkan di sandbox ManimGX.`);
  }
  for (const m of code.matchAll(FORBIDDEN_CALL_RE)) {
    errors.push(`Pemanggilan berbahaya terdeteksi: "${m[1]}()" diblokir oleh sandbox.`);
  }
  for (const m of code.matchAll(FORBIDDEN_DUNDER_RE)) {
    errors.push(`Akses atribut dunder "${m[0]}" diblokir oleh sandbox.`);
  }
  if (!/class\s+\w+\s*\(\s*Scene\s*\)/.test(code)) {
    errors.push('Scene ManimGX harus mendefinisikan subclass `class ...(Scene):`.');
  }
  if (!/def\s+construct\s*\(\s*self\s*\)/.test(code)) {
    errors.push('Scene ManimGX harus memiliki method `def construct(self):`.');
  }

  return { valid: errors.length === 0, errors };
}

export async function probeManimGxRuntime(code: string): Promise<ManimGxValidationResult> {
  const check = validateManimGxSourceClient(code);
  let webgpuAvailable = false;
  try {
    const nav = globalThis.navigator as Navigator & {
      gpu?: { requestAdapter?: () => Promise<unknown | null> };
    };
    if (nav?.gpu?.requestAdapter) {
      const adapter = await nav.gpu.requestAdapter();
      webgpuAvailable = Boolean(adapter);
    }
  } catch {
    webgpuAvailable = false;
  }

  return {
    valid: check.valid,
    errors: check.errors,
    runtime: webgpuAvailable ? 'browser_webgpu' : 'procedural_canvas',
    webgpuAvailable,
  };
}

// Web Worker message handler
if (typeof self !== 'undefined' && typeof (self as unknown as { postMessage?: unknown }).postMessage === 'function') {
  self.onmessage = async (event: MessageEvent<{ id: string; type: 'validate_and_probe'; code: string }>) => {
    const msg = event.data;
    if (msg?.type === 'validate_and_probe') {
      const result = await probeManimGxRuntime(msg.code);
      self.postMessage({ id: msg.id, result });
    }
  };
}
