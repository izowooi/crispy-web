// Anonymous identity: a secret token proves which seat is yours; the nickname is just for display.

const TOKEN_KEY = "five.token";
const NAME_KEY = "five.name";
const GAMES_KEY = "five.myGames";

const ADJ = ["용감한", "느긋한", "재빠른", "엉뚱한", "씩씩한", "조용한", "명랑한", "신중한", "졸린", "배고픈", "수줍은", "당당한"];
const NOUN = ["판다", "고양이", "수달", "펭귄", "다람쥐", "여우", "부엉이", "거북이", "토끼", "햄스터", "코알라", "강아지"];

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode: identity lasts for this tab only
  }
}

let memoryToken: string | null = null;

export function playerToken(): string {
  const saved = read(TOKEN_KEY) ?? memoryToken;
  if (saved) return saved;
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  memoryToken = token;
  write(TOKEN_KEY, token);
  return token;
}

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

export function nickname(): string {
  const saved = read(NAME_KEY);
  if (saved) return saved;
  const name = `${pick(ADJ)} ${pick(NOUN)}`;
  write(NAME_KEY, name);
  return name;
}

export function setNickname(name: string) {
  const clean = name.trim().slice(0, 16);
  if (clean) write(NAME_KEY, clean);
}

export function myGameIds(): string[] {
  try {
    const ids = JSON.parse(read(GAMES_KEY) ?? "[]");
    return Array.isArray(ids) ? ids.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function rememberGame(id: string) {
  const ids = [id, ...myGameIds().filter((x) => x !== id)].slice(0, 50);
  write(GAMES_KEY, JSON.stringify(ids));
}
