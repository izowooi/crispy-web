import { useEffect, useState } from "react";
import { ApiError, api, type User } from "./api";
import { cache } from "./cache";
import { Inbox } from "./Inbox";
import { Login } from "./Login";

type Auth = { state: "checking" } | { state: "out"; error?: string } | { state: "in"; user: User };

export function App() {
  // 마지막 로그인 사용자를 기억해 두면 /api/me 응답을 기다리지 않고 캐시된 목록부터 그린다.
  const [auth, setAuth] = useState<Auth>(() => {
    const user = cache.user();
    return user ? { state: "in", user } : { state: "checking" };
  });

  useEffect(() => {
    let alive = true;
    api
      .me()
      .then(({ user }) => {
        if (!alive) return;
        cache.setUser(user);
        setAuth((prev) => (prev.state === "in" && sameUser(prev.user, user) ? prev : { state: "in", user }));
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof ApiError && err.status === 401) {
          cache.clear();
          setAuth({ state: "out" });
        } else {
          // 네트워크 오류일 때 캐시된 사용자가 있으면 그대로 오프라인 열람을 허용한다.
          setAuth((prev) => (prev.state === "in" ? prev : { state: "out", error: (err as Error).message }));
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const onUnauthorized = () => {
    cache.clear();
    setAuth({ state: "out" });
  };

  if (auth.state === "checking") return <div className="min-h-dvh bg-white dark:bg-gray-950" />;
  if (auth.state === "out") return <Login networkError={auth.error} />;
  return <Inbox key={auth.user.id} user={auth.user} onUnauthorized={onUnauthorized} />;
}

const sameUser = (a: User, b: User) =>
  a.id === b.id && a.email === b.email && a.name === b.name && a.picture === b.picture;
