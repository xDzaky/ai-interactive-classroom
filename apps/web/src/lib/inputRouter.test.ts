import { describe, it, expect } from 'vitest';
import { InputRouter } from './inputRouter';

describe('V5 InputRouter — Stylus Palm Rejection & Multi-Touch', () => {
  it('blocks single-finger palm touch within 450ms of pen activity while allowing 2-finger pinch/pan', () => {
    const router = new InputRouter(450);

    // Pen touches down at t=1000
    const penDown = router.onPointerDown({ pointerId: 1, pointerType: 'pen', pressure: 0.7 }, 1000);
    expect(penDown.allowDraw).toBe(true);
    expect(penDown.rejectedAsPalm).toBe(false);

    // Palm (single touch) touches down while pen is active at t=1100 -> rejected!
    const palmDown = router.onPointerDown({ pointerId: 2, pointerType: 'touch' }, 1100);
    expect(palmDown.allowDraw).toBe(false);
    expect(palmDown.rejectedAsPalm).toBe(true);

    // Pen lifts at t=1200; single touch at t=1400 (200ms < 450ms) -> still rejected!
    router.onPointerUp({ pointerId: 1, pointerType: 'pen' }, 1200);
    router.onPointerUp({ pointerId: 2, pointerType: 'touch' }, 1250);
    const palmAfter = router.onPointerDown({ pointerId: 3, pointerType: 'touch' }, 1400);
    expect(palmAfter.rejectedAsPalm).toBe(true);

    // Second finger joins -> multi-touch pan/zoom allowed!
    const secondFinger = router.onPointerDown({ pointerId: 4, pointerType: 'touch' }, 1420);
    expect(secondFinger.isMultiTouch).toBe(true);
    expect(secondFinger.rejectedAsPalm).toBe(false);

    // After >450ms cooldown, single touch drawing works again
    router.onPointerUp({ pointerId: 3, pointerType: 'touch' }, 1500);
    router.onPointerUp({ pointerId: 4, pointerType: 'touch' }, 1500);
    const touchLater = router.onPointerDown({ pointerId: 5, pointerType: 'touch' }, 2000);
    expect(touchLater.allowDraw).toBe(true);
  });
});
