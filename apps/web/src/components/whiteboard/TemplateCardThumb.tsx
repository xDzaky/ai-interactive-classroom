/**
 * TemplateCardThumb.tsx — Crisp Vector SVG Isometric / 2D Visual Previews
 * Renders clean geometric & real-world illustrations inside TemplateDrawer cards.
 */
import React from 'react';

export const TemplateCardThumb: React.FC<{ kind: string; color?: string }> = ({
  kind,
  color = '#4f46e5',
}) => {
  switch (kind) {
    case 'dice':
      return (
        <svg viewBox="0 0 64 64" className="h-12 w-12">
          <rect x="10" y="10" width="44" height="44" rx="10" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
          <circle cx="22" cy="22" r="3.8" fill="#0f172a" />
          <circle cx="42" cy="22" r="3.8" fill="#0f172a" />
          <circle cx="32" cy="32" r="4" fill="#dc2626" />
          <circle cx="22" cy="42" r="3.8" fill="#0f172a" />
          <circle cx="42" cy="42" r="3.8" fill="#0f172a" />
        </svg>
      );
    case 'rubik':
      return (
        <svg viewBox="0 0 64 64" className="h-12 w-12">
          <rect x="10" y="10" width="44" height="44" rx="5" fill="#0f172a" />
          {['#ef4444', '#facc15', '#3b82f6', '#22c55e', '#ffffff', '#f97316', '#3b82f6', '#ef4444', '#facc15'].map((c, i) => (
            <rect
              key={i}
              x={13 + (i % 3) * 13.5}
              y={13 + Math.floor(i / 3) * 13.5}
              width="11"
              height="11"
              rx="2"
              fill={c}
            />
          ))}
        </svg>
      );
    case 'gift':
      return (
        <svg viewBox="0 0 64 64" className="h-12 w-12">
          <rect x="12" y="20" width="40" height="34" rx="4" fill="#fce7f3" stroke="#e11d48" strokeWidth="2" />
          <rect x="28" y="20" width="8" height="34" fill="#e11d48" />
          <rect x="12" y="33" width="40" height="8" fill="#e11d48" />
          <path d="M32 20 C22 10, 18 16, 26 20 M32 20 C42 10, 46 16, 38 20" fill="none" stroke="#e11d48" strokeWidth="2.5" />
        </svg>
      );
    case 'milk_box':
      return (
        <svg viewBox="0 0 64 64" className="h-12 w-12">
          <polygon points="18,22 46,22 46,54 18,54" fill="#eff6ff" stroke="#2563eb" strokeWidth="2" />
          <polygon points="18,22 32,10 46,22" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
          <rect x="23" y="32" width="18" height="10" rx="2" fill="#2563eb" opacity="0.25" />
        </svg>
      );
    case 'house':
      return (
        <svg viewBox="0 0 64 64" className="h-12 w-12">
          <polygon points="14,30 50,30 50,54 14,54" fill="#fef3c7" stroke="#92400e" strokeWidth="2" />
          <polygon points="8,30 32,10 56,30" fill="#f97316" stroke="#9a3412" strokeWidth="2" />
          <rect x="27" y="40" width="10" height="14" fill="#92400e" />
        </svg>
      );
    case 'soda_can':
    case 'cylinder':
      return (
        <svg viewBox="0 0 64 64" className="h-12 w-12">
          <path d="M18 16 L18 48 A14 6 0 0 0 46 48 L46 16 Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
          <ellipse cx="32" cy="16" rx="14" ry="6" fill={color} fillOpacity="0.35" stroke={color} strokeWidth="2" />
          <ellipse cx="32" cy="48" rx="14" ry="6" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
      );
    case 'party_hat':
    case 'ice_cream':
    case 'traffic_cone':
    case 'cone':
      return (
        <svg viewBox="0 0 64 64" className="h-12 w-12">
          <path d="M32 10 L14 48 A18 6 0 0 0 50 48 Z" fill={color} fillOpacity="0.22" stroke={color} strokeWidth="2" />
          <ellipse cx="32" cy="48" rx="18" ry="6" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
      );
    case 'tent':
    case 'prism':
    case 'prism6':
      return (
        <svg viewBox="0 0 64 64" className="h-12 w-12">
          <polygon points="10,48 24,18 38,48" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="2" />
          <polygon points="24,18 44,14 54,44 38,48" fill={color} fillOpacity="0.14" stroke={color} strokeWidth="2" />
        </svg>
      );
    case 'egypt_pyramid':
    case 'pyramid':
    case 'frustum':
      return (
        <svg viewBox="0 0 64 64" className="h-12 w-12">
          <polygon points="32,10 12,48 36,54 52,42" fill={color} fillOpacity="0.22" stroke={color} strokeWidth="2" />
          <line x1="32" y1="10" x2="36" y2="54" stroke={color} strokeWidth="2" />
        </svg>
      );
    case 'globe':
    case 'soccer_ball':
    case 'sphere':
      return (
        <svg viewBox="0 0 64 64" className="h-12 w-12">
          <circle cx="32" cy="32" r="21" fill={color} fillOpacity="0.18" stroke={color} strokeWidth="2" />
          <ellipse cx="32" cy="32" rx="21" ry="7" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
          <ellipse cx="32" cy="32" rx="8" ry="21" fill="none" stroke={color} strokeWidth="1.2" opacity="0.6" />
        </svg>
      );
    case 'clock':
    case 'circle':
      return (
        <svg viewBox="0 0 64 64" className="h-12 w-12">
          <circle cx="32" cy="32" r="20" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="2.2" />
          {kind === 'clock' && (
            <>
              <line x1="32" y1="32" x2="32" y2="18" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
              <line x1="32" y1="32" x2="43" y2="32" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
            </>
          )}
        </svg>
      );
    case 'triangle':
      return (
        <svg viewBox="0 0 64 64" className="h-12 w-12">
          <polygon points="32,12 52,50 12,50" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="2.2" />
        </svg>
      );
    case 'rect':
    case 'rect_wide':
      return (
        <svg viewBox="0 0 64 64" className="h-12 w-12">
          <rect
            x={kind === 'rect_wide' ? 8 : 14}
            y={kind === 'rect_wide' ? 18 : 14}
            width={kind === 'rect_wide' ? 48 : 36}
            height={kind === 'rect_wide' ? 28 : 36}
            rx="3"
            fill={color}
            fillOpacity="0.14"
            stroke={color}
            strokeWidth="2.2"
          />
        </svg>
      );
    case 'cube':
    case 'cuboid':
    case 'octa':
    case 'dodeca':
    default:
      return (
        <svg viewBox="0 0 64 64" className="h-12 w-12">
          <polygon points="32,10 52,20 52,44 32,54 12,44 12,20" fill={color} fillOpacity="0.18" stroke={color} strokeWidth="2" />
          <polyline points="12,20 32,30 52,20" fill="none" stroke={color} strokeWidth="2" />
          <line x1="32" y1="30" x2="32" y2="54" stroke={color} strokeWidth="2" />
        </svg>
      );
  }
};
