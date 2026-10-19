export const LIMITS = {
  title: 100,
  description: 500,
  option: 50,
  minOptions: 2,
  maxOptions: 5,
  maxCloseMs: 90 * 24 * 60 * 60 * 1000,
};

export class ValidationError extends Error {}

const fail = (message) => {
  throw new ValidationError(message);
};

const charCount = (s) => [...s].length;
// Newlines are allowed only where the field is multi-line; other control characters never.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const CONTROL_OR_NEWLINE = /[\u0000-\u001F\u007F]/;

function text(value, field, max, { required = true, multiline = false } = {}) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string') fail(`${field}: 문자열이어야 합니다.`);
  const v = value.replace(/\r\n/g, '\n').trim();
  if (required && !v) fail(`${field}: 필수 항목입니다.`);
  if (charCount(v) > max) fail(`${field}: ${max}자 이하로 입력하세요.`);
  if ((multiline ? CONTROL : CONTROL_OR_NEWLINE).test(v)) fail(`${field}: 허용되지 않는 문자가 있습니다.`);
  return v;
}

function bool(value, field, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') fail(`${field}: true/false 여야 합니다.`);
  return value;
}

function resultsMode(value, fallback) {
  if (value === undefined) return fallback;
  if (value !== 'live' && value !== 'after_close') fail('결과 공개 방식이 올바르지 않습니다.');
  return value;
}

function closesAt(value, now) {
  if (!Number.isSafeInteger(value)) fail('마감 시각이 올바르지 않습니다.');
  if (value <= now) fail('마감 시각은 현재 이후여야 합니다.');
  if (value > now + LIMITS.maxCloseMs) fail('마감 시각은 최대 90일 뒤까지 설정할 수 있습니다.');
  return value;
}

function options(value) {
  if (!Array.isArray(value)) fail('선택지 목록이 필요합니다.');
  if (value.length < LIMITS.minOptions || value.length > LIMITS.maxOptions) fail('선택지는 2~5개여야 합니다.');
  const labels = value.map((v, i) => text(v, `선택지 ${i + 1}`, LIMITS.option));
  if (new Set(labels).size !== labels.length) fail('같은 선택지가 중복되었습니다.');
  return labels;
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function parseCreate(body, now) {
  if (!isPlainObject(body)) fail('요청 형식이 올바르지 않습니다.');
  return {
    title: text(body.title, '제목', LIMITS.title),
    description: text(body.description, '설명', LIMITS.description, { required: false, multiline: true }),
    options: options(body.options),
    multi: bool(body.multi, '복수 선택', false),
    resultsMode: resultsMode(body.results_mode, 'live'),
    closesAt: closesAt(body.closes_at, now),
  };
}

// Only fields present in the body are changed.
export function parseUpdate(body, now) {
  if (!isPlainObject(body)) fail('요청 형식이 올바르지 않습니다.');
  const out = {};
  if ('title' in body) out.title = text(body.title, '제목', LIMITS.title);
  if ('description' in body) out.description = text(body.description, '설명', LIMITS.description, { required: false, multiline: true });
  if ('closes_at' in body) out.closesAt = closesAt(body.closes_at, now);
  if ('options' in body) out.options = options(body.options);
  if ('multi' in body) out.multi = bool(body.multi, '복수 선택');
  if ('results_mode' in body) out.resultsMode = resultsMode(body.results_mode);
  if (Object.keys(out).length === 0) fail('변경할 항목이 없습니다.');
  return out;
}

export function parseBallot(body) {
  if (!isPlainObject(body) || !Array.isArray(body.option_ids)) fail('선택한 항목이 필요합니다.');
  const ids = body.option_ids;
  if (ids.length > LIMITS.maxOptions || !ids.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 64)) {
    fail('선택한 항목이 올바르지 않습니다.');
  }
  if (new Set(ids).size !== ids.length) fail('같은 항목을 두 번 선택할 수 없습니다.');
  return ids;
}
