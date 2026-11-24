/**
 * TemplateCardThumb.tsx — Clean Monochrome Line-Art Sketch Previews (Zero Lag)
 * Pure minimalist black-and-white textbook sketches (stroke #0f172a, no heavy colors).
 */
import React from 'react';

export const TemplateCardThumb: React.FC<{ kind: string; color?: string }> = ({ kind }) => {
  const stroke = '#0f172a';
  const muted = '#64748b';

  switch (kind) {
    case 'dice':
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11">
          <rect x="11" y="11" width="42" height="42" rx="8" fill="none" stroke={stroke} strokeWidth="2" />
          <circle cx="22" cy="22" r="3" fill={stroke} />
          <circle cx="42" cy="22" r="3" fill={stroke} />
          <circle cx="32" cy="32" r="3" fill={stroke} />
          <circle cx="22" cy="42" r="3" fill={stroke} />
          <circle cx="42" cy="42" r="3" fill={stroke} />
        </svg>
      );
    case 'rubik':
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11">
          <rect x="12" y="12" width="40" height="40" rx="4" fill="none" stroke={stroke} strokeWidth="2" />
          <line x1="25.3" y1="12" x2="25.3" y2="52" stroke={stroke} strokeWidth="1.5" />
          <line x1="38.6" y1="12" x2="38.6" y2="52" stroke={stroke} strokeWidth="1.5" />
          <line x1="12" y1="25.3" x2="52" y2="25.3" stroke={stroke} strokeWidth="1.5" />
          <line x1="12" y1="38.6" x2="52" y2="38.6" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'gift':
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11">
          <rect x="12" y="21" width="40" height="32" rx="3" fill="none" stroke={stroke} strokeWidth="2" />
          <line x1="32" y1="21" x2="32" y2="53" stroke={stroke} strokeWidth="2" />
          <line x1="12" y1="37" x2="52" y2="37" stroke={stroke} strokeWidth="2" />
          <path d="M32 21 C23 11, 19 17, 27 21 M32 21 C41 11, 45 17, 37 21" fill="none" stroke={stroke} strokeWidth="2" />
        </svg>
      );
    case 'milk_box':
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11">
          <rect x="18" y="23" width="28" height="30" fill="none" stroke={stroke} strokeWidth="2" />
          <polygon points="18,23 32,11 46,23" fill="none" stroke={stroke} strokeWidth="2" />
          <rect x="24" y="33" width="16" height="8" rx="1.5" fill="none" stroke={muted} strokeWidth="1.4" />
        </svg>
      );
    case 'house':
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11">
          <rect x="15" y="30" width="34" height="23" fill="none" stroke={stroke} strokeWidth="2" />
          <polygon points="10,30 32,11 54,30" fill="none" stroke={stroke} strokeWidth="2" />
          <rect x="27" y="40" width="10" height="13" fill="none" stroke={stroke} strokeWidth="1.6" />
        </svg>
      );
    case 'soda_can':
    case 'cylinder':
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11">
          <ellipse cx="32" cy="16" rx="14" ry="5.5" fill="none" stroke={stroke} strokeWidth="2" />
          <line x1="18" y1="16" x2="18" y2="48" stroke={stroke} strokeWidth="2" />
          <line x1="46" y1="16" x2="46" y2="48" stroke={stroke} strokeWidth="2" />
          <path d="M18 48 A14 5.5 0 0 0 46 48" fill="none" stroke={stroke} strokeWidth="2" />
          <path d="M18 48 A14 5.5 0 0 1 46 48" fill="none" stroke={muted} strokeWidth="1.4" strokeDasharray="3 2" />
        </svg>
      );
    case 'party_hat':
    case 'ice_cream':
    case 'traffic_cone':
    case 'cone':
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11">
          <line x1="32" y1="10" x2="14" y2="48" stroke={stroke} strokeWidth="2" />
          <line x1="32" y1="10" x2="50" y2="48" stroke={stroke} strokeWidth="2" />
          <path d="M14 48 A18 5.5 0 0 0 50 48" fill="none" stroke={stroke} strokeWidth="2" />
          <path d="M14 48 A18 5.5 0 0 1 50 48" fill="none" stroke={muted} strokeWidth="1.4" strokeDasharray="3 2" />
        </svg>
      );
    case 'tent':
    case 'prism':
    case 'prism6':
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11">
          <polygon points="10,48 24,18 38,48" fill="none" stroke={stroke} strokeWidth="2" />
          <polyline points="24,18 44,14 54,44 38,48" fill="none" stroke={stroke} strokeWidth="2" />
          <line x1="10" y1="48" x2="30" y2="44" stroke={muted} strokeWidth="1.3" strokeDasharray="3 2" />
        </svg>
      );
    case 'egypt_pyramid':
    case 'pyramid':
    case 'frustum':
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11">
          <polygon points="32,10 12,47 36,53 52,42" fill="none" stroke={stroke} strokeWidth="2" />
          <line x1="32" y1="10" x2="36" y2="53" stroke={stroke} strokeWidth="2" />
          <line x1="12" y1="47" x2="52" y2="42" stroke={muted} strokeWidth="1.3" strokeDasharray="3 2" />
        </svg>
      );
    case 'globe':
    case 'soccer_ball':
    case 'sphere':
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11">
          <circle cx="32" cy="32" r="20" fill="none" stroke={stroke} strokeWidth="2" />
          <ellipse cx="32" cy="32" rx="20" ry="7" fill="none" stroke={muted} strokeWidth="1.4" strokeDasharray="3 2" />
        </svg>
      );
    case 'clock':
    case 'circle':
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11">
          <circle cx="32" cy="32" r="20" fill="none" stroke={stroke} strokeWidth="2" />
          {kind === 'clock' && (
            <>
              <line x1="32" y1="32" x2="32" y2="18" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
              <line x1="32" y1="32" x2="43" y2="32" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
            </>
          )}
        </svg>
      );
    case 'triangle':
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11">
          <polygon points="32,12 52,50 12,50" fill="none" stroke={stroke} strokeWidth="2" />
        </svg>
      );
    case 'rect':
    case 'rect_wide':
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11">
          <rect
            x={kind === 'rect_wide' ? 8 : 14}
            y={kind === 'rect_wide' ? 18 : 14}
            width={kind === 'rect_wide' ? 48 : 36}
            height={kind === 'rect_wide' ? 28 : 36}
            rx="2"
            fill="none"
            stroke={stroke}
            strokeWidth="2"
          />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 64 64" className="h-11 w-11">
          <polygon points="32,10 52,20 52,44 32,54 12,44 12,20" fill="none" stroke={stroke} strokeWidth="2" />
          <polyline points="12,20 32,30 52,20" fill="none" stroke={stroke} strokeWidth="2" />
          <line x1="32" y1="30" x2="32" y2="54" stroke={stroke} strokeWidth="2" />
        </svg>
      );
  }
};
