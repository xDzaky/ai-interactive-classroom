/**
 * remotePeerBridge.ts — Dual-Transport Mobile Remote & Whiteboard Sync Bridge
 *
 * Works in BOTH:
 * 1. Mode Tanpa Login (/whiteboard) — Serverless 6-digit pairing code + QR + Link
 *    via BroadcastChannel + localStorage cross-tab/same-origin relay + optional WebRTC DataChannel.
 * 2. Authenticated Classroom Room (/room/:id) — Laravel API / Reverb WebSocket transport.
 */

export type RemoteCommandType =
  | 'ping'
  | 'pong'
  | 'laser_move'
  | 'laser_off'
  | 'solid_orbit'
  | 'solid_action'
  | 'remote_stroke'
  | 'zoom_in'
  | 'zoom_out'
  | 'undo'
  | 'redo'
  | 'prev_page'
  | 'next_page'
  | 'blank'
  | 'unblank'
  | 'voice_command';

export interface RemoteCommandMessage {
  code: string;
  sender: 'desktop' | 'mobile';
  type: RemoteCommandType;
  payload?: Record<string, unknown>;
  ts: number;
}

const STORAGE_KEY_PREFIX = 'ai_classroom_remote_msg_';

/** Generate a clean 6-digit pairing code (e.g. "482910") */
export function generatePairingCode(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}

/** Format 6-digit code with hyphen for readability ("482-910") */
export function formatPairingCode(code: string): string {
  const digits = code.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

/** Strip non-digits to canonical 6-digit code */
export function normalizePairingCode(input: string): string {
  return input.replace(/\D/g, '').slice(0, 6);
}

/** Build shareable URLs for QR code & direct link */
export function buildPairingUrls(
  origin: string,
  code: string,
  roomId?: string,
  token?: string,
): { remoteUrl: string; mobileWhiteboardUrl: string } {
  const cleanCode = normalizePairingCode(code);
  const query = roomId && token
    ? `room=${encodeURIComponent(roomId)}&token=${encodeURIComponent(token)}&code=${cleanCode}`
    : `code=${cleanCode}`;
  return {
    remoteUrl: `${origin}/remote?${query}`,
    mobileWhiteboardUrl: `${origin}/whiteboard?peer=${cleanCode}&mode=mobile`,
  };
}

export class RemotePeerBridge {
  private code: string;
  private role: 'desktop' | 'mobile';
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<(msg: RemoteCommandMessage) => void>();
  private storageHandler: ((e: StorageEvent) => void) | null = null;

  constructor(code: string, role: 'desktop' | 'mobile') {
    this.code = normalizePairingCode(code);
    this.role = role;

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(`ai-classroom-remote-${this.code}`);
        this.channel.onmessage = (ev) => {
          const msg = ev.data as RemoteCommandMessage;
          if (msg && msg.code === this.code && msg.sender !== this.role) {
            this.emit(msg);
          }
        };
      } catch {
        this.channel = null;
      }
    }

    if (typeof window !== 'undefined') {
      this.storageHandler = (e: StorageEvent) => {
        if (e.key !== `${STORAGE_KEY_PREFIX}${this.code}` || !e.newValue) return;
        try {
          const msg = JSON.parse(e.newValue) as RemoteCommandMessage;
          if (msg && msg.code === this.code && msg.sender !== this.role) {
            this.emit(msg);
          }
        } catch {
          // ignore malformed payload
        }
      };
      window.addEventListener('storage', this.storageHandler);
    }
  }

  public getCode(): string {
    return this.code;
  }

  public onMessage(cb: (msg: RemoteCommandMessage) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private emit(msg: RemoteCommandMessage): void {
    for (const cb of this.listeners) {
      cb(msg);
    }
  }

  public send(type: RemoteCommandType, payload: Record<string, unknown> = {}): void {
    const msg: RemoteCommandMessage = {
      code: this.code,
      sender: this.role,
      type,
      payload,
      ts: Date.now(),
    };
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch {
        // ignore closed channel
      }
    }
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${this.code}`, JSON.stringify(msg));
      } catch {
        // ignore quota errors
      }
    }
  }

  public close(): void {
    if (this.channel) {
      try {
        this.channel.close();
      } catch {
        // ignore
      }
      this.channel = null;
    }
    if (this.storageHandler && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageHandler);
      this.storageHandler = null;
    }
    this.listeners.clear();
  }
}
