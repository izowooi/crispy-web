// Points the launcher's engine worker at the speed-patched build (scripts/patch-engine.mjs).
// Must run before the launcher wraps window.Worker, which happens when its asset store opens.
// Escape hatch: ?engine=original (remembered in this browser) / ?engine=fast.
// Also adds the 속도 (game speed) selector: shortens the game's own waits, applied live.
const FAST_WORKER = '__FAST_WORKER__';
const KEY = 'sam5-engine';
const SPEED_KEY = 'sam5-speed';
const SPEEDS = [1, 1.5, 2, 3, 4];

const load = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: the choice just isn't remembered */
  }
};

function choice() {
  const q = new URLSearchParams(location.search).get('engine');
  if (q === 'original' || q === 'fast') save(KEY, q);
  return q ?? load(KEY) ?? 'fast';
}

const mode = choice();
document.documentElement.dataset.engine = mode;
if (mode === 'fast') {
  let speed = Number(load(SPEED_KEY));
  if (!SPEEDS.includes(speed)) speed = 1;
  let engine;
  const fastUrl = new URL(`./assets/${FAST_WORKER}`, import.meta.url);
  const Base = window.Worker;
  window.Worker = class extends Base {
    constructor(url, options) {
      const isEngine = /\/assets\/worker-[A-Za-z0-9_-]+\.js$/.test(new URL(String(url), location.href).pathname);
      if (isEngine) fastUrl.searchParams.set('speed', String(speed));
      super(isEngine ? fastUrl.href : url, options);
      if (isEngine) engine = this;
    }
  };

  const select = document.createElement('select');
  select.id = 'sam5-speed';
  select.title = '게임 속도: 메시지 표시·애니메이션 대기 시간을 줄입니다';
  select.setAttribute('aria-label', '게임 속도');
  select.style.marginLeft = 'auto';
  select.innerHTML = SPEEDS.map((s) => `<option value="${s}">속도 ${s}x</option>`).join('');
  select.value = String(speed);
  select.addEventListener('change', () => {
    speed = Number(select.value);
    save(SPEED_KEY, String(speed));
    engine?.postMessage({ type: 'sam5-speed', speed });
    select.blur();
  });
  document.querySelector('#fullscreen')?.before(select);
}
console.info(`[sam5] engine: ${mode}`);
