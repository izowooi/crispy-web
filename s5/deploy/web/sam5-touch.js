// Touch devices: the launcher moves focus to a hidden IME <textarea> (Hangul/keyboard input) whenever
// the canvas is pressed, which on tablets raises the on-screen keyboard on every tap. For touch/pen
// presses we set inputmode="none" before that focus happens (physical keyboards keep working), and
// offer an explicit 키보드 toggle for the rare text entry (e.g. new officer names).
const coarse = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
let lastPointer = coarse ? 'touch' : 'mouse';
let keyboardWanted = false;

const ime = () => document.querySelector('textarea[data-game-ime]');

function apply() {
  const t = ime();
  if (!t) return;
  if (lastPointer !== 'mouse' && !keyboardWanted) t.inputMode = 'none';
  else t.removeAttribute('inputmode');
}

// Capture phase on window runs before the canvas pointerdown handler that focuses the textarea.
window.addEventListener('pointerdown', (e) => {
  lastPointer = e.pointerType || 'mouse';
  apply();
}, { capture: true });
new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true });

if (coarse) {
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'sam5-keyboard';
  button.setAttribute('aria-pressed', 'false');
  button.textContent = '키보드';
  button.title = '화면 키보드 켜기/끄기 (이름 입력 등)';
  button.style.marginLeft = document.querySelector('#sam5-speed') ? '8px' : 'auto';
  button.addEventListener('click', () => {
    keyboardWanted = !keyboardWanted;
    button.setAttribute('aria-pressed', String(keyboardWanted));
    button.textContent = keyboardWanted ? '키보드 끄기' : '키보드';
    apply();
    const t = ime();
    if (!t || t.disabled) return;
    // inputmode only takes effect on focus, so refocus inside this user gesture.
    t.blur();
    if (keyboardWanted) t.focus({ preventScroll: true });
    else document.querySelector('canvas')?.focus({ preventScroll: true });
  });
  const place = () => {
    const full = document.querySelector('#fullscreen');
    if (!full) return false;
    full.style.marginLeft = '8px';
    full.before(button);
    return true;
  };
  if (!place()) addEventListener('DOMContentLoaded', place, { once: true });
}
