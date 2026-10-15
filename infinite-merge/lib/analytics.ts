// Product analytics (PostHog), browser only. Event names and properties are listed in docs/learn/05-posthog.md.
// The SDK is loaded lazily and only when /api/state returns a key, so analytics off costs no bundle or requests.
import type { AnalyticsInfo, AiProvider } from "./types";

export type AnalyticsEvent =
  | "landing_viewed"
  | "guest_session_started"
  | "guest_start_failed"
  | "game_started"
  | "combine_completed"
  | "combine_failed"
  | "guest_limit_reached"
  | "milestone_reached"
  | "progress_reset"
  | "logged_out";

type Properties = Record<string, string | number | boolean | null | undefined>;

/** The slice of posthog-js this app uses, so tests can pass a fake. */
export type AnalyticsClient = {
  init(key: string, config: Record<string, unknown>): unknown;
  register(props: Properties): void;
  capture(event: string, props?: Properties): unknown;
  identify(id: string, props?: Properties): void;
  reset(): void;
};

type Loader = () => Promise<AnalyticsClient>;

const loadPosthog: Loader = async () => (await import("posthog-js")).default as unknown as AnalyticsClient;
const MAX_QUEUE = 50;

let client: AnalyticsClient | null = null;
let starting = false;
let off = false;
let identifiedAs: string | null = null;
let queue: Array<() => void> = [];

export function analyticsEnvironment(hostname: string): "production" | "development" {
  return hostname === "merge.zowoo.uk" ? "production" : "development";
}

/** Call with every /api/state response. Starts the SDK once, then keeps the identity in step with the session. */
export async function syncAnalytics(info: AnalyticsInfo | null, hostname: string, load: Loader = loadPosthog): Promise<void> {
  if (!info) {
    if (!client && !starting) {
      off = true;
      queue = [];
      if (analyticsEnvironment(hostname) === "development") {
        console.warn(
          "INFINITE_MERGE_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once INFINITE_MERGE_POSTHOG_KEY is configured",
        );
      }
    }
    return;
  }
  off = false;
  if (!client && !starting) {
    starting = true;
    try {
      const posthog = await load();
      posthog.init(info.key, {
        api_host: info.host,
        defaults: "2026-08-30",
        // Gameplay is measured by the explicit events below. Click autocapture on a drag-and-drop board,
        // heatmaps and replays would mostly spend the free monthly quota on noise. Turn them on here if wanted.
        autocapture: false,
        enable_heatmaps: false,
        disable_session_recording: true,
        capture_dead_clicks: false,
        disable_surveys: true,
        disable_product_tours: true,
        capture_exceptions: true,
        person_profiles: "identified_only",
      });
      posthog.register({ app: "infinite-merge", environment: analyticsEnvironment(hostname) });
      client = posthog;
    } catch {
      off = true; // blocked by an ad blocker or offline: play on without analytics
      queue = [];
      return;
    } finally {
      starting = false;
    }
  }
  setIdentity(info.distinctId);
  const pending = queue;
  queue = [];
  pending.forEach((run) => run());
}

function setIdentity(distinctId: string | null) {
  if (!client || distinctId === identifiedAs) return;
  // reset() only on the way out of an identified session; an anonymous visitor keeps their id into the game.
  if (identifiedAs && distinctId !== identifiedAs) client.reset();
  if (distinctId) client.identify(distinctId);
  identifiedAs = distinctId;
}

function run(fn: (c: AnalyticsClient) => void) {
  if (off) return;
  if (client) fn(client);
  else if (queue.length < MAX_QUEUE) queue.push(() => client && fn(client));
}

export function track(event: AnalyticsEvent, props?: Properties): void {
  run((c) => c.capture(event, props));
}

/** Super properties sent with every later event. */
export function setPlayerContext(provider: AiProvider | null): void {
  run((c) => c.register({ provider: provider ?? "none" }));
}

/** Test hook: forget the started SDK. */
export function resetAnalyticsForTests(): void {
  client = null;
  starting = false;
  off = false;
  identifiedAs = null;
  queue = [];
}
