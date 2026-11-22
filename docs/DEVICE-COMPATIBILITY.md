# DEVICE-COMPATIBILITY.md — Browser & Device Matrix

## Tested Configurations (Target for Pilot)

### Desktop Browsers (Teacher Host)
| Browser | Version | OS | Status | Notes |
|---|---|---|---|---|
| Chrome | 120+ | Windows 11 | ✅ Target | PWA install supported |
| Chrome | 120+ | macOS 14 | ✅ Target | PWA install supported |
| Firefox | 121+ | Windows 11 | ✅ Target | No PWA install |
| Safari | 17+ | macOS 14 | ✅ Target | PWA via "Add to Dock" |
| Edge | 120+ | Windows 11 | ✅ Target | PWA install supported |

### Mobile / Tablet (Student + Controller)
| Device | Browser | OS | Status | Notes |
|---|---|---|---|---|
| Android phone (≥ 720p) | Chrome 120+ | Android 12+ | ✅ Target | Mobile controller flow |
| iPad (≥ 10.9") | Safari 17+ | iPadOS 17 | ✅ Target | Student view |
| iPad + Apple Pencil | Safari 17+ | iPadOS 17 | ✅ Target | Stylus pressure, palm rejection active |
| Low-end Android Tablet | Chrome 120+ | Android 11+ | ✅ Supported | 45+ FPS zoom, low-DPR 3D fallback |
| Chromebook | Chrome 120+ | ChromeOS 120+ | ✅ Target | Touch + stylus supported, 60 FPS |
| Windows touch laptop | Edge 120+ / Chrome | Windows 11 | ✅ Target | Multi-touch pinch/pan, pen supported |
| iPhone 12+ | Safari 17+ | iOS 17 | ✅ Target | Mobile controller |
| Cheap Android (RAM ≥ 2 GB) | Chrome 120+ | Android 10+ | ⚠️ Limited | 3D degraded to low-quality mode |

### Projector / Smart Display
| Type | Connection | Status | Notes |
|---|---|---|---|
| 1080p Interactive Flat Panel | Android / ChromeOS / Windows | ✅ Target | Mode layar besar (UI 1.25x, target ≥56px, multi-pen) |
| HDMI-connected laptop | — | ✅ Target | Teacher mirrors screen |
| Smart TV with browser | Chrome-based | ⚠️ Limited | No WebGL fallback tested |

## Performance Baselines (from build)
| Asset | Raw | Gzip | Limit |
|---|---|---|---|
| canvas-vendor | — | 106 kB | < 400 kB ✅ |
| three-vendor | — | 66 kB | < 100 kB ✅ |
| PWA SW precache | 1058 kB | — | < 2 MB ✅ |

## Network Requirements
- Minimum: 1 Mbps upload per teacher host (WebSocket events)
- Recommended: 5 Mbps for 3D solid rendering on students
- Offline: basic whiteboard + draft outbox works with 0 Mbps after initial load

## Known Limitations
- WebGL not available in some older smart TVs → 3D solids fall back to 2D thumbnail
- Safari 16 and below: PWA offline unreliable (iOS < 17 excluded from pilot)
- Android 9 and below: IndexedDB quota may be restricted (Dexie outbox may fail)
