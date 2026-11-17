import { initMascotHearts } from './hearts.js';
import { createMascotRenderer } from './renderer.js';
import { initMascotPlacement } from './placement.js';
import { createBraidPhysics } from './physics.js';
import { createBodyMotion } from './body-motion.js';
import { createHeadMotion } from './head-motion.js';
import { createClothMotion } from './cloth-motion.js';
import { createStaffMotion } from './staff-motion.js';
import { createGreetings,                      } from './greetings.js';

                      
                                            
                              
                     
                             
  

export function initMascot(mascot             , options                = {}) {
  // A host can keep the widget mounted across client-side navigation.
  // A canvas must have only one live controller.
  const initialized = Symbol.for('roxy-web-mascot.controller');
  const instance = mascot                                            ;
  if (instance[initialized]) return;
  instance[initialized] = true;
  const root = mascot;
  const { start: initialMode = 'auto', position = 'left', topOffset = 0 } = options;
  const { wakeGreeting, arrivalGreeting, restGreetings, clickGreetings } = createGreetings(
    options.dialogue,
  );
  root.dataset.anchor = position;
  const compact = matchMedia('(max-width: 1350px), (max-height: 820px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(pointer: fine)');
  const character = root.querySelector                   ('#mascot-character') ;
  initMascotHearts(root, character, reduced);
  const restore = root.querySelector                   ('#mascot-restore') ;
  const expanded = root.querySelector             ('#mascot-expanded') ;
  const preview = root.querySelector                  ('.widget-art') ;
  let previewReady                           ;
  const loadPreview = () => {
    if (!previewReady) {
      preview.src = preview.dataset.src ;
      previewReady = preview.decode().catch(() => {});
    }
    return previewReady;
  };
  const canvas = root.querySelector                   ('#widget-canvas') ;
  let preference                = null;
  try {
    preference = localStorage.getItem('mascot-widget-state');
  } catch {}
  let collapsed = preference
    ? preference === 'collapsed'
    : initialMode === 'collapsed' || (initialMode === 'auto' && compact.matches);
  let renderer                                                   = null;
  let rendererStarted = false;
  let rendererGeneration = 0,
    restExpressionTimer = 0;
  let frame = 0,
    last = 0,
    elapsed = 0;
  let targetX = 0,
    targetY = 0,
    lookX = 0,
    lookY = 0,
    headX = 0,
    headY = 0,
    bodyX = 0,
    bodyVelocity = 0;
  let hair = 0,
    hairVelocity = 0,
    cape = 0,
    capeVelocity = 0,
    nod = 0,
    nodFollow = 0,
    smile = 0,
    tilt = 0;

  let nextBlink = 2.5 + Math.random() * 3,
    blinkStart = -10,
    blinkDuration = 0.23,
    doubleBlink = false;
  let blinkPaused = false;
  let helloStart = -10,
    lastPointer = 0,
    idleX = 0,
    idleY = 0,
    nextGlance = 4;
  const expression = 0,
    reactionKind = 'happy';
  let expressionWeight = 0,
    reactionStart = -10;
  let nextIdle = 12 + Math.random() * 8;
  const braids = createBraidPhysics();
  const bodyMotion = createBodyMotion();
  const clothMotion = createClothMotion();
  const headMotion = createHeadMotion();
  const staffMotion = createStaffMotion();
  let previousNod = 0;
  let blinkRight = 0,
    currentBlink = 0;
  let shoulder = 0,
    shoulderVelocity = 0,
    happy = 0,
    blush = 0,
    interaction = 0;
  let nodFocus = 0,
    motionActivity = 0,
    idleBlend = 0,
    ambient = 1;
  let nodStart = -10,
    nodQueue = 0;
  let nodDuration = 0.86,
    nodStrength = 1,
    nodLean = 0,
    nodVariant = -1;

  const varyNod = () => {
    nodVariant = (nodVariant + 1) % 3;
    nodDuration = [0.86, 0.95, 0.82][nodVariant];
    nodStrength = [1, 0.92, 0.96][nodVariant];
    nodLean = [0, -0.12, 0.12][nodVariant];
  };
  const requestNod = () => {
    if (reduced.matches) return;
    if (elapsed - nodStart >= nodDuration && nodQueue === 0) {
      nodStart = elapsed;
      varyNod();
    } else nodQueue = Math.min(3, nodQueue + 1);
  };

  let idleStart = -10,
    idleDirection = 1;
  const clamp = (value        , limit        ) => Math.max(-limit, Math.min(limit, value));
  const smooth = (value        ) => {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
  };
  let controlsTimer = 0;
  const revealControls = () => {
    clearTimeout(controlsTimer);
    root.classList.add('controls-open');
  };
  const dismissControls = () => {
    clearTimeout(controlsTimer);
    controlsTimer = window.setTimeout(() => {
      if (
        !root.matches(':hover') &&
        !root.querySelector(':focus-visible') &&
        !root.classList.contains('dragging')
      )
        root.classList.remove('controls-open');
    }, 450);
  };
  // The character reveals controls; the surrounding invisible panel does not.
  character.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'touch') revealControls();
  });
  root.addEventListener('pointerenter', () => {
    if (root.classList.contains('controls-open')) clearTimeout(controlsTimer);
  });
  root.addEventListener('pointerleave', dismissControls);
  root.addEventListener('focusin', (event) => {
    if ((event.target           ).matches(':focus-visible')) revealControls();
  });
  root.addEventListener('focusout', dismissControls);
  root.addEventListener('pointerdown', revealControls);
  document.addEventListener('pointerdown', (event) => {
    if (!root.contains(event.target        )) {
      root.classList.remove('controls-open');
      if (root.contains(document.activeElement)) (document.activeElement               ).blur();
    }
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      (document.activeElement               )?.blur();
      root.classList.remove('controls-open');
    }
  });

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  };
  const paint = (time        , blink = reduced.matches ? 0 : currentBlink) => {
    currentBlink = blink;
    root.dataset.look = `${lookX.toFixed(2)},${lookY.toFixed(2)}`;
    root.dataset.pose = `${headX.toFixed(3)},${bodyX.toFixed(3)}`;
    root.dataset.blink = blink.toFixed(2);
    root.dataset.blinkRight = blinkRight.toFixed(2);
    root.dataset.nod = nod.toFixed(3);
    root.dataset.hair = hair.toFixed(3);
    root.dataset.cape = cape.toFixed(4);
    root.dataset.headVelocity = Array.from(headMotion.velocity, (value) => value.toFixed(4)).join(
      ',',
    );
    root.dataset.smile = smile.toFixed(3);
    root.dataset.expression = expressionWeight > 0.1 ? reactionKind : 'neutral';
    root.dataset.expressionWeight = expressionWeight.toFixed(4);
    root.dataset.blush = blush.toFixed(4);
    root.dataset.motionBlend = [nodFocus, motionActivity, ambient]
      .map((v) => v.toFixed(4))
      .join(',');
    root.dataset.braidJoints = Array.from(braids.angles, (value) => value.toFixed(4)).join(',');
    root.dataset.braidPitch = Array.from(braids.pitch, (value) => value.toFixed(4)).join(',');
    root.dataset.staffLag = staffMotion.lag.toFixed(5);
    root.dataset.shoulder = shoulder.toFixed(4);
    root.dataset.emotion = [happy, 0, 0].map((value) => value.toFixed(3)).join(',');
    root.dataset.gesture = '0.000,0.000,0.000';
    root.dataset.nodVariant = String(nodVariant);
    root.dataset.bodyMotion = Array.from(bodyMotion.values, (value) => value.toFixed(4)).join(',');
    root.dataset.clothMotion = Array.from(clothMotion.values, (value) => value.toFixed(4)).join(
      ',',
    );
    renderer?.render({
      lookX,
      lookY,
      headX,
      headY,
      bodyX,
      bodyMotion: bodyMotion.values,
      clothMotion: clothMotion.values,
      shoulder,
      nodFollow,
      happy,
      blush,
      ambient,
      hair,
      cape,
      nod,
      smile,
      tilt,
      time,
      blink,
      blinkRight,
      braids: braids.angles,
      braidPitch: braids.pitch,
      staffLag: staffMotion.lag,
      expression,
      expressionWeight,
    });
  };
  function tick(now        ) {
    frame = 0;
    if (reduced.matches) {
      resetMotion();
      return;
    }
    if (collapsed || document.hidden) return;
    // Follow the display refresh during expressions and blinks; idle stays economical.
    const eyeAnimation =
      expressionWeight > 0 ||
      elapsed - reactionStart < 3.3 ||
      elapsed - blinkStart < 0.7 ||
      nextBlink - elapsed < 0.1 ||
      nodQueue > 0 ||
      elapsed - nodStart < nodDuration ||
      Math.abs(nod) > 0.001 ||
      elapsed - lastPointer < 2.2 ||
      headMotion.moving ||
      bodyMotion.moving ||
      clothMotion.moving ||
      braids.moving ||
      staffMotion.moving ||
      Math.abs(hairVelocity) + Math.abs(capeVelocity) > 0.025;
    if (!eyeAnimation && last && now - last < 1000 / 30) {
      frame = requestAnimationFrame(tick);
      return;
    }
    const realDelta = (last ? now - last : 33) / 1000;
    renderer?.observeFrame(realDelta, eyeAnimation);
    // A stalled browser frame must not skip straight over a blink or nod phase.
    const dt = Math.min(realDelta, 0.05);
    last = now;
    elapsed += dt;
    const ease = (speed        ) => 1 - Math.exp(-speed * dt);
    const idle = elapsed - lastPointer > 3;
    if (elapsed >= nextGlance) {
      idleX = (Math.random() - 0.5) * 0.12;
      idleY = (Math.random() - 0.5) * 0.08;
      nextGlance = elapsed + 3 + Math.random() * 4;
    }
    const idleAge = elapsed - idleStart;
    interaction += ((expressionWeight > 0.01 ? 1 : 0) - interaction) * ease(6);
    nodFocus += ((elapsed - nodStart < nodDuration || nodQueue > 0 ? 1 : 0) - nodFocus) * ease(7);
    idleBlend += ((idle ? 1 : 0) - idleBlend) * ease(4);
    const idleWeight = idleBlend * (1 - interaction) * (1 - motionActivity);
    const idleGesture = smooth(idleAge / 0.9) * (1 - smooth((idleAge - 2.2) / 1.3)) * idleWeight;
    const attention = 1 - smooth((elapsed - lastPointer - 4) / 5);
    const aimX = clamp(
      targetX * attention + idleX * idleWeight + idleDirection * 0.22 * idleGesture,
      1,
    );
    const aimY = clamp(targetY * attention + idleY * idleWeight + 0.38 * idleGesture, 1);
    const activityTarget = Math.min(
      1,
      Math.hypot(aimX - lookX, aimY - lookY) * 2 + Math.abs(headMotion.velocity[0]) * 0.4,
    );
    motionActivity +=
      (activityTarget - motionActivity) * ease(activityTarget > motionActivity ? 10 : 3);
    ambient = Math.max(0.15, 1 - motionActivity * 0.8 - nodFocus * 0.5);
    lookX += (aimX - lookX) * ease(19);
    lookY += (aimY - lookY) * ease(19);
    const previousHeadX = headX,
      previousHeadY = headY;
    headMotion.update(
      dt,
      lookX * 0.82 * (1 - nodFocus * 0.22),
      lookY * 0.75 * (1 - nodFocus * 0.32),
    );
    [headX, headY] = headMotion.position;
    bodyMotion.update(dt, headX / 0.82, headY / 0.75);
    clothMotion.update(dt, bodyMotion.values[0] + bodyMotion.values[1] / 400, nodFollow);
    // The torso follows with a damped spring so it trails the head and settles naturally.
    const previousBodyVelocity = bodyVelocity;
    const physicsSteps = Math.max(1, Math.ceil(dt * 120)),
      physicsDt = dt / physicsSteps;
    for (let step = 0; step < physicsSteps; step++) {
      bodyVelocity +=
        ((headX * 0.42 * bodyMotion.weight - bodyX) * 22 - bodyVelocity * 7) * physicsDt;
      bodyX += bodyVelocity * physicsDt;
      // Shoulders lead the waist, without changing response at different frame rates.
      shoulderVelocity +=
        ((headX * 0.38 * bodyMotion.weight + bodyX * 0.2 - shoulder) * 30 - shoulderVelocity * 9) *
        physicsDt;
      shoulder = clamp(shoulder + shoulderVelocity * physicsDt, 0.8);
    }
    // Loose parts retain momentum after the torso changes direction.
    const acceleration = (bodyVelocity - previousBodyVelocity) / dt;

    const headSpeed = (headX - previousHeadX) / dt,
      pitchSpeed = (headY - previousHeadY) / dt;
    const looseDrive = clamp(acceleration + headSpeed * 3, 10);
    const nodSpeed = (nod - previousNod) / dt;
    previousNod = nod;
    const pitchDrive = clamp(pitchSpeed * 2 + nodSpeed * 3, 8);
    braids.update(dt, looseDrive * 3.5, elapsed, ambient, pitchDrive * 3.5);
    const gripWeight = 1 - smooth((792 - 720) / (1100 - 720));
    const staffTurn =
      bodyMotion.values[0] + bodyMotion.values[3] + (shoulder - bodyX * 0.4) * 0.024 * gripWeight;
    staffMotion.update(dt, staffTurn, acceleration);
    for (let step = 0; step < physicsSteps; step++) {
      hairVelocity += (-hair * 32 - hairVelocity * 6.2 - looseDrive * 0.65) * physicsDt;
      hair = clamp(hair + hairVelocity * physicsDt, 0.65);
      if (Math.abs(hair) === 0.65 && hair * hairVelocity > 0) hairVelocity = 0;
    }
    // Small integration steps preserve the same cloth response on 30/60/120 Hz
    // displays and after a dropped frame; stronger damping prevents a hard rebound.
    const clothSteps = Math.max(1, Math.ceil(dt * 120)),
      clothDt = dt / clothSteps;
    const clothDrive = clamp(acceleration + headSpeed, 8);
    for (let step = 0; step < clothSteps; step++) {
      capeVelocity += (-cape * 18 - capeVelocity * 6.8 - clothDrive * 0.55) * clothDt;
      cape = clamp(cape + capeVelocity * clothDt, 0.5);
      if (Math.abs(cape) === 0.5 && cape * capeVelocity > 0) capeVelocity = 0;
    }
    // Expressions own the eyes until their entire fade-out has finished.
    const expressionOwnsEyes = expressionWeight > 0 || elapsed - reactionStart < 2.85;
    if (expressionOwnsEyes) blinkPaused = true;
    else if (blinkPaused) {
      blinkPaused = false;
      nextBlink = elapsed + 2.5 + Math.random() * 3;
    }
    if (!expressionOwnsEyes && elapsed >= nextBlink) {
      blinkStart = elapsed;
      blinkDuration = 0.2 + Math.random() * 0.07;
      doubleBlink = Math.random() < 0.22;
      nextBlink = elapsed + 3 + Math.random() * 4;
    }
    const blinkAge = elapsed - blinkStart;
    const blinkPulse = (age        ) => {
      if (age < 0 || age > blinkDuration) return 0;
      const t = age / blinkDuration;
      return t < 0.32 ? smooth(t / 0.32) : t < 0.44 ? 1 : 1 - smooth((t - 0.44) / 0.56);
    };
    const blink = Math.max(
      blinkPulse(blinkAge),
      doubleBlink ? blinkPulse(blinkAge - blinkDuration - 0.11) : 0,
    );
    blinkRight = Math.max(
      blinkPulse(blinkAge - 0.014),
      doubleBlink ? blinkPulse(blinkAge - blinkDuration - 0.124) : 0,
    );
    const helloAge = Math.max(0, elapsed - helloStart);
    // Finish each nod before the next queued nod; endpoints have zero velocity.
    while (nodQueue > 0 && elapsed - nodStart >= nodDuration) {
      nodStart += nodDuration;
      nodQueue--;
      varyNod();
    }
    const nodAge = elapsed - nodStart;
    const nodPhase = Math.max(0, nodAge / nodDuration);
    // Ease into the dip, linger briefly, then take longer to lift the head.
    // Zero speed AND acceleration at each endpoint avoids a mechanical catch.
    const soften = (phase        ) => {
      const t = Math.max(0, Math.min(1, phase));
      return t * t * t * (t * (t * 6 - 15) + 10);
    };
    const nodEnvelope =
      nodPhase < 0.34
        ? soften(nodPhase / 0.34)
        : nodPhase < 0.43
          ? 1
          : nodPhase < 1
            ? 1 - soften((nodPhase - 0.43) / 0.57)
            : 0;
    const nodTarget = nodEnvelope * nodStrength;
    nod += (nodTarget - nod) * ease(18);
    nodFollow += (nod - nodFollow) * ease(8);
    if (nodTarget === 0 && Math.abs(nod) < 0.001) nod = 0;
    // A brief smile and head tilt ease back into the regular tracking pose.
    const greet =
      helloAge < 0.45
        ? Math.sin(((helloAge / 0.45) * Math.PI) / 2)
        : helloAge < 1.6
          ? 1
          : helloAge < 2.8
            ? 0.5 + 0.5 * Math.cos(((helloAge - 1.6) / 1.2) * Math.PI)
            : 0;
    smile += (greet - smile) * ease(12);
    if (greet === 0 && smile < 0.001) smile = 0;
    const reactionAge = elapsed - reactionStart;
    const expressionTarget = smooth(reactionAge / 0.45) * (1 - smooth((reactionAge - 1.7) / 1.15));
    expressionWeight += (expressionTarget - expressionWeight) * ease(14);
    if (expressionTarget === 0 && expressionWeight < 0.001) expressionWeight = 0;
    happy += (expressionWeight - happy) * ease(8);
    blush += (expressionWeight - blush) * ease(expressionWeight > blush ? 3.8 : 2.8);
    if (expressionWeight === 0 && blush < 0.001) blush = 0;
    tilt += (greet * 0.8 + nodLean * nod - tilt) * ease(5);
    if (idle && elapsed > nextIdle && expressionWeight === 0) {
      idleStart = elapsed;
      idleDirection = Math.random() < 0.5 ? -1 : 1;
      nextIdle = elapsed + 18 + Math.random() * 12;
    }
    root.dataset.idle = idleGesture > 0.1 ? 'glance' : 'rest';
    paint(elapsed, Math.max(0, blink));
    frame = requestAnimationFrame(tick);
  }
  const start = () => {
    if (renderer && !frame && !collapsed && !document.hidden && !reduced.matches)
      frame = requestAnimationFrame(tick);
  };
  const ensureRenderer = () => {
    if (rendererStarted) return;
    rendererStarted = true;
    const generation = ++rendererGeneration;
    createMascotRenderer(canvas).then((value) => {
      if (generation !== rendererGeneration) {
        value?.dispose();
        return;
      }
      renderer = value;
      if (value) {
        root.classList.add('has-rig');
        root.dataset.renderer = 'webgl';
        root.dataset.layers = String(value.layerCount);
        root.dataset.rig = 'depth-mesh';
        paint(elapsed);
      } else {
        void loadPreview();
        root.dataset.renderer = 'static';
      }
      start();
      queueWelcome();
    });
  };
  let initialApply = true;
  let deferredRenderer = false;
  const deferRenderer = () => {
    if (deferredRenderer) return;
    deferredRenderer = true;
    const schedule = () =>
      window.setTimeout(() => {
        deferredRenderer = false;
        if (!collapsed) ensureRenderer();
      }, 1000);
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
  };
  const apply = () => {
    root.classList.toggle('collapsed', collapsed);
    expanded.inert = collapsed;
    restore.setAttribute('aria-expanded', String(!collapsed));
    if (collapsed) stop();
    else {
      if (initialApply) deferRenderer();
      else ensureRenderer();
      paint(elapsed);
      start();
    }
  };
  const save = () => {
    preference = collapsed ? 'collapsed' : 'expanded';
    try {
      localStorage.setItem('mascot-widget-state', preference);
    } catch {}
  };
  let switching = false;
  const speech = root.querySelector             ('#mascot-speech') ;
  let speechTimer = 0,
    lastRestLine = -1;
  let welcomePending = !collapsed,
    welcomeTimer = 0;
  let lastClickLine = -1,
    lastClickSpeech = -Infinity;
  const hush = () => {
    clearTimeout(speechTimer);
    speech.classList.remove('visible');
    speech.setAttribute('aria-hidden', 'true');
  };
  const positionSpeech = () => {
    const rect = root.getBoundingClientRect();
    const above = rect.top - topOffset - 16;
    const below = innerHeight - rect.bottom - 16;
    speech.classList.toggle('below', above < speech.offsetHeight && below > above);
  };
  new ResizeObserver(positionSpeech).observe(speech);
  const say = (text        , duration        ) => {
    welcomePending = false;
    clearTimeout(welcomeTimer);
    welcomeTimer = 0;
    clearTimeout(speechTimer);
    // Keep each complete kaomoji together without changing textContent or click cooldown checks.
    speech.replaceChildren();
    for (const part of text.split(/(\([^()]*\)|（[^（）]*）)/g)) {
      if (/^(\([^()]*\)|（[^（）]*）)$/.test(part)) {
        const emoticon = document.createElement('span');
        emoticon.className = 'speech-emoticon';
        emoticon.textContent = part;
        speech.append(emoticon);
      } else speech.append(document.createTextNode(part));
    }
    speech.setAttribute('aria-hidden', 'false');
    positionSpeech();
    speech.classList.add('visible');
    speechTimer = window.setTimeout(hush, duration);
  };
  const queueWelcome = () => {
    if (
      !welcomePending ||
      welcomeTimer ||
      collapsed ||
      switching ||
      document.hidden ||
      !root.dataset.renderer
    )
      return;
    welcomeTimer = window.setTimeout(() => {
      welcomeTimer = 0;
      if (!document.hidden && !collapsed && !switching && welcomePending)
        say(arrivalGreeting(), 6000);
    }, 800);
  };
  let transition                   = null;
  const fade = async (element             , enter         , person         ) => {
    if (reduced.matches) return;
    const quiet = {
      opacity: 0,
      transform: `translateY(${person ? 10 : 4}px) scale(${person ? 0.975 : 0.97})`,
    };
    const visible = { opacity: 1, transform: 'translateY(0) scale(1)' };
    const animation = element.animate(enter ? [quiet, visible] : [visible, quiet], {
      duration: enter ? 380 : 300,
      easing: enter ? 'cubic-bezier(.2,.7,.3,1)' : 'cubic-bezier(.4,0,.6,1)',
      fill: 'both',
    });
    transition = animation;
    await animation.finished.catch(() => {});
    animation.cancel();
    if (transition === animation) transition = null;
  };
  const changeRest = async (next         ) => {
    if (switching || next === collapsed) return;
    switching = true;
    root.dataset.restTransition = next ? 'sleeping' : 'waking';
    expanded.inert = true;
    restore.disabled = true;
    try {
      if (next) {
        lastRestLine =
          (lastRestLine + 1 + Math.floor(Math.random() * (restGreetings.length - 1))) %
          restGreetings.length;
        say(restGreetings[lastRestLine], 2000);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        hush();
      } else hush();
      await fade(next ? expanded : restore, false, next);
      collapsed = next;
      save();
      apply();
      if (next) placement.reset();
      else placement.reposition();
      expanded.inert = true;
      await fade(next ? restore : expanded, true, !next);
      if (!next) say(wakeGreeting(), 5200);
    } finally {
      switching = false;
      delete root.dataset.restTransition;
      expanded.inert = collapsed;
      restore.disabled = false;
      (collapsed ? restore : character).focus({ preventScroll: true });
    }
  };
  apply();
  initialApply = false;
  const placement = initMascotPlacement(root, topOffset, () => {
    positionSpeech();
    if (renderer) paint(reduced.matches ? 0 : elapsed);
  });
  window.visualViewport?.addEventListener('resize', () => {
    if (renderer && !collapsed && !document.hidden) paint(reduced.matches ? 0 : elapsed);
  });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    stop();
    rendererGeneration++;
    rendererStarted = false;
    renderer?.dispose();
    renderer = null;
    root.classList.remove('has-rig');
    void loadPreview();
    root.dataset.renderer = 'static';
  });
  canvas.addEventListener('webglcontextrestored', () => {
    if (!collapsed) ensureRenderer();
  });
  root.querySelector('#mascot-hide') .addEventListener('click', () => {
    void changeRest(true);
  });
  restore.addEventListener('click', () => {
    void changeRest(false);
  });
  compact.addEventListener('change', () => {
    if (initialMode === 'auto' && !preference && !switching) {
      collapsed = compact.matches;
      if (collapsed) hush();
      apply();
    }
  });
  function resetMotion() {
    stop();
    clearTimeout(restExpressionTimer);
    nodFocus = motionActivity = idleBlend = 0;
    ambient = 1;
    braids.reset();
    bodyMotion.reset();
    headMotion.reset();
    clothMotion.reset();
    staffMotion.reset();
    previousNod = 0;
    blinkRight = currentBlink = 0;
    nodQueue = 0;
    nodStart = -10;
    shoulder = shoulderVelocity = happy = blush = interaction = 0;
    targetX =
      targetY =
      lookX =
      lookY =
      headX =
      headY =
      bodyX =
      bodyVelocity =
      hair =
      hairVelocity =
      cape =
      capeVelocity =
      nod =
      nodFollow =
      smile =
      tilt =
      expressionWeight =
        0;
    helloStart = reactionStart = blinkStart = -10;
    doubleBlink = false;
    blinkPaused = false;
    nextBlink = elapsed + 3;
    paint(elapsed, 0);
  }
  reduced.addEventListener('change', () => {
    if (reduced.matches) transition?.finish();
    resetMotion();
    start();
  });
  window.addEventListener(
    'pointermove',
    (event) => {
      if (
        collapsed ||
        reduced.matches ||
        !fine.matches ||
        event.pointerType === 'touch' ||
        document.hidden ||
        root.classList.contains('dragging')
      )
        return;
      const rect = character.getBoundingClientRect();
      lastPointer = elapsed;
      const centerX = rect.left + rect.width * 0.5;
      targetX = clamp(
        (event.clientX - centerX) /
          Math.max(event.clientX < centerX ? centerX * 0.8 : (innerWidth - centerX) * 0.55, 120),
        1,
      );
      targetY = Math.max(
        -1,
        Math.min(
          1,
          (event.clientY - (rect.top + rect.height * 0.33)) / Math.max(innerHeight * 0.45, 1),
        ),
      );
    },
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', () => {
    targetX = targetY = 0;
  });
  document.addEventListener('visibilitychange', () => {
    root.classList.toggle('is-paused', document.hidden);
    if (document.hidden) stop();
    else {
      start();
      queueWelcome();
    }
  });
  character.addEventListener('click', (event) => {
    // A pointer click must not leave an oval focus outline to be revealed by
    // the next keyboard shortcut (for example F5). Keyboard activation keeps focus.
    if (event.detail > 0) character.blur();
    if (collapsed || switching) return;
    const now = performance.now();
    if (now - lastClickSpeech >= 3200) {
      lastClickLine =
        (lastClickLine + 1 + Math.floor(Math.random() * (clickGreetings.length - 1))) %
        clickGreetings.length;
      lastClickSpeech = now;
      say(clickGreetings[lastClickLine], 4000);
    } else if (speech.textContent === clickGreetings[lastClickLine]) {
      // Rapid clicks extend reading time without changing or re-announcing it.
      clearTimeout(speechTimer);
      speechTimer = window.setTimeout(hush, 4000);
    }
    revealControls();
    dismissControls();
    requestNod();
    if (reduced.matches) {
      clearTimeout(restExpressionTimer);
      expressionWeight = happy = blush = 1;
      paint(0);
      restExpressionTimer = window.setTimeout(() => {
        expressionWeight = happy = blush = 0;
        paint(0);
      }, 1800);
      return;
    }
    if (expressionWeight > 0.05) reactionStart = elapsed - 0.65;
    else {
      // Finish a blink already in progress before the click smile begins.
      const blinkEnd = blinkStart + blinkDuration + 0.014;
      const secondStart = blinkStart + blinkDuration + 0.11;
      const remaining =
        doubleBlink && elapsed >= secondStart
          ? secondStart + blinkDuration + 0.014 - elapsed
          : blinkEnd - elapsed;
      reactionStart = elapsed + Math.max(0, remaining);
      helloStart = reactionStart;
    }
    if (elapsed < blinkStart + blinkDuration + 0.11) doubleBlink = false;
    blinkPaused = true;
    nextIdle = elapsed + 18;
  });
  window.addEventListener('pagehide', (event) => {
    stop();
    clearTimeout(restExpressionTimer);
    clearTimeout(controlsTimer);
    if (!event.persisted) {
      rendererGeneration++;
      renderer?.dispose();
    }
  });
  window.addEventListener('pageshow', () => {
    if (reduced.matches) resetMotion();
    else start();
  });
}

// Replace the complete controller/renderer together during development.
// Keeping an old animation loop alongside a new shader corrupts GL state.
