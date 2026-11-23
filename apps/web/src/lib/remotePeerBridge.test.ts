import { describe, it, expect, vi } from 'vitest';
import {
  generatePairingCode,
  formatPairingCode,
  normalizePairingCode,
  buildPairingUrls,
  RemotePeerBridge,
} from './remotePeerBridge';

describe('remotePeerBridge', () => {
  it('generates and formats 6-digit pairing codes', () => {
    const code = generatePairingCode();
    expect(code).toMatch(/^\d{6}$/);
    expect(formatPairingCode('482910')).toBe('482-910');
    expect(normalizePairingCode('482-910')).toBe('482910');
  });

  it('builds both Remote Controller and Direct Mobile Whiteboard URLs', () => {
    const urls = buildPairingUrls('https://kelas.test', '482910');
    expect(urls.remoteUrl).toBe('https://kelas.test/remote?code=482910');
    expect(urls.mobileWhiteboardUrl).toBe('https://kelas.test/whiteboard?peer=482910&mode=mobile');
  });

  it('delivers messages between mobile and desktop bridge instances', () => {
    const received = vi.fn();
    const desktop = new RemotePeerBridge('123456', 'desktop');
    const mobile = new RemotePeerBridge('123456', 'mobile');
    desktop.onMessage(received);

    mobile.send('solid_orbit', { dAzimuth: 0.25, dPolar: -0.1 });
    // Trigger storage fallback if BroadcastChannel is absent in jsdom
    if (received.mock.calls.length === 0) {
      const payload = localStorage.getItem('ai_classroom_remote_msg_123456');
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'ai_classroom_remote_msg_123456',
          newValue: payload,
        }),
      );
    }

    expect(received).toHaveBeenCalledTimes(1);
    expect(received.mock.calls[0][0].type).toBe('solid_orbit');
    desktop.close();
    mobile.close();
  });
});
