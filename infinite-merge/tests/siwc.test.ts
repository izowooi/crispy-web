import { describe, expect, it } from "vitest";
import { codeChallengeS256, createPkce, randomToken } from "@/lib/server/siwc/pkce";
import { buildAuthorizeUrl } from "@/lib/server/siwc/oauth";

describe("pkce", () => {
  it("matches the RFC 7636 Appendix B vector", () => {
    expect(codeChallengeS256("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });

  it("produces unpadded base64url values", () => {
    const { verifier, challenge } = createPkce();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomToken()).not.toBe(randomToken());
  });
});

describe("buildAuthorizeUrl", () => {
  const base = {
    redirectUri: "http://127.0.0.1:3000/auth/callback",
    hostId: "urn:uuid:00000000-0000-4000-8000-000000000000",
    state: "s",
    nonce: "n",
    codeChallenge: "c",
  };

  it("uses dynamic registration for a new account", () => {
    const url = new URL(buildAuthorizeUrl(base));
    expect(url.origin + url.pathname).toBe("https://auth.openai.com/api/accounts/authorize");
    const q = url.searchParams;
    expect(q.get("client_id")).toBe("dynamic_agent_client");
    expect(q.get("agent_name_hint")).toBe("Infinite Merge");
    expect(q.get("ext_agent_host_id")).toBe(base.hostId);
    expect(q.get("response_type")).toBe("code");
    expect(q.get("redirect_uri")).toBe(base.redirectUri);
    expect(q.get("scope")).toBe("openid profile email offline_access resource.invoke chatgpt.tokens.use.direct");
    expect(q.get("resource")).toBe("https://api.openai.com/v1");
    expect(q.get("code_challenge_method")).toBe("S256");
    expect(q.get("code_challenge")).toBe("c");
    expect(q.get("state")).toBe("s");
    expect(q.get("nonce")).toBe("n");
    expect(q.has("id_token_hint")).toBe(false);
    expect(q.has("login_hint")).toBe(false);
  });

  it("re-authorizes with the issued client and hints, without agent_name_hint", () => {
    const q = new URL(
      buildAuthorizeUrl({ ...base, clientId: "oaiapp_123", idTokenHint: "eyJ.x.y", loginHint: "user@example.com" }),
    ).searchParams;
    expect(q.get("client_id")).toBe("oaiapp_123");
    expect(q.has("agent_name_hint")).toBe(false);
    expect(q.get("ext_agent_host_id")).toBe(base.hostId);
    expect(q.get("id_token_hint")).toBe("eyJ.x.y");
    expect(q.get("login_hint")).toBe("user@example.com");
  });
});
