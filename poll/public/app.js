// All user content is rendered with textContent via el(); never innerHTML.
const app = document.getElementById('app');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const KST_OFFSET = 9 * HOUR;
const LIMITS = { title: 100, description: 500, option: 50, minOptions: 2, maxOptions: 5, maxDays: 90 };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// ---------- DOM helpers ----------
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'vars') for (const [k, v] of Object.entries(value)) node.style.setProperty(k, v);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key in node && typeof value !== 'string') node[key] = value;
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  check: ['M5 12.5 10 17 19 7.5'],
  clock: ['M12 7v5l3 2', 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z'],
  users: ['M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1', 'M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M21 19v-1a4 4 0 0 0-3-3.9', 'M15.5 3.2a3.5 3.5 0 0 1 0 6.6'],
  lock: ['M6 11h12v9H6z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'],
};
function icon(name, strokeWidth = 2) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of ICONS[name]) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', String(strokeWidth));
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
  }
  return svg;
}

// Every view swap enters through a short blur; children stagger via --i.
function render(...nodes) {
  const list = nodes.flat().filter(Boolean);
  list.forEach((node, i) => {
    node.classList.add('enter');
    node.style.setProperty('--i', String(i));
  });
  app.replaceChildren(...list);
  window.scrollTo(0, 0);
  animateIn(app);
}

// Bars grow and numbers count up once the nodes are on screen.
function animateIn(root) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      for (const fill of root.querySelectorAll('[data-width]')) fill.style.width = fill.dataset.width;
      for (const num of root.querySelectorAll('[data-count]')) countUp(num, Number(num.dataset.count), num.dataset.suffix ?? '');
    }),
  );
}

function countUp(node, to, suffix) {
  const decimals = Number.isInteger(to) ? 0 : 1;
  if (reducedMotion.matches || to === 0) {
    node.textContent = `${to.toFixed(decimals)}${suffix}`;
    return;
  }
  const start = performance.now();
  const duration = 700;
  const step = (t) => {
    const p = Math.min(1, (t - start) / duration);
    const eased = 1 - Math.pow(1 - p, 4);
    node.textContent = `${(to * eased).toFixed(decimals)}${suffix}`;
    if (p < 1) requestAnimationFrame(step);
  };
  node.textContent = `0${suffix}`;
  requestAnimationFrame(step);
}

const charCount = (s) => [...s].length;
const colorOf = (i) => `var(--c${(i % 5) + 1})`;
const pct = (n, voters) => (voters ? Math.round((n / voters) * 1000) / 10 : 0);

// ---------- time (display KST, store UTC ms) ----------
const kstFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const formatKst = (ms) => kstFormat.format(new Date(ms));
const toKstInput = (ms) => new Date(ms + KST_OFFSET).toISOString().slice(0, 16);
const fromKstInput = (value) => {
  const ms = Date.parse(`${value}:00Z`);
  return Number.isNaN(ms) ? NaN : ms - KST_OFFSET;
};

function remaining(ms) {
  const diff = ms - Date.now();
  if (diff <= 0) return '마감됨';
  if (diff < HOUR) return `${Math.max(1, Math.round(diff / 60000))}분 남음`;
  if (diff < DAY) return `${Math.round(diff / HOUR)}시간 남음`;
  return `${Math.floor(diff / DAY)}일 남음`;
}

// ---------- API ----------
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function api(method, path, body) {
  const init = { method, credentials: 'same-origin', redirect: 'manual', headers: { Accept: 'application/json' } };
  if (method !== 'GET') {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body ?? {});
  }
  let res;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError(0, '네트워크 오류가 발생했습니다. 연결을 확인하세요.');
  }
  // Access redirects to its login page when the session expires.
  if (res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400)) throw new ApiError(401, 'session');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || `요청에 실패했습니다 (${res.status})`);
  return data;
}

function errorBox(err) {
  if (err.status === 401) {
    return el(
      'div',
      { class: 'notice notice-error', role: 'alert' },
      el('p', { text: '로그인 세션이 만료되었습니다.' }),
      el('button', { type: 'button', class: 'btn btn-primary', onclick: () => location.reload(), text: '다시 로그인' }),
    );
  }
  return el('div', { class: 'notice notice-error', role: 'alert', text: err.message });
}

const loading = (n = 3) => el('div', { class: 'loading', 'aria-label': '불러오는 중' }, Array.from({ length: n }, () => el('div', { class: 'skeleton' })));

// ---------- shared pieces ----------
function optionRow(option, i, { count, voters, lead, showCount }) {
  const visible = count !== null && count !== undefined;
  const value = visible ? pct(count, voters) : null;
  return el(
    'div',
    { class: 'orow', vars: { '--c': colorOf(i), '--i': String(i) } },
    el(
      'div',
      { class: 'orow-main' },
      el('div', { class: 'orow-label', text: option.label }),
      el('div', { class: 'orow-track' }, el('div', { class: 'orow-fill', 'data-width': visible && count > 0 ? `${Math.max(value, 2)}%` : '0%' })),
    ),
    showCount && visible ? el('span', { class: 'orow-count num', text: `${count}표` }) : null,
    visible
      ? el('span', { class: `pill${lead ? ' lead' : ''}`, 'data-count': String(value), 'data-suffix': '%', text: `${value}%` })
      : el('span', { class: 'pill muted', 'aria-label': '마감 후 공개', text: '—' }),
  );
}

const leaderIndex = (counts) => {
  const max = Math.max(...counts);
  return max > 0 ? counts.indexOf(max) : -1;
};

// ---------- list ----------
async function showList(params) {
  const status = params.get('status') === 'closed' ? 'closed' : 'open';
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  render(loading());
  try {
    const data = await api('GET', `/api/polls?status=${status}&page=${page}`);
    const nodes = data.items.map(card);
    if (!nodes.length) {
      nodes.push(
        el(
          'div',
          { class: 'empty' },
          el('p', { text: status === 'open' ? '진행 중인 질문이 없습니다.' : '마감된 질문이 없습니다.' }),
          status === 'open' ? el('a', { class: 'btn btn-primary btn-pill', href: '#/new', text: '첫 질문 만들기' }) : null,
        ),
      );
    }
    if (page > 1 || data.has_more) {
      nodes.push(
        el(
          'nav',
          { class: 'pager', 'aria-label': '페이지' },
          page > 1 ? el('a', { class: 'btn', href: `#/?status=${status}&page=${page - 1}`, text: '← 이전' }) : el('span'),
          el('span', { class: 'muted small', text: `${page} 페이지` }),
          data.has_more ? el('a', { class: 'btn', href: `#/?status=${status}&page=${page + 1}`, text: '다음 →' }) : el('span'),
        ),
      );
    }
    render(nodes);
  } catch (err) {
    render(errorBox(err));
  }
}

function card(p) {
  const counts = p.options.map((o) => o.count ?? 0);
  const lead = p.voters ? leaderIndex(counts) : -1;
  return el(
    'a',
    { class: 'card', href: `#/p/${encodeURIComponent(p.id)}` },
    el('div', { class: 'card-title', text: p.title }),
    el('div', { class: 'card-sub', text: p.closed ? `${formatKst(p.closes_at)} 마감` : `${formatKst(p.closes_at)} 마감 · ${remaining(p.closes_at)}` }),
    el(
      'div',
      { class: 'card-options' },
      p.options.map((o, i) => optionRow(o, i, { count: o.count, voters: p.voters, lead: i === lead })),
    ),
    el(
      'div',
      { class: 'card-foot' },
      el(
        'span',
        { class: 'voters' },
        icon(p.voters === null ? 'lock' : 'users'),
        p.voters === null ? '결과는 마감 후 공개' : `${p.voters}명 투표`,
      ),
      p.multi ? el('span', { class: 'badge', text: '복수 선택' }) : null,
      p.closed ? el('span', { class: 'badge badge-closed', text: '마감' }) : el('span', { class: 'badge badge-live', text: '진행 중' }),
    ),
  );
}

// ---------- detail ----------
async function showPoll(id, { keepScroll = false } = {}) {
  if (!keepScroll) render(loading(2));
  let data;
  try {
    data = await api('GET', `/api/polls/${encodeURIComponent(id)}`);
  } catch (err) {
    render(backLink(), errorBox(err));
    return;
  }
  const y = window.scrollY;
  render(backLink(), pollHeader(data.poll), ballotPanel(data), resultsPanel(data.poll, data.options, data.results), data.can_manage ? managePanel(data.poll) : null);
  if (keepScroll) window.scrollTo(0, y);
}

function pollHeader(poll) {
  return el(
    'section',
    { class: 'poll-head' },
    el(
      'div',
      { class: 'meta' },
      poll.closed ? el('span', { class: 'badge badge-closed', text: '마감' }) : el('span', { class: 'badge badge-live', text: '진행 중' }),
      el('span', { text: poll.multi ? '복수 선택' : '단일 선택' }),
      el('span', { class: 'dot', text: poll.results_mode === 'live' ? '실시간 결과' : '마감 후 공개' }),
    ),
    el('h1', { class: 'poll-title', text: poll.title }),
    poll.description ? el('p', { class: 'poll-desc', text: poll.description }) : null,
    el(
      'span',
      { class: 'deadline' },
      icon('clock'),
      poll.closed ? `${formatKst(poll.closes_at)} 마감 (KST)` : `${formatKst(poll.closes_at)} 마감 (KST) · ${remaining(poll.closes_at)}`,
    ),
  );
}

function ballotPanel({ poll, options, my_choices: mine }) {
  const voted = mine.length > 0;
  const chosen = new Set(mine);
  const message = el('div', { class: 'form-message', role: 'status' });
  const inputs = options.map((o) =>
    el('input', { type: poll.multi ? 'checkbox' : 'radio', name: 'choice', value: o.id, checked: chosen.has(o.id), disabled: poll.closed }),
  );
  const choiceList = el(
    'fieldset',
    { class: 'choices', disabled: poll.closed },
    el('legend', { class: 'sr-only', text: '선택지' }),
    options.map((o, i) =>
      el(
        'label',
        { class: `choice${poll.multi ? ' multi' : ''}` },
        inputs[i],
        el('span', { class: 'choice-mark' }, icon('check', 3)),
        el('span', { class: 'choice-label', text: o.label }),
        chosen.has(o.id) ? el('span', { class: 'mine-tag', text: '내 선택' }) : null,
      ),
    ),
  );
  const submit = el(
    'button',
    { type: 'submit', class: 'btn btn-primary btn-block btn-morph' },
    el('span', { class: 'btn-label', text: voted ? '투표 수정' : '투표하기' }),
    el('span', { class: 'btn-icon spinner', 'aria-hidden': 'true' }, el('span')),
    el('span', { class: 'btn-icon check', 'aria-hidden': 'true' }, icon('check', 3)),
  );
  return el(
    'form',
    {
      class: 'panel',
      onsubmit: async (e) => {
        e.preventDefault();
        const ids = inputs.filter((i) => i.checked).map((i) => i.value);
        if (ids.length === 0) {
          message.textContent = '선택지를 골라주세요.';
          return;
        }
        message.textContent = '';
        morph(submit, 'loading');
        try {
          await api('POST', `/api/polls/${encodeURIComponent(poll.id)}/ballot`, { option_ids: ids });
          morph(submit, 'done');
          await wait(reducedMotion.matches ? 0 : 650);
          await showPoll(poll.id, { keepScroll: true });
          flash(voted ? '투표를 수정했습니다.' : '투표했습니다.');
        } catch (err) {
          morph(submit, null);
          if (err.status === 401) message.replaceChildren(errorBox(err));
          else message.textContent = err.message;
        }
      },
    },
    el('h2', { class: 'section-title', text: poll.closed ? '선택지' : poll.multi ? '여러 개 선택할 수 있어요' : '하나를 골라주세요' }),
    choiceList,
    poll.closed
      ? el('p', { class: 'muted small', text: voted ? '마감되었습니다. 표시된 항목이 내 선택입니다.' : '마감되어 더 이상 투표할 수 없습니다.' })
      : [submit, el('p', { class: 'muted small', text: voted ? '마감 전까지 언제든 수정할 수 있습니다.' : '투표는 익명으로 저장됩니다.' })],
    message,
  );
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// One element morphs: full-width label → circular loader → check.
function morph(button, state) {
  if (state) {
    if (!button.dataset.state) {
      button.style.width = `${button.offsetWidth}px`;
      void button.offsetWidth;
      button.style.width = `${button.offsetHeight}px`;
    }
    button.dataset.state = state;
    button.setAttribute('aria-busy', String(state === 'loading'));
  } else {
    delete button.dataset.state;
    button.removeAttribute('aria-busy');
    button.style.width = '';
  }
}

function resultsPanel(poll, options, results) {
  if (!results) {
    return el(
      'section',
      { class: 'panel' },
      el('h2', { class: 'section-title', text: '결과' }),
      el('p', { class: 'deadline' }, icon('lock'), `결과는 마감 후 공개됩니다 · ${formatKst(poll.closes_at)}`),
      el(
        'div',
        { class: 'results' },
        options.map((o, i) => optionRow(o, i, { count: null })),
      ),
    );
  }
  const { voters, counts } = results;
  const values = options.map((o) => counts[o.id] ?? 0);
  const lead = leaderIndex(values);
  return el(
    'section',
    { class: 'panel' },
    el(
      'div',
      { class: 'leader' },
      lead >= 0
        ? el(
            'div',
            { vars: { '--c': colorOf(lead) } },
            el('div', { class: 'leader-label', text: `${poll.closed ? '최다 득표' : '선두'} · ${options[lead].label}` }),
            el('div', { class: 'leader-num', 'data-count': String(pct(values[lead], voters)), 'data-suffix': '%', text: `${pct(values[lead], voters)}%` }),
          )
        : el('h2', { class: 'section-title', text: '결과' }),
      el('div', { class: 'leader-total' }, el('span', { class: 'num', 'data-count': String(voters), text: String(voters) }), el('span', { class: 'leader-unit', text: '명 투표' })),
    ),
    el(
      'div',
      { class: 'results' },
      options.map((o, i) => optionRow(o, i, { count: values[i], voters, lead: i === lead, showCount: true })),
    ),
    el('p', {
      class: 'muted small',
      text: poll.multi ? '비율은 투표자 수 기준입니다. 복수 선택이라 합이 100%를 넘을 수 있습니다.' : '비율은 투표자 수 기준입니다.',
    }),
  );
}

function managePanel(poll) {
  const message = el('div', { class: 'form-message', role: 'status' });
  const del = el('button', { type: 'button', class: 'btn btn-danger', text: '삭제' });
  let armed = false;
  del.addEventListener('click', async () => {
    if (!armed) {
      armed = true;
      del.textContent = '한 번 더 누르면 삭제';
      setTimeout(() => {
        armed = false;
        del.textContent = '삭제';
      }, 4000);
      return;
    }
    del.disabled = true;
    try {
      await api('DELETE', `/api/polls/${encodeURIComponent(poll.id)}`, {});
      location.hash = '#/';
      flash('질문을 삭제했습니다.');
    } catch (err) {
      del.disabled = false;
      message.textContent = err.message;
    }
  });
  return el(
    'section',
    { class: 'panel' },
    el('h2', { class: 'section-title', text: '관리' }),
    el('div', { class: 'row-actions' }, poll.closed ? null : el('a', { class: 'btn', href: `#/p/${encodeURIComponent(poll.id)}/edit`, text: '수정' }), del),
    poll.closed ? el('p', { class: 'muted small', text: '마감된 질문은 수정할 수 없고 삭제만 할 수 있습니다.' }) : null,
    message,
  );
}

// ---------- create / edit ----------
async function showForm(id) {
  let existing = null;
  if (id) {
    render(loading(1));
    try {
      existing = await api('GET', `/api/polls/${encodeURIComponent(id)}`);
    } catch (err) {
      render(backLink(), errorBox(err));
      return;
    }
    if (!existing.can_manage) {
      render(backLink(`#/p/${encodeURIComponent(id)}`), errorBox({ message: '수정 권한이 없습니다.' }));
      return;
    }
  }
  const poll = existing?.poll;
  const locked = Boolean(existing?.locked);

  const field = (label, control, hint) =>
    el('label', { class: 'field' }, el('span', { class: 'field-label', text: label }), control, hint ? el('span', { class: 'hint', text: hint }) : null);

  const counter = (input, max) => {
    const c = el('span', { class: 'counter' });
    const update = () => {
      const n = charCount(input.value.trim());
      c.textContent = `${n}/${max}`;
      c.classList.toggle('over', n > max);
    };
    input.addEventListener('input', update);
    update();
    return c;
  };

  const title = el('input', { type: 'text', required: true, maxLength: LIMITS.title * 2, value: poll?.title ?? '', placeholder: '예: 다음 회식 메뉴는?' });
  const desc = el('textarea', { rows: 3, maxLength: LIMITS.description * 2, placeholder: '배경이나 참고 사항 (선택)' });
  desc.value = poll?.description ?? '';

  const optionsBox = el('div', { class: 'option-inputs' });
  const addBtn = el('button', { type: 'button', class: 'btn btn-sm', text: '+ 선택지 추가' });
  const optionRowInput = (value = '') => {
    const input = el('input', { type: 'text', required: true, maxLength: LIMITS.option * 2, value, disabled: locked, 'aria-label': '선택지' });
    const remove = el('button', { type: 'button', class: 'icon-btn', 'aria-label': '선택지 삭제', text: '✕', disabled: locked });
    const row = el('div', { class: 'option-row enter' }, el('span', { class: 'option-swatch' }), input, remove);
    remove.addEventListener('click', () => {
      if (optionsBox.children.length <= LIMITS.minOptions) return;
      row.remove();
      syncOptions();
    });
    return row;
  };
  const syncOptions = () => {
    const rows = [...optionsBox.children];
    rows.forEach((row, i) => {
      row.style.setProperty('--c', colorOf(i));
      row.querySelector('input').placeholder = `선택지 ${i + 1}`;
      row.querySelector('button').disabled = locked || rows.length <= LIMITS.minOptions;
    });
    addBtn.disabled = locked || rows.length >= LIMITS.maxOptions;
  };
  (existing ? existing.options.map((o) => o.label) : ['', '']).forEach((v) => optionsBox.append(optionRowInput(v)));
  addBtn.addEventListener('click', () => {
    if (optionsBox.children.length >= LIMITS.maxOptions) return;
    const row = optionRowInput();
    optionsBox.append(row);
    syncOptions();
    row.querySelector('input').focus();
  });
  syncOptions();

  const multi = el('input', { type: 'checkbox', role: 'switch', checked: poll?.multi ?? false, disabled: locked });
  const modeLive = el('input', { type: 'radio', name: 'mode', value: 'live', checked: (poll?.results_mode ?? 'live') === 'live', disabled: locked });
  const modeAfter = el('input', { type: 'radio', name: 'mode', value: 'after_close', checked: poll?.results_mode === 'after_close', disabled: locked });

  const now = Date.now();
  const closes = el('input', {
    type: 'datetime-local',
    required: true,
    value: toKstInput(poll?.closes_at ?? Math.ceil((now + 7 * DAY) / HOUR) * HOUR),
    min: toKstInput(now),
    max: toKstInput(now + LIMITS.maxDays * DAY),
  });

  const message = el('div', { class: 'form-message', role: 'alert' });
  const submit = el(
    'button',
    { type: 'submit', class: 'btn btn-primary btn-block btn-morph' },
    el('span', { class: 'btn-label', text: existing ? '저장' : '질문 만들기' }),
    el('span', { class: 'btn-icon spinner', 'aria-hidden': 'true' }, el('span')),
    el('span', { class: 'btn-icon check', 'aria-hidden': 'true' }, icon('check', 3)),
  );

  const form = el(
    'form',
    {
      class: 'panel form',
      novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        message.textContent = '';
        const labels = [...optionsBox.querySelectorAll('input')].map((i) => i.value.trim());
        const closesAt = fromKstInput(closes.value);
        const problems = [];
        if (!title.value.trim()) problems.push('제목을 입력하세요.');
        if (charCount(title.value.trim()) > LIMITS.title) problems.push(`제목은 ${LIMITS.title}자 이하입니다.`);
        if (charCount(desc.value.trim()) > LIMITS.description) problems.push(`설명은 ${LIMITS.description}자 이하입니다.`);
        if (!locked) {
          if (labels.some((l) => !l)) problems.push('빈 선택지가 있습니다.');
          if (labels.some((l) => charCount(l) > LIMITS.option)) problems.push(`선택지는 ${LIMITS.option}자 이하입니다.`);
          if (new Set(labels).size !== labels.length) problems.push('같은 선택지가 중복되었습니다.');
        }
        if (Number.isNaN(closesAt)) problems.push('마감 시각을 입력하세요.');
        else if (closesAt <= Date.now()) problems.push('마감 시각은 현재 이후여야 합니다.');
        else if (closesAt > Date.now() + LIMITS.maxDays * DAY) problems.push('마감은 최대 90일 뒤까지 가능합니다.');
        if (problems.length) {
          message.textContent = problems[0];
          return;
        }
        const body = { title: title.value, description: desc.value, closes_at: closesAt };
        if (!locked) Object.assign(body, { options: labels, multi: multi.checked, results_mode: modeAfter.checked ? 'after_close' : 'live' });
        morph(submit, 'loading');
        try {
          const res = existing ? await api('PUT', `/api/polls/${encodeURIComponent(poll.id)}`, body) : await api('POST', '/api/polls', body);
          morph(submit, 'done');
          await wait(reducedMotion.matches ? 0 : 500);
          location.hash = `#/p/${encodeURIComponent(existing ? poll.id : res.id)}`;
          flash(existing ? '저장했습니다.' : '질문을 만들었습니다.');
        } catch (err) {
          morph(submit, null);
          if (err.status === 401) message.replaceChildren(errorBox(err));
          else message.textContent = err.message;
        }
      },
    },
    el('h1', { class: 'poll-title', text: existing ? '질문 수정' : '새 질문' }),
    field('제목', title, null),
    counter(title, LIMITS.title),
    field('설명 (선택)', desc, null),
    counter(desc, LIMITS.description),
    el(
      'fieldset',
      { class: 'field' },
      el('legend', { class: 'field-label', text: `선택지 (${LIMITS.minOptions}~${LIMITS.maxOptions}개)` }),
      locked ? el('p', { class: 'notice', text: '투표가 시작되어 선택지·복수 선택·결과 공개 방식은 바꿀 수 없습니다.' }) : null,
      optionsBox,
      addBtn,
    ),
    el('label', { class: 'switch-row' }, el('span', { class: 'field-label', text: '복수 선택 허용' }), el('span', { class: 'switch' }, multi, el('span', { class: 'switch-track' }))),
    el(
      'fieldset',
      { class: 'field' },
      el('legend', { class: 'field-label', text: '결과 공개' }),
      el('div', { class: 'segmented' }, el('label', {}, modeLive, '실시간 공개'), el('label', {}, modeAfter, '마감 후 공개')),
      el('span', { class: 'hint', text: '실시간 공개는 투표 전에도 결과를 볼 수 있습니다.' }),
    ),
    field('마감 시각 (한국 시간)', closes, '최대 90일 뒤까지 설정할 수 있습니다.'),
    message,
    submit,
  );
  render(backLink(existing ? `#/p/${encodeURIComponent(poll.id)}` : '#/'), form);
  if (!existing) title.focus({ preventScroll: true });
}

// ---------- shell ----------
function backLink(href = '#/') {
  return el('a', { class: 'back', href, text: '← 목록' });
}

let flashTimer;
function flash(text) {
  document.querySelector('.toast')?.remove();
  const toast = el('div', { class: 'toast', role: 'status', text });
  document.body.append(toast);
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    toast.classList.add('out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 2200);
}

// Underline tab indicator: the leading edge moves faster than the trailing one, so it stretches.
const navtabs = document.getElementById('navtabs');
const indicator = navtabs.querySelector('.navtab-indicator');
let indicatorFrom = null;
function setActiveTab(status) {
  const tabs = [...navtabs.querySelectorAll('.navtab')];
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.status === status));
  const tab = tabs.find((t) => t.dataset.status === status);
  if (!tab) {
    indicator.style.setProperty('--o', '0');
    return;
  }
  const navBox = navtabs.getBoundingClientRect();
  const box = tab.getBoundingClientRect();
  const left = box.left - navBox.left;
  const right = navBox.right - box.right;
  const movingRight = indicatorFrom !== null && left > indicatorFrom;
  const movingLeft = indicatorFrom !== null && left < indicatorFrom;
  indicator.style.setProperty('--ld', movingRight ? '0.5s' : '0.32s');
  indicator.style.setProperty('--rd', movingLeft ? '0.5s' : '0.32s');
  indicator.style.setProperty('--l', `${left}px`);
  indicator.style.setProperty('--r', `${right}px`);
  indicator.style.setProperty('--o', '1');
  indicatorFrom = left;
}

function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = hash.split('?');
  const params = new URLSearchParams(query);
  const fab = document.getElementById('fab');
  fab.hidden = path === '/new' || path.endsWith('/edit');
  let m;
  if (path === '/' || path === '') {
    setActiveTab(params.get('status') === 'closed' ? 'closed' : 'open');
    return showList(params);
  }
  setActiveTab(null);
  if (path === '/new') return showForm(null);
  if ((m = path.match(/^\/p\/([\w-]{1,32})\/edit$/))) return showForm(m[1]);
  if ((m = path.match(/^\/p\/([\w-]{1,32})$/))) return showPoll(m[1]);
  render(backLink(), el('div', { class: 'notice', text: '페이지를 찾을 수 없습니다.' }));
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  const dark = document.documentElement.classList.toggle('dark');
  try {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  } catch {}
});

window.addEventListener('hashchange', route);
window.addEventListener('resize', () => {
  const active = navtabs.querySelector('.navtab.active');
  if (active) setActiveTab(active.dataset.status);
});
route();
api('GET', '/api/me')
  .then((me) => {
    document.getElementById('whoami').textContent = me.is_admin ? `${me.email} (관리자)` : me.email;
  })
  .catch(() => {});
