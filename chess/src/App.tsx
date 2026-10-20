import { IconChart, IconHome, IconList } from "./components/Icons";
import { GamePage } from "./pages/GamePage";
import { History } from "./pages/History";
import { Home } from "./pages/Home";
import { NewGame } from "./pages/NewGame";
import { Stats } from "./pages/Stats";
import { navigate, useRoute } from "./router";

const TABS = [
  { path: "/", label: "홈", icon: <IconHome /> },
  { path: "/history", label: "기록", icon: <IconList /> },
  { path: "/stats", label: "AI 순위", icon: <IconChart /> },
];

export function App() {
  const route = useRoute();
  const game = route.match(/^\/game\/([\w-]+)/);
  if (game) return <GamePage key={game[1]} id={game[1]} />;

  let page;
  if (route === "/new/online") page = <NewGame key="online" mode="pvp" />;
  else if (route === "/new/human") page = <NewGame key="human" mode="ai" />;
  else if (route === "/new/arena") page = <NewGame key="arena" mode="arena" />;
  else if (route === "/history") page = <History />;
  else if (route === "/stats") page = <Stats />;
  else page = <Home />;

  const showTabs = !route.startsWith("/new");
  return (
    <div className={`shell${showTabs ? " with-tabs" : ""}`}>
      {showTabs && (
        <nav className="tabs">
          <div className="brand" onClick={() => navigate("/")}>
            <span className="brand-mark">♞</span> 체스 한 판
          </div>
          {TABS.map((t) => (
            <button key={t.path} className={`tab${route === t.path ? " active" : ""}`} onClick={() => navigate(t.path)}>
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      )}
      <div className="shell-content" key={route}>
        {page}
      </div>
    </div>
  );
}
