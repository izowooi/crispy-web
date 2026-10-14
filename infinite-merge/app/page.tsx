import { Game } from "@/components/Game";

// The game shell is static; session-dependent state is fetched client-side from /api/state.
export default function Page() {
  return <Game />;
}
