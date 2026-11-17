/** Viewport-relative positions survive resizing and never leave the controls offscreen. */
export function initMascotPlacement(root             , topOffset        , onLayout            ) {
  const handle = root.querySelector                   ('#mascot-drag') ;
  const reset = root.querySelector                   ('#mascot-reset') ;
  const anchoredRight = root.dataset.anchor === 'right';
  let saved                                  = null;
  try {
    const value = JSON.parse(localStorage.getItem('mascot-widget-state-position') || 'null');
    if (value && Number.isFinite(value.x) && Number.isFinite(value.y))
      saved = { x: Math.max(0, Math.min(1, value.x)), y: Math.max(0, Math.min(1, value.y)) };
  } catch {}
  let dragging                                                                         = null;
  const limits = () => {
    const rect = root.getBoundingClientRect();
    const top = Math.min(topOffset + 10, Math.max(10, innerHeight - rect.height - 12));
    const toolsSpace = root.classList.contains('collapsed') ? 0 : 50;
    const width = Math.max(
      rect.width,
      root.querySelector('#mascot-restore')?.getBoundingClientRect().width || 0,
    );
    const maxX = Math.max(10, innerWidth - width - (anchoredRight ? 0 : toolsSpace) - 10);
    return {
      minX: anchoredRight ? Math.min(maxX, 10 + toolsSpace) : 10,
      maxX,
      minY: top,
      maxY: Math.max(top, innerHeight - rect.height - 12),
    };
  };
  const place = (x        , y        ) => {
    const b = limits();
    root.style.right = 'auto';
    root.style.left = `${Math.max(b.minX, Math.min(b.maxX, x))}px`;
    root.style.top = `${Math.max(b.minY, Math.min(b.maxY, y))}px`;
    root.style.bottom = 'auto';
    onLayout();
  };
  const position = () => {
    const b = limits();
    if (saved && !root.classList.contains('collapsed')) {
      place(b.minX + saved.x * (b.maxX - b.minX), b.minY + saved.y * (b.maxY - b.minY));
    } else {
      // Let the compositor anchor the default position. Safari's toolbar
      // changes innerHeight while scrolling; rewriting a pixel top jumps.
      root.style.left = anchoredRight ? 'auto' : '10px';
      root.style.right = anchoredRight ? '10px' : 'auto';
      root.style.top = 'auto';
      root.style.bottom = 'calc(12px + env(safe-area-inset-bottom))';
      onLayout();
    }
  };
  const remember = () => {
    const b = limits(),
      rect = root.getBoundingClientRect();
    saved = {
      x: (rect.left - b.minX) / Math.max(1, b.maxX - b.minX),
      y: (rect.top - b.minY) / Math.max(1, b.maxY - b.minY),
    };
    try {
      localStorage.setItem('mascot-widget-state-position', JSON.stringify(saved));
    } catch {}
  };
  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const rect = root.getBoundingClientRect();
    dragging = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: rect.left,
      top: rect.top,
    };
    handle.setPointerCapture(event.pointerId);
    root.classList.add('dragging');
    event.preventDefault();
  });
  handle.addEventListener('pointermove', (event) => {
    if (dragging && event.pointerId === dragging.id) {
      place(dragging.left + event.clientX - dragging.x, dragging.top + event.clientY - dragging.y);
    }
  });
  const finish = (event              ) => {
    if (!dragging || event.pointerId !== dragging.id) return;
    dragging = null;
    root.classList.remove('dragging');
    remember();
    position();
  };
  handle.addEventListener('pointerup', finish);
  handle.addEventListener('pointercancel', finish);
  handle.addEventListener('lostpointercapture', finish);
  const resetPosition = () => {
    saved = null;
    try {
      localStorage.removeItem('mascot-widget-state-position');
    } catch {}
    position();
  };
  reset.addEventListener('click', resetPosition);
  handle.addEventListener('keydown', (event) => {
    const moves                                   = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (event.key === 'Home') {
      event.preventDefault();
      resetPosition();
      return;
    }
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const rect = root.getBoundingClientRect(),
      step = event.shiftKey ? 40 : 12;
    place(rect.left + move[0] * step, rect.top + move[1] * step);
    remember();
  });
  window.addEventListener('resize', position);
  const observer = new ResizeObserver(() => {
    if (!dragging) position();
  });
  observer.observe(root);
  if (root.classList.contains('collapsed')) resetPosition();
  else position();
  // Reveal only after restoring the saved position, before the next paint.
  root.dataset.placementReady = 'true';
  return { reposition: position, reset: resetPosition };
}
