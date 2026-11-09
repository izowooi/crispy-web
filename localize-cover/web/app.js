/* Coverloc web UI — vanilla JS, no build step. */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fileUrl = (rel) => '/files/' + rel.split('/').map(encodeURIComponent).join('/');
const usd = (v) => v == null ? '—' : '$' + (v < 0.01 ? v.toFixed(4) : v.toFixed(3));

const S = {
  cfg: null, inputs: [], targets: new Set(['ja']), models: new Set(), exec: 'sync',
  runs: [], runId: null, run: null, pollTimer: null, batchTimer: null,
};

async function api(path, opts = {}) {
  const r = await fetch(path, { headers: opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}, ...opts });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.detail || r.statusText);
  return j;
}
function toast(msg, err = false) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (err ? ' err' : ''); t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), err ? 6000 : 2800);
}
const langLabel = (c) => S.cfg?.languages.find((l) => l.code === c)?.native || c;
const modelLabel = (id) => S.cfg?.models.find((m) => m.id === id)?.label || id;

/* ------------------------------------------------ theme & tabs */
$('#themeBtn').onclick = () => {
  const cur = document.documentElement.dataset.theme
    || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch {}
};
function showTab(name) {
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + name));
  if (name === 'results') loadRuns();
  if (name === 'batches') loadBatches();
  if (name === 'stats') loadStats();
  if (name === 'logs') loadLocal();
}
$$('.tab').forEach((t) => (t.onclick = () => showTab(t.dataset.tab)));

/* ------------------------------------------------ config */
async function init() {
  S.cfg = await api('/api/config');
  $('#keyOpenai').classList.toggle('on', S.cfg.keys.openai);
  $('#keyGemini').classList.toggle('on', S.cfg.keys.gemini);
  const src = $('#srcLang');
  src.innerHTML = `<option value="auto">자동 감지</option>` + S.cfg.languages.map((l) => `<option value="${l.code}">${esc(l.native)}</option>`).join('');
  src.value = 'en';
  src.onchange = renderLangs;
  S.cfg.default_models.forEach((m) => {
    const prov = S.cfg.models.find((x) => x.id === m)?.provider;
    if (S.cfg.keys[prov]) S.models.add(m);
  });
  renderLangs(); renderModels(); updateCount();
  loadBatches(true);
}
function renderLangs() {
  const src = $('#srcLang').value;
  S.targets.delete(src);
  $('#tgtLangs').innerHTML = S.cfg.languages.map((l) =>
    `<button class="chip ${S.targets.has(l.code) ? 'on' : ''}" data-c="${l.code}" ${l.code === src ? 'disabled' : ''}>${esc(l.native)}</button>`).join('');
  $$('#tgtLangs .chip').forEach((b) => (b.onclick = () => {
    S.targets.has(b.dataset.c) ? S.targets.delete(b.dataset.c) : S.targets.add(b.dataset.c);
    renderLangs(); updateCount();
  }));
  updateCount();
}
function renderModels() {
  $('#modelGrid').innerHTML = S.cfg.models.map((m) => {
    const ok = S.cfg.keys[m.provider];
    return `<button class="model ${S.models.has(m.id) ? 'on' : ''}" data-id="${m.id}" ${ok ? '' : 'disabled title="API 키 없음"'}>
      <div class="prov">${m.provider}</div><div class="t">${esc(m.label)}</div>
      <div class="p">${esc(m.note)}<br>출력 $${m.price.image_out}/1M · 입력 $${m.price.image_in}/1M</div></button>`;
  }).join('');
  $$('#modelGrid .model').forEach((b) => (b.onclick = () => {
    S.models.has(b.dataset.id) ? S.models.delete(b.dataset.id) : S.models.add(b.dataset.id);
    renderModels(); updateCount();
  }));
}
function updateCount() {
  const n = S.inputs.length * S.targets.size * S.models.size;
  $('#taskCount').textContent = n;
  $('#taskFormula').textContent = `= 이미지 ${S.inputs.length} × 언어 ${S.targets.size} × 모델 ${S.models.size}`;
  $('#runBtn').disabled = n === 0;
  $('#runBtn').textContent = S.exec === 'batch' ? '배치 제출' : '실행';
  $('#inputCount').textContent = S.inputs.length + '개';
}
$('#openaiMode').onchange = () => ($('#storeHint').hidden = $('#openaiMode').value !== 'images');
$$('#execMode button').forEach((b) => (b.onclick = () => {
  $$('#execMode button').forEach((x) => x.classList.toggle('active', x === b));
  S.exec = b.dataset.v; $('#cleanupRow').hidden = S.exec !== 'batch'; updateCount();
}));

/* ------------------------------------------------ inputs */
function addInputs(list) {
  for (const it of list) if (!S.inputs.some((x) => x.path === it.path)) S.inputs.push(it);
  renderInputs(); updateCount();
}
function renderInputs() {
  $('#inputList').innerHTML = S.inputs.map((it, i) => `
    <li><img src="/api/local?path=${encodeURIComponent(it.path)}" alt="">
      <div class="meta"><div class="name" title="${esc(it.path)}">${esc(it.name)}</div>
      <div class="dims">${it.w} × ${it.h}px · ${(it.bytes / 1024).toFixed(0)} KB</div></div>
      <button data-i="${i}" title="제거">✕</button></li>`).join('');
  $$('#inputList button').forEach((b) => (b.onclick = () => { S.inputs.splice(+b.dataset.i, 1); renderInputs(); updateCount(); }));
}
async function uploadFiles(files) {
  const fd = new FormData();
  [...files].forEach((f) => fd.append('files', f));
  try { addInputs(await api('/api/upload', { method: 'POST', body: fd })); } catch (e) { toast(e.message, true); }
}
const drop = $('#drop');
$('#fileInput').onchange = (e) => uploadFiles(e.target.files);
['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (e) => uploadFiles(e.dataTransfer.files));
async function addPath() {
  const v = $('#pathInput').value.trim(); if (!v) return;
  try { addInputs(await api('/api/resolve', { method: 'POST', body: JSON.stringify({ paths: [v] }) })); $('#pathInput').value = ''; }
  catch (e) { toast(e.message, true); }
}
$('#addPathBtn').onclick = addPath;
$('#pathInput').onkeydown = (e) => e.key === 'Enter' && addPath();

/* ------------------------------------------------ run */
$('#runBtn').onclick = async () => {
  const body = {
    paths: S.inputs.map((x) => x.path), targets: [...S.targets], models: [...S.models],
    source_lang: $('#srcLang').value, quality: $('#quality').value, openai_mode: $('#openaiMode').value,
    store: $('#store').checked, image_size: $('#imageSize').value, extra: $('#extra').value, batch: S.exec === 'batch', cleanup_remote: $('#cleanupRemote').checked,
  };
  $('#runBtn').disabled = true;
  try {
    const r = await api('/api/runs', { method: 'POST', body: JSON.stringify(body) });
    if (r.kind === 'batch') {
      const failed = r.groups.filter((g) => !g.remote_id);
      toast(`배치 제출 완료 · ${r.tasks}개 요청` + (failed.length ? ` (실패 ${failed.length} 그룹)` : ''), failed.length > 0);
      showTab('batches');
    } else {
      toast(`${r.tasks}개 작업 시작`);
      S.runId = r.run_id; showTab('results');
    }
  } catch (e) { toast(e.message, true); }
  finally { updateCount(); }
};

/* ------------------------------------------------ results */
async function loadRuns() {
  S.runs = await api('/api/runs');
  if (!S.runId && S.runs.length) S.runId = S.runs[0].run_id;
  $('#runList').innerHTML = S.runs.map((r) => {
    const s = r.summary || {};
    const running = s.done + s.errors < s.tasks;
    const label = r.kind === 'batch' ? '<span class="badge acc">배치</span>' : '<span class="badge">즉시</span>';
    return `<li data-id="${r.run_id}" class="${r.run_id === S.runId ? 'sel' : ''}">
      <div class="r1"><span>${esc((r.created_at || r.run_id).replace('T', ' ').slice(5, 16))}</span>${label}</div>
      <div class="r2">${(r.targets || []).map(langLabel).join(', ')} · ${(r.models || []).length}모델 · ${s.done}/${s.tasks}${running ? ' ⏳' : ''} · ${usd(s.total_usd)}</div></li>`;
  }).join('') || '<li class="muted">아직 실행 기록이 없습니다</li>';
  $$('#runList li[data-id]').forEach((li) => (li.onclick = () => { S.runId = li.dataset.id; loadRuns(); }));
  if (S.runId) loadRun(S.runId);
}
$('#reloadRuns').onclick = loadRuns;

async function loadRun(id) {
  clearTimeout(S.pollTimer);
  let run;
  try { run = await api('/api/runs/' + encodeURIComponent(id)); } catch { return; }
  S.run = run;
  renderRun(run);
  const pending = run.results.some((x) => x.status !== 'done' && x.status !== 'error');
  if (pending && run.kind === 'sync' && S.runId === id) S.pollTimer = setTimeout(() => { loadRun(id); }, 2500);
  if (!pending && S._wasPending === id) { S._wasPending = null; loadRuns(); }
  if (pending) S._wasPending = id;
}

function groupBySource(results) {
  const g = new Map();
  for (const r of results) {
    const k = r.source;
    if (!g.has(k)) g.set(k, { source: k, source_file: null, items: [] });
    if (r.source_file) g.get(k).source_file = r.source_file;
    g.get(k).items.push(r);
  }
  return [...g.values()];
}

function metricRows(r) {
  const a = r.alignment, f = r.fidelity, s = r.size, g = r.geometry;
  return `
    <span>최종 크기</span><span>${s.final_w}×${s.final_h} ${s.exact_match ? '<span class="badge ok">일치</span>' : '<span class="badge err">불일치</span>'}</span>
    <span>모델 출력</span><span>${g.model_output_w}×${g.model_output_h}${g.resampled ? ' <span class="badge warn">리사이즈</span>' : ''}</span>
    <span>드리프트(최대)</span><span>${a.drift_px_max == null ? '측정 실패' : a.drift_px_max.toFixed(2) + 'px'}</span>
    <span>이동 x / y</span><span>${a.shift_x_px ?? '—'} / ${a.shift_y_px ?? '—'}px</span>
    <span>스케일 x / y</span><span>${a.scale_x ?? '—'} / ${a.scale_y ?? '—'}</span>
    <span>변경 영역</span><span>${f.changed_area_pct}%</span>
    <span>PSNR(그 외)</span><span>${f.psnr_unchanged_db} dB</span>
    <span>비용</span><span>${usd(r.cost.usd)}${r.batch ? ' <span class="badge acc">배치</span>' : ''}</span>
    <span>소요</span><span>${r.elapsed_s ? r.elapsed_s + 's' : '—'}</span>`;
}

function renderRun(run) {
  const s = run.summary || {};
  const groups = groupBySource(run.results);
  const o = run.options || run.results.find((x) => x.options)?.options || {};
  $('#runDetail').innerHTML = `
    <div class="run-head">
      <div><h2>${esc(run.run_id)}</h2>
        <div class="muted">${run.kind === 'batch' ? '배치 작업 ' + esc(run.batch_job) : '즉시 실행'}
        ${o.openai_mode ? ` · OpenAI ${esc(o.openai_mode)} API` : ''} ${o.quality ? '· quality ' + esc(o.quality) : ''} · store ${o.store ? 'ON' : 'off'}</div></div>
      <div class="summary-chips">
        <div class="s"><span class="muted">완료</span> <b>${s.done}/${s.tasks}</b></div>
        <div class="s"><span class="muted">오류</span> <b>${s.errors}</b></div>
        <div class="s"><span class="muted">총 비용</span> <b>${usd(s.total_usd)}</b></div>
      </div>
    </div>
    ${groups.map((g, gi) => `
      <div class="source-group">
        <h3>${esc(g.source.split('/').pop())} <button class="btn small" data-cmp="${gi}" ${g.source_file ? '' : 'disabled'}>비교 뷰어 열기</button></h3>
        <div class="cards">
          ${g.items.map((r, ri) => {
            const head = `<div class="title"><span>${esc(langLabel(r.target_lang))} · ${esc(modelLabel(r.model))}</span></div>`;
            if (r.status === 'done') return `<div class="rcard">
              <div class="thumb" data-cmp="${gi}" data-item="${ri}"><img loading="lazy" src="${fileUrl(r.output_file)}" alt=""></div>
              <div class="body">${head}<div class="metrics">${metricRows(r)}</div>
              <div class="links"><a href="${fileUrl(r.output_file)}" download>최종 PNG</a><a href="${fileUrl(r.raw_file)}" target="_blank">모델 원본 출력</a><a href="${fileUrl(r.diff_file)}" target="_blank">차이 맵</a></div></div></div>`;
            if (r.status === 'error') return `<div class="rcard"><div class="body">${head}<div class="err">${esc(r.error)}</div></div></div>`;
            return `<div class="rcard"><div class="thumb"><div class="spinner"><div class="spin"></div></div></div><div class="body">${head}<div class="muted">${esc(r.status)}…</div></div></div>`;
          }).join('')}
        </div>
      </div>`).join('')}`;
  $$('#runDetail [data-cmp]').forEach((el) => (el.onclick = () => {
    const g = groups[+el.dataset.cmp];
    const done = g.items.filter((x) => x.status === 'done');
    const idx = el.dataset.item != null ? done.indexOf(g.items[+el.dataset.item]) : 0;
    openViewer(g, done, Math.max(0, idx));
  }));
}

/* ------------------------------------------------ batches */
async function loadBatches(silent = false) {
  let jobs;
  try { jobs = await api('/api/batches'); } catch { return; }
  const active = jobs.filter((j) => !['done', 'failed'].includes(j.status));
  $('#batchCount').hidden = !active.length; $('#batchCount').textContent = active.length;
  if (silent && !$('#view-batches').classList.contains('active')) { scheduleBatchPoll(active.length); return; }
  $('#batchList').innerHTML = jobs.map((j) => {
    const n = j.groups.reduce((a, g) => a + g.tasks.length, 0);
    const cls = j.status === 'done' ? 'ok' : j.status === 'failed' ? 'err' : 'warn';
    return `<div class="bjob"><div class="h">
      <div><b>${esc(j.job_id)}</b> <span class="badge ${cls}">${esc(j.status)}</span> <span class="muted">${n}개 요청 · 생성 ${esc(j.created_at.replace('T', ' '))}${j.checked_at ? ' · 확인 ' + esc(j.checked_at.slice(11)) : ''}</span></div>
      <div class="row-gap">
        <button class="btn small" data-refresh="${j.job_id}">상태 확인</button>
        <button class="btn small" data-open="${esc(j.run_dir.split('/').pop())}">결과 보기</button>
        ${cls === 'warn' ? `<button class="btn small danger" data-cancel="${j.job_id}">취소</button>` : ''}
      </div></div>
      <div class="groups">${j.groups.map((g) => `<div class="g"><span class="badge">${g.provider}</span><b>${esc(modelLabel(g.model))}</b>
        <span>${esc(g.remote_status || g.status)}</span>${g.counts ? `<span class="muted">${esc(JSON.stringify(g.counts))}</span>` : ''}
        <code>${esc(g.remote_id || '')}</code>${g.error ? `<span class="err">${esc(g.error)}</span>` : ''}${g.poll_error ? `<span class="err">${esc(g.poll_error)}</span>` : ''}</div>`).join('')}</div></div>`;
  }).join('') || '<div class="empty">배치 작업이 없습니다. 새 작업에서 “배치 실행”을 선택하세요.</div>';
  $$('[data-refresh]').forEach((b) => (b.onclick = async () => {
    b.disabled = true; b.textContent = '확인 중…';
    try { await api(`/api/batches/${b.dataset.refresh}/refresh`, { method: 'POST' }); } catch (e) { toast(e.message, true); }
    loadBatches();
  }));
  $$('[data-cancel]').forEach((b) => (b.onclick = async () => {
    try { await api(`/api/batches/${b.dataset.cancel}/cancel`, { method: 'POST' }); toast('취소 요청됨'); } catch (e) { toast(e.message, true); }
    loadBatches();
  }));
  $$('[data-open]').forEach((b) => (b.onclick = () => { S.runId = b.dataset.open; showTab('results'); }));
  scheduleBatchPoll(active.length);
}
function scheduleBatchPoll(activeCount) {
  clearTimeout(S.batchTimer);
  if (!activeCount) return;
  S.batchTimer = setTimeout(async () => {
    const jobs = await api('/api/batches').catch(() => []);
    for (const j of jobs.filter((x) => !['done', 'failed'].includes(x.status))) {
      await api(`/api/batches/${j.job_id}/refresh`, { method: 'POST' }).catch(() => {});
    }
    loadBatches(true);
  }, 30000);
}
$('#refreshAllBatches').onclick = async () => {
  const jobs = await api('/api/batches');
  for (const j of jobs.filter((x) => !['done', 'failed'].includes(x.status))) await api(`/api/batches/${j.job_id}/refresh`, { method: 'POST' }).catch((e) => toast(e.message, true));
  loadBatches();
};

/* ------------------------------------------------ stats */
async function loadStats() {
  const rows = await api('/api/stats');
  const fmt = (v, suf = '') => v == null ? '—' : v + suf;
  $('#statsTable').innerHTML = `<thead><tr><th>모델</th><th>샘플</th><th>최종 크기 일치</th><th>모델이 요청 크기 준수</th>
    <th>드리프트 중앙값</th><th>드리프트 최대</th><th>PSNR(변경 외)</th><th>평균 비용</th><th>평균 비용(배치)</th><th>평균 소요</th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td><b>${esc(r.label)}</b><br><span class="muted">${esc(r.model)}</span></td><td>${r.n}</td>
      <td>${r.exact_size_rate}%</td><td>${r.model_honored_size_rate}%</td><td>${fmt(r.drift_median_px, 'px')}</td><td>${fmt(r.drift_max_px, 'px')}</td>
      <td>${r.psnr_unchanged_median_db} dB</td><td>${usd(r.cost_avg_usd)}</td><td>${usd(r.cost_avg_batch_usd)}</td><td>${fmt(r.time_avg_s, 's')}</td></tr>`).join('')
      || '<tr><td colspan="10" class="muted">데이터 없음</td></tr>'}</tbody>`;
}

/* ================================================ COMPARE VIEWER */
const V = { items: [], a: 0, b: 1, mode: 'flip', showB: false, scale: 1, tx: 0, ty: 0, w: 0, h: 0, split: 0.5, timer: null };

function openViewer(group, done, focusIdx) {
  V.items = [{ label: '원본', url: fileUrl(group.source_file), rec: null },
    ...done.map((r) => ({ label: `${langLabel(r.target_lang)} · ${modelLabel(r.model)}`, url: fileUrl(r.output_file), diff: fileUrl(r.diff_file), rec: r }))];
  V.a = 0; V.b = Math.min(V.items.length - 1, 1 + focusIdx); V.showB = true;
  const opts = V.items.map((it, i) => `<option value="${i}">${esc(it.label)}</option>`).join('');
  $('#selA').innerHTML = opts; $('#selB').innerHTML = opts;
  $('#viewer').hidden = false; document.body.style.overflow = 'hidden';
  const probe = new Image();
  probe.onload = () => { V.w = probe.naturalWidth; V.h = probe.naturalHeight; buildLayers(); fit(); };
  probe.src = V.items[0].url;
}
function closeViewer() { $('#viewer').hidden = true; document.body.style.overflow = ''; stopAuto(); $('#autoFlip').checked = false; }

function buildLayers() {
  $('#selA').value = V.a; $('#selB').value = V.b;
  const A = V.items[V.a], B = V.items[V.b];
  const im = (src, cls = '') => `<img src="${src}" width="${V.w}" height="${V.h}" class="${cls}" draggable="false" alt="">`;
  $$('#viewMode button').forEach((x) => x.classList.toggle('active', x.dataset.v === V.mode));
  $('#stageB').hidden = V.mode !== 'side';
  if (V.mode === 'side') {
    $('#canvasA').innerHTML = im(A.url); $('#canvasB').innerHTML = im(B.url);
    $('#tagA').innerHTML = `<b>A</b>${esc(A.label)}`; $('#tagB').innerHTML = `<b>B</b>${esc(B.label)}`;
  } else if (V.mode === 'diff') {
    const d = B.diff || A.diff;
    $('#canvasA').innerHTML = d ? im(d) : im(B.url);
    $('#tagA').innerHTML = d ? `<b>차이</b>${esc((B.diff ? B : A).label)} vs 원본 · 밝을수록 크게 변경` : '원본에는 차이 맵이 없습니다';
  } else if (V.mode === 'slider') {
    $('#canvasA').innerHTML = im(A.url) + im(B.url, 'top') + '<div class="split"></div>';
    $('#tagA').innerHTML = `<b>A</b>${esc(A.label)} ◀︎ │ ▶︎ <b style="margin-left:6px">B</b>${esc(B.label)}`;
    applySplit();
  } else {
    $('#canvasA').innerHTML = im(A.url, V.showB ? 'hide' : '') + im(B.url, V.showB ? '' : 'hide');
    flipTag();
  }
  applyTransform(); renderMeta();
}
function flipTag() {
  const it = V.items[V.showB ? V.b : V.a];
  $('#tagA').innerHTML = `<b>${V.showB ? 'B' : 'A'}</b>${esc(it.label)}`;
}
function flip(force) {
  if (V.mode !== 'flip') return;
  V.showB = force ?? !V.showB;
  const imgs = $$('#canvasA img');
  if (imgs.length === 2) { imgs[0].classList.toggle('hide', V.showB); imgs[1].classList.toggle('hide', !V.showB); }
  flipTag(); renderMeta();
}
function applySplit() {
  const top = $('#canvasA img.top'), line = $('#canvasA .split');
  if (!top) return;
  const x = V.split * V.w;
  top.style.clipPath = `inset(0 0 0 ${x}px)`;
  line.style.left = x + 'px';
}
function applyTransform() {
  for (const id of ['#canvasA', '#canvasB']) {
    const c = $(id);
    c.style.transform = `translate(${V.tx}px, ${V.ty}px) scale(${V.scale})`;
    c.classList.toggle('px', V.scale >= 2);
    c.style.width = V.w + 'px'; c.style.height = V.h + 'px';
  }
  $('#zoomLabel').textContent = Math.round(V.scale * 100) + '%';
}
function stageRect() { return $('#stageA').getBoundingClientRect(); }
function fit() {
  const r = stageRect(); const pad = 24;
  V.scale = Math.min((r.width - pad * 2) / V.w, (r.height - pad * 2) / V.h);
  V.tx = (r.width - V.w * V.scale) / 2; V.ty = (r.height - V.h * V.scale) / 2;
  applyTransform();
}
function zoomTo(s, cx, cy) {
  const r = stageRect();
  cx ??= r.width / 2; cy ??= r.height / 2;
  const ix = (cx - V.tx) / V.scale, iy = (cy - V.ty) / V.scale;
  V.scale = Math.max(0.05, Math.min(32, s));
  V.tx = cx - ix * V.scale; V.ty = cy - iy * V.scale;
  applyTransform();
}
function renderMeta() {
  const it = V.items[V.mode === 'flip' && !V.showB ? V.a : V.b];
  const r = it.rec;
  if (!r) { $('#viewerMeta').innerHTML = `<span><b>${esc(it.label)}</b></span><span>${V.w}×${V.h}px</span>`; return; }
  const a = r.alignment;
  $('#viewerMeta').innerHTML = `<span><b>${esc(it.label)}</b></span>
    <span>최종 <b>${r.size.final_w}×${r.size.final_h}</b> ${r.size.exact_match ? '✓ 원본과 동일' : '✗'}</span>
    <span>모델 출력 ${r.geometry.model_output_w}×${r.geometry.model_output_h}</span>
    <span>드리프트 <b>${a.drift_px_max ?? '—'}px</b> (x ${a.shift_x_px}, y ${a.shift_y_px}, scale ${a.scale_x}/${a.scale_y})</span>
    <span>변경 ${r.fidelity.changed_area_pct}% · PSNR ${r.fidelity.psnr_unchanged_db}dB</span>
    <span>비용 <b>${usd(r.cost.usd)}</b></span>`;
}
function setMode(m) {
  const relayout = (m === 'side') !== (V.mode === 'side');
  V.mode = m; if (m === 'flip') V.showB = true; buildLayers();
  if (relayout) requestAnimationFrame(fit); // stage width changed
}
function startAuto() { stopAuto(); V.timer = setInterval(() => flip(), +$('#flipSpeed').value); }
function stopAuto() { clearInterval(V.timer); V.timer = null; }

$$('#viewMode button').forEach((b) => (b.onclick = () => setMode(b.dataset.v)));
$('#selA').onchange = (e) => { V.a = +e.target.value; buildLayers(); };
$('#selB').onchange = (e) => { V.b = +e.target.value; buildLayers(); };
$('#zoomFit').onclick = fit;
$('#zoom100').onclick = () => zoomTo(1);
$('#closeViewer').onclick = closeViewer;
$('#autoFlip').onchange = (e) => { if (e.target.checked) { if (V.mode !== 'flip') setMode('flip'); startAuto(); } else stopAuto(); };
$('#flipSpeed').oninput = () => { if (V.timer) startAuto(); };

// pan / zoom (synced across both stages) + slider drag
let drag = null;
for (const st of ['#stageA', '#stageB']) {
  const el = $(st);
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = el.getBoundingClientRect();
    zoomTo(V.scale * Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    const ix = (e.clientX - r.left - V.tx) / V.scale;
    const nearSplit = V.mode === 'slider' && Math.abs(ix - V.split * V.w) * V.scale < 14;
    drag = { x: e.clientX, y: e.clientY, tx: V.tx, ty: V.ty, split: nearSplit || e.altKey, moved: false, r };
    if (drag.split) moveSplit(e);
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (drag.split) return moveSplit(e);
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    V.tx = drag.tx + dx; V.ty = drag.ty + dy; applyTransform();
  });
  el.addEventListener('pointerup', () => {
    if (drag && !drag.moved && !drag.split && V.mode === 'flip') flip(); // click = flip
    drag = null;
  });
}
function moveSplit(e) {
  const ix = (e.clientX - drag.r.left - V.tx) / V.scale;
  V.split = Math.max(0, Math.min(1, ix / V.w)); applySplit();
}
window.addEventListener('resize', () => { if (!$('#viewer').hidden) fit(); });
document.addEventListener('keydown', (e) => {
  if ($('#viewer').hidden || e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') return;
  const k = e.key;
  if (k === 'Escape') closeViewer();
  else if (k === ' ') { e.preventDefault(); if (V.mode !== 'flip') setMode('flip'); flip(); }
  else if (k === 'ArrowRight' || k === 'ArrowLeft') {
    e.preventDefault();
    const n = V.items.length; let b = V.b;
    do { b = (b + (k === 'ArrowRight' ? 1 : -1) + n) % n; } while (b === V.a && n > 1);
    V.b = b; V.showB = true; buildLayers();
  }
  else if (k === 'f' || k === 'F') setMode('flip');
  else if (k === 's' || k === 'S') setMode('slider');
  else if (k === 'b' || k === 'B') setMode('side');
  else if (k === 'd' || k === 'D') setMode('diff');
  else if (k === '0') fit();
  else if (k === '1') zoomTo(1);
  else if (k === '2') zoomTo(2);
  else if (k === '+' || k === '=') zoomTo(V.scale * 1.25);
  else if (k === '-') zoomTo(V.scale / 1.25);
});


/* ================================================ LOG MANAGEMENT */
// Session key lives only in this variable (never stored, never sent anywhere but our localhost API).
const L = { items: [], lastId: null, sel: new Set() };
function sessHeaders() {
  const h = { 'Content-Type': 'application/json' };
  const k = $('#sessKey').value.trim();
  if (k) { h['X-OAI-Session'] = k; h['X-OAI-Org'] = $('#sessOrg').value.trim(); h['X-OAI-Project'] = $('#sessProject').value.trim(); }
  return h;
}
// two-click confirm instead of blocking confirm() dialogs
function armed(btn, fn) {
  btn.onclick = async () => {
    if (!btn.classList.contains('armed')) {
      btn.dataset.label = btn.textContent; btn.classList.add('armed'); btn.textContent = '한 번 더 눌러 확인';
      clearTimeout(btn._t); btn._t = setTimeout(() => { btn.classList.remove('armed'); btn.textContent = btn.dataset.label; }, 4000);
      return;
    }
    clearTimeout(btn._t); btn.classList.remove('armed'); btn.textContent = btn.dataset.label; btn.disabled = true;
    try { await fn(); } catch (e) { toast(e.message, true); } finally { btn.disabled = false; }
  };
}

$('#harInput').onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const har = JSON.parse(await f.text());
    let found = null;
    for (const en of har.log.entries) {
      if (!en.request.url.startsWith('https://api.openai.com/')) continue;
      const h = Object.fromEntries(en.request.headers.map((x) => [x.name.toLowerCase(), x.value]));
      const m = /^Bearer\s+(sess-\S+)/.exec(h.authorization || '');
      if (m) { found = { key: m[1], org: h['openai-organization'] || '', project: h['openai-project'] || '' }; if (h['openai-project']) break; }
    }
    if (!found) return toast('HAR에서 세션 키(sess-…)를 찾지 못했습니다', true);
    $('#sessKey').value = found.key; $('#sessOrg').value = found.org; $('#sessProject').value = found.project;
    toast('HAR에서 세션 정보를 읽었습니다 (브라우저 메모리에만 보관)');
  } catch (err) { toast('HAR 파싱 실패: ' + err.message, true); }
  e.target.value = '';
};

async function loadResponses(more = false) {
  if (!$('#sessKey').value.trim()) return toast('세션 키를 입력하거나 HAR을 불러오세요', true);
  const q = new URLSearchParams({ limit: 50 }); if (more && L.lastId) q.set('after', L.lastId);
  try {
    const r = await fetch('/api/logs/openai/responses?' + q, { headers: sessHeaders() });
    const j = await r.json(); if (!r.ok) throw new Error(j.detail || r.statusText);
    if (!more) { L.items = []; L.sel.clear(); }
    L.items.push(...j.items); L.lastId = j.last_id;
    $('#respMore').hidden = !j.has_more;
    renderResponses(j.total);
  } catch (e) { toast(e.message, true); }
}
function renderResponses(total) {
  $('#respActions').hidden = false;
  $('#respInfo').textContent = `${L.items.length}건 표시` + (total != null ? ` / 전체 ${total}건` : '');
  $('#respTable').innerHTML = `<thead><tr><th></th><th>생성</th><th>ID</th><th>모델 / 툴</th><th>출력</th><th>입력 미리보기</th></tr></thead><tbody>` +
    (L.items.map((x) => `<tr class="${x.gone ? 'gone' : ''}"><td><input type="checkbox" data-id="${x.id}" ${L.sel.has(x.id) ? 'checked' : ''} ${x.gone ? 'disabled' : ''}></td>
      <td>${esc((x.created_at || '').replace('T', ' '))}</td><td><code>${esc(x.id)}</code></td>
      <td>${esc(x.model)}${x.tools.length ? '<br><span class="muted">' + esc(x.tools.join(', ')) + '</span>' : ''}</td>
      <td>${esc(x.output_types.join(', '))}</td><td class="prev" title="${esc(x.preview)}">${esc(x.preview)}</td></tr>`).join('')
      || '<tr><td colspan="6" class="muted">저장된 로그가 없습니다</td></tr>') + '</tbody>';
  $$('#respTable input[data-id]').forEach((c) => (c.onchange = () => { c.checked ? L.sel.add(c.dataset.id) : L.sel.delete(c.dataset.id); syncSel(); }));
  syncSel();
}
function syncSel() {
  $('#respDelete').disabled = !L.sel.size;
  $('#respDelete').textContent = L.sel.size ? `선택 삭제 (${L.sel.size})` : '선택 삭제';
  const live = L.items.filter((x) => !x.gone);
  $('#respAll').checked = live.length > 0 && live.every((x) => L.sel.has(x.id));
}
$('#respAll').onchange = (e) => { L.items.filter((x) => !x.gone).forEach((x) => (e.target.checked ? L.sel.add(x.id) : L.sel.delete(x.id))); renderResponses(); };
async function deleteResponses(ids) {
  const r = await fetch('/api/logs/openai/responses/delete', { method: 'POST', headers: sessHeaders(), body: JSON.stringify({ ids }) });
  const j = await r.json(); if (!r.ok) throw new Error(j.detail || r.statusText);
  const ok = j.results.filter((x) => x.deleted).map((x) => x.id);
  L.items.forEach((x) => { if (ok.includes(x.id)) { x.gone = true; L.sel.delete(x.id); } });
  const fail = j.results.filter((x) => !x.deleted);
  toast(`${ok.length}건 삭제` + (fail.length ? ` · 실패 ${fail.length}건: ${fail[0].error}` : ''), fail.length > 0);
  return j;
}
$('#loadResp').onclick = () => loadResponses(false);
$('#respMore').onclick = () => loadResponses(true);
armed($('#respDelete'), async () => { await deleteResponses([...L.sel]); renderResponses(); loadLocal(); });
armed($('#respIdsDelete'), async () => {
  const ids = $('#respIds').value.split(/[\s,]+/).filter(Boolean);
  if (!ids.length) return toast('삭제할 ID를 입력하세요', true);
  await deleteResponses(ids); $('#respIds').value = ''; loadLocal();
});

async function loadLocal() {
  const xs = await api('/api/logs/openai/local').catch(() => []);
  $('#localTable').innerHTML = `<thead><tr><th>시각</th><th>Response ID</th><th>모델</th><th>언어</th><th>원본</th><th></th></tr></thead><tbody>` +
    (xs.map((x) => `<tr class="${x.deleted ? 'gone' : ''}"><td>${esc((x.created_at || '').replace('T', ' '))}</td><td><code>${esc(x.id)}</code></td>
      <td>${esc(modelLabel(x.model))}</td><td>${esc(langLabel(x.target_lang))}</td><td>${esc((x.source || '').split('/').pop())}</td>
      <td>${x.deleted ? '<span class="badge">삭제됨</span>' : `<button class="btn small danger" data-del="${esc(x.id)}">삭제</button>`}</td></tr>`).join('')
      || '<tr><td colspan="6" class="muted">store:true로 실행한 작업이 없습니다 (기본값은 store:false)</td></tr>') + '</tbody>';
  $$('#localTable [data-del]').forEach((b) => armed(b, async () => { await deleteResponses([b.dataset.del]); loadLocal(); }));
}
$('#reloadLocal').onclick = loadLocal;

const fmtBytes = (b) => b == null ? '' : b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : (b / 1024).toFixed(0) + ' KB';
async function loadOaBatches() {
  $('#oaBatches').textContent = '불러오는 중…';
  try {
    const bs = await api('/api/logs/openai/batches');
    $('#oaBatches').innerHTML = bs.map((b) => {
      const live = b.files.filter((f) => f.exists);
      return `<div class="ob"><div><b><code>${esc(b.id)}</code></b> <span class="badge">${esc(b.status)}</span> ${b.app === 'coverloc' ? '<span class="badge acc">coverloc</span>' : ''}
        <span class="muted">${esc((b.created_at || '').replace('T', ' '))} · ${esc(b.endpoint)}</span>
        <div class="files">${b.files.map((f) => `<span class="badge ${f.exists ? 'warn' : ''}">${f.kind} ${f.exists ? fmtBytes(f.bytes) : '삭제됨'}</span>`).join('')}</div></div>
        ${!['completed', 'failed', 'expired', 'cancelled'].includes(b.status) ? '<span class="muted">진행 중 — 완료 후 삭제 가능</span>'
          : live.length ? `<button class="btn small danger" data-purge="${esc(b.id)}">파일 ${live.length}개 삭제</button>` : '<span class="muted">남은 파일 없음 · 배치 기록은 API로 삭제 불가</span>'}</div>`;
    }).join('') || '<div class="muted">배치가 없습니다</div>';
    $$('[data-purge]').forEach((btn) => armed(btn, async () => {
      const r = await api(`/api/logs/openai/batches/${btn.dataset.purge}/purge`, { method: 'POST' });
      const n = r.files.filter((f) => f.deleted).length; toast(`파일 ${n}/${r.files.length}개 삭제됨`); loadOaBatches();
    }));
  } catch (e) { $('#oaBatches').textContent = e.message; }
}
$('#loadOaBatches').onclick = loadOaBatches;

async function loadGemini() {
  $('#gmList').textContent = '불러오는 중…';
  try {
    const g = await api('/api/logs/gemini');
    const rows = [
      ...g.batches.map((b) => `<div class="ob"><div><b><code>${esc(b.name)}</code></b> <span class="badge">${esc(b.state || '')}</span>
        <span class="muted">${esc(b.display_name || '')} · ${esc((b.model || '').replace('models/', ''))} · ${esc((b.created_at || '').slice(0, 19).replace('T', ' '))}</span></div>
        ${/RUNNING|PENDING/.test(b.state || '') ? '<span class="muted">진행 중</span>' : `<button class="btn small danger" data-gdel="${esc(b.name)}">배치+파일 삭제</button>`}</div>`),
      ...g.files.map((f) => `<div class="ob"><div><b><code>${esc(f.name)}</code></b> <span class="badge">파일 ${fmtBytes(+f.bytes)}</span>
        <span class="muted">${esc(f.display_name || '')} · 만료 ${esc((f.expires_at || '').slice(0, 16).replace('T', ' '))}</span></div>
        <button class="btn small danger" data-gdel="${esc(f.name)}">삭제</button></div>`),
    ];
    $('#gmList').innerHTML = rows.join('') || '<div class="muted">남은 Gemini 배치/파일이 없습니다</div>';
    $$('[data-gdel]').forEach((btn) => armed(btn, async () => {
      await api('/api/logs/gemini/delete', { method: 'POST', body: JSON.stringify({ names: [btn.dataset.gdel] }) });
      toast('삭제했습니다'); loadGemini();
    }));
  } catch (e) { $('#gmList').textContent = e.message; }
}
$('#loadGemini').onclick = loadGemini;


armed($('#purgeBtn'), async () => {
  const ids = $('#purgeIds').value.split(/[\s,]+/).filter(Boolean);
  if (!ids.length) return toast('배치 ID를 입력하세요', true);
  const r = await api('/api/logs/batches/purge', { method: 'POST', body: JSON.stringify({ ids }) });
  $('#purgeResult').innerHTML = r.results.map((x) => `<div class="ob"><div><b><code>${esc(x.id)}</code></b>
    <span class="badge ${x.ok ? 'ok' : 'err'}">${x.ok ? '삭제 완료' : '실패'}</span>
    <span class="muted">${esc(x.error || (x.details || []).map((d) => `${d.id || d.name}: ${d.deleted ? (d.note || '삭제됨') : d.error}`).join(' · '))}</span>
    ${x.note ? `<div class="muted">${esc(x.note)}</div>` : ''}</div></div>`).join('');
  const ok = r.results.filter((x) => x.ok).length;
  toast(`${ok}/${r.results.length}개 배치 정리 완료`, ok < r.results.length);
  $('#purgeIds').value = '';
  loadOaBatches();
});

init().catch((e) => toast('초기화 실패: ' + e.message, true));
