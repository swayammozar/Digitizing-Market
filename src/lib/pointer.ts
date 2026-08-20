/**
 * Pointer capture keeps a drag alive when the cursor outruns the element it
 * started on, but it throws if the pointer has already been released — which
 * happens on a fast flick, and whenever a synthetic event drives the UI.
 *
 * Every drag here is also tracked by window-level listeners, so capture is an
 * improvement rather than a requirement. Losing it must not take the gesture
 * down with it.
 */
export function capturePointer(element: HTMLElement, pointerId: number) {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // Pointer already gone; the window listeners still track the gesture.
  }
}
