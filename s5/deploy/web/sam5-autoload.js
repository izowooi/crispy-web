// Network auto-import for the shipped launcher.
//
// The launcher only imports from a picked folder or a picked SAM5PACK file. When this browser has
// no imported game yet, we download the full pack and hand it to the launcher's own pack input,
// so its validation (per-file SHA-256, executable hash) and IndexedDB storage stay authoritative.
//
// Safety: importing mints a new asset generation and the launcher purges saves of every other
// generation. We therefore only act in the launcher's explicit "nothing imported" state and never
// re-import over an existing game (SAVEDATA.S5 lives in the current generation).
const EMPTY_OUTPUT = 'Choose your game folder or private runtime pack';
const MANIFEST_URL = new URL('./pack-manifest.json', import.meta.url);

const panel = document.createElement('section');
panel.id = 'sam5-autoload';
panel.hidden = true;
panel.innerHTML = `<style>#sam5-autoload{max-width:800px;margin:12px auto 0;padding:16px 20px;border:1px solid #2a3a55;border-radius:8px;line-height:1.6}#sam5-autoload progress{width:100%;display:block;margin:8px 0}#sam5-autoload [data-error]{color:#ffb4a6}</style><strong>게임 데이터 자동 준비</strong><p data-msg aria-live="polite"></p><progress aria-label="Game download" max="1" value="0"></progress><button type="button" data-retry hidden>다시 시도</button>`;
const msg = panel.querySelector('[data-msg]');
const bar = panel.querySelector('progress');
const retry = panel.querySelector('[data-retry]');

function say(text, isError = false) {
  msg.textContent = text;
  if (isError) msg.dataset.error = 'true';
  else delete msg.dataset.error;
  retry.hidden = !isError;
}

const mb = (n) => (n / 1048576).toFixed(1);

async function fetchManifest() {
  const res = await fetch(MANIFEST_URL, { cache: 'no-store', credentials: 'same-origin' });
  if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) throw new AuthOrServerError(res);
  const m = await res.json();
  if (m.format !== 'SAM5PACK/1' || !/^gamepacks\/[\w.-]+\.bin$/.test(m.key) || !/^[a-f0-9]{64}$/.test(m.sha256)) {
    throw Error('게임 데이터 목록 형식이 올바르지 않습니다.');
  }
  return m;
}

class AuthOrServerError extends Error {
  constructor(res) {
    const html = (res.headers.get('content-type') ?? '').includes('html');
    super(
      res.status === 401 || res.status === 403 || html || res.redirected
        ? '로그인 세션이 만료되었습니다. 페이지를 새로고침해 다시 로그인하세요. (로컬 세이브는 그대로 남아 있습니다)'
        : `서버 응답 오류 (HTTP ${res.status})`,
    );
  }
}

async function download(manifest) {
  const res = await fetch(new URL(`./${manifest.key}`, MANIFEST_URL), { credentials: 'same-origin' });
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || !type.startsWith('application/octet-stream') || !res.body) throw new AuthOrServerError(res);
  const reader = res.body.getReader();
  const buf = new Uint8Array(manifest.size);
  let got = 0;
  bar.max = manifest.size;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (got + value.length > buf.length) throw Error('게임 데이터 크기가 목록과 다릅니다.');
    buf.set(value, got);
    got += value.length;
    bar.value = got;
    say(`게임 데이터 다운로드: ${mb(got)} / ${mb(manifest.size)} MB`);
  }
  if (got !== manifest.size) throw Error(`다운로드가 중간에 끊겼습니다 (${mb(got)} / ${mb(manifest.size)} MB).`);
  say('다운로드한 데이터 확인 중…');
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buf)), (b) => b.toString(16).padStart(2, '0')).join('');
  if (digest !== manifest.sha256) throw Error('다운로드한 게임 데이터의 SHA-256 이 일치하지 않습니다.');
  return new File([buf], manifest.key.split('/').at(-1), { type: 'application/octet-stream' });
}

// Resolves with the launcher's pack <input> once it reports an empty store and accepts input.
function waitForEmptyStore() {
  return new Promise((resolve) => {
    const check = () => {
      const section = document.querySelector('section[aria-label="Game assets"]');
      const input = section?.querySelector('input[data-pack]');
      const output = section?.querySelector('output');
      if (!input || !output) return false;
      if (output.textContent.trim() !== EMPTY_OUTPUT || output.dataset.error || input.disabled) return false;
      observer.disconnect();
      resolve({ section, input });
      return true;
    };
    const observer = new MutationObserver(check);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    check();
  });
}

async function run(input) {
  retry.hidden = true;
  bar.removeAttribute('value');
  try {
    say('게임 데이터 목록 확인 중…');
    const file = await download(await fetchManifest());
    if (input.disabled) throw Error('게임 가져오기가 이미 진행 중입니다. 잠시 후 새로고침하세요.');
    const files = new DataTransfer();
    files.items.add(file);
    input.files = files.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    say('다운로드 완료. 브라우저에 저장하고 엔진을 시작합니다 (아래 진행 표시 참고). 다음 접속부터는 다운로드 없이 시작합니다.');
    bar.value = bar.max;
  } catch (error) {
    console.error('[sam5-autoload]', error);
    say(error instanceof Error ? error.message : String(error), true);
  }
}

waitForEmptyStore().then(({ section, input }) => {
  section.before(panel);
  panel.hidden = false;
  // The launcher hides its import section once the engine takes over; follow it.
  new MutationObserver(() => {
    if (section.hidden && !msg.dataset.error) panel.hidden = true;
  }).observe(section, { attributes: true, attributeFilter: ['hidden'] });
  retry.addEventListener('click', () => run(input));
  run(input);
});
