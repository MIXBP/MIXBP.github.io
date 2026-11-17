/** Small decorative bursts, anchored to the character rather than the page. */
export function initMascotHearts(
  root             ,
  character             ,
  reduced                ,
) {
  const host = document.createElement('span');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:visible;z-index:3';
  character.append(host);
  const active = new Map                          ();
  const clear = () => {
    active.forEach((animation, node) => {
      animation.cancel();
      node.remove();
    });
    active.clear();
  };
  root.addEventListener('click', (event) => {
    const target = event.target           ;
    if (!target.closest('#mascot-character')) return;
    const rect = character.getBoundingClientRect();
    // Every click uses the same character-relative head anchor, including
    // clicks on the boots/staff and keyboard activation. Never follow the cursor.
    const x = rect.width * 0.55;
    const y = rect.height * 0.3;
    const random = (min        , max        ) => min + Math.random() * (max - min);
    const count = reduced.matches ? 1 : [3, 4, 4, 5, 5, 6][Math.floor(Math.random() * 6)];
    // Give each burst a related palette and a small shared drift. Individual
    // hearts vary around that theme instead of looking like unrelated confetti.
    const hue = Math.random() < 0.65 ? random(325, 352) : random(275, 310);
    const originX = x + random(-12, 12),
      originY = y + random(-10, 8);
    const drift = random(-12, 12),
      fan = random(35, 65);
    let delay = 0;
    for (let i = 0; i < count; i++) {
      // Repeated taps remain responsive without accumulating unlimited particles.
      if (active.size >= 20) {
        const [node, animation] = active.entries().next().value ;
        animation.cancel();
        node.remove();
        active.delete(node);
      }
      const heart = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      heart.setAttribute('viewBox', '0 0 24 24');
      heart.setAttribute('focusable', 'false');
      heart.dataset.mascotHeart = '';
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute(
        'd',
        'M12 21C9 18.5 2 13.8 2 8.5A5.5 5.5 0 0 1 12 5.3 5.5 5.5 0 0 1 22 8.5C22 13.8 15 18.5 12 21Z',
      );
      path.setAttribute(
        'fill',
        `hsl(${hue + random(-12, 12)} ${random(55, 72)}% ${random(74, 85)}%)`,
      );
      path.setAttribute('stroke', '#fff4fa');
      path.setAttribute('stroke-width', '1');
      heart.append(path);
      const size = random(11, 21),
        spread = ((i + 0.5) / count - 0.5) * fan + random(-8, 8) + drift;
      const spawnX = Math.max(size / 2, Math.min(rect.width - size / 2, originX + random(-16, 16)));
      const spawnY = Math.max(
        size / 2,
        Math.min(rect.height - size / 2, originY + random(-10, 12)),
      );
      const rise = random(60, 96),
        rotation = random(-18, 18),
        sway = random(-7, 7),
        opacity = random(0.78, 0.96);
      heart.style.cssText = `position:absolute;left:${spawnX - size / 2}px;top:${spawnY - size / 2}px;width:${size}px;height:${size}px;opacity:0;pointer-events:none;filter:drop-shadow(0 1px 3px #b56c9825)`;
      host.append(heart);
      const frames = reduced.matches
        ? [{ opacity: 0 }, { opacity: 0.85, offset: 0.25 }, { opacity: 0 }]
        : [
            { opacity: 0, transform: `translate(0,0) scale(.35) rotate(${rotation - 8}deg)` },
            {
              opacity,
              transform: `translate(${spread * 0.3}px,-${rise * 0.2}px) scale(1) rotate(${rotation}deg)`,
              offset: 0.2,
            },
            {
              opacity: opacity * 0.72,
              transform: `translate(${spread * 0.75 + sway}px,-${rise * 0.65}px) scale(.9) rotate(${rotation + spread * 0.2}deg)`,
              offset: 0.65,
            },
            {
              opacity: 0,
              transform: `translate(${spread}px,-${rise}px) scale(.65) rotate(${rotation + spread * 0.35}deg)`,
            },
          ];
      const animation = heart.animate(frames, {
        duration: reduced.matches ? 650 : random(1250, 1750),
        delay: reduced.matches ? 0 : delay,
        easing: 'ease-out',
        fill: 'both',
      });
      delay += random(30, 85);
      active.set(heart, animation);
      void animation.finished.then(
        () => {
          active.delete(heart);
          heart.remove();
        },
        () => {},
      );
    }
  });
  reduced.addEventListener('change', clear);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clear();
  });
  window.addEventListener('pagehide', clear);
}
