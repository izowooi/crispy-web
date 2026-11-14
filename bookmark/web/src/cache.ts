import type { Bookmark, Counts, Filter, User } from "./api";

const USER_KEY = "zk:v1:user";
const pageKey = (userId: string, filter: Filter) => `zk:v1:page:${userId}:${filter}`;

export type CachedPage = { items: Bookmark[]; nextCursor: string | null; counts?: Counts };

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 공간이 없거나 막혀 있어도 캐시는 선택 사항이다.
  }
}

export const cache = {
  user: () => read<User>(USER_KEY),
  setUser: (user: User) => {
    const prev = read<User>(USER_KEY);
    if (prev && prev.id !== user.id) cache.clear();
    write(USER_KEY, user);
  },
  page: (userId: string, filter: Filter) => read<CachedPage>(pageKey(userId, filter)),
  setPage: (userId: string, filter: Filter, page: CachedPage) => write(pageKey(userId, filter), page),
  clear: () => {
    try {
      for (const key of Object.keys(localStorage)) if (key.startsWith("zk:")) localStorage.removeItem(key);
    } catch {
      // 무시
    }
  },
};
