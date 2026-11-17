import { initMascot } from './modules/controller.js';
import { markup } from './widget-markup.js';

const script = [...document.querySelectorAll('script[type="module"][src]')].find(
  (element) => element.src === import.meta.url,
);
const { roxyStart, roxyPosition, roxyTopOffset, roxyDialogue } = script?.dataset ?? {};

async function loadDialogue(url) {
  if (!url) return;
  try {
    const response = await fetch(new URL(url, document.baseURI));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const value = await response.json();
    if (value && typeof value === 'object') return value;
  } catch (error) {
    console.warn('Roxy Web Mascot: using the built-in dialogue.', error);
  }
}

let root = document.getElementById('widget-mascot');
if (!root) {
  const template = document.createElement('template');
  template.innerHTML = markup;
  for (const [selector, attribute] of [
    ['canvas', 'data-layers'],
    ['img', 'data-src'],
  ]) {
    const element = template.content.querySelector(selector);
    element.setAttribute(attribute, new URL(element.getAttribute(attribute), import.meta.url).href);
  }
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./mascot.css', import.meta.url).href;
  await new Promise((resolve, reject) => {
    stylesheet.onload = resolve;
    stylesheet.onerror = reject;
    document.head.append(stylesheet);
  });
  root = template.content.querySelector('#widget-mascot');
  document.body.append(template.content);
}

const offset = Number(roxyTopOffset);
initMascot(root, {
  start: ['expanded', 'collapsed'].includes(roxyStart) ? roxyStart : 'auto',
  position: roxyPosition === 'right' ? 'right' : 'left',
  topOffset: Number.isFinite(offset) ? Math.max(0, offset) : 0,
  dialogue: await loadDialogue(roxyDialogue),
});
