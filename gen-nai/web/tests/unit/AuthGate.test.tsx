import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthGate } from "@/components/AuthGate";
import { AUTH_STORAGE_KEY } from "@/lib/auth";

describe("AuthGate", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
        removeItem: vi.fn((key: string) => storage.delete(key)),
        clear: vi.fn(() => storage.clear()),
      },
    });
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    storage.clear();
  });

  it("shows password gate before rendering protected content", async () => {
    render(
      <AuthGate>
        <div data-testid="protected">protected</div>
      </AuthGate>,
    );

    expect(await screen.findByTestId("password-gate")).toBeInTheDocument();
    expect(screen.queryByTestId("protected")).toBeNull();
  });

  it("renders children when auth flag exists", async () => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, "1");
    render(
      <AuthGate>
        <div data-testid="protected">protected</div>
      </AuthGate>,
    );

    expect(await screen.findByTestId("protected")).toBeInTheDocument();
    expect(screen.queryByTestId("password-gate")).toBeNull();
  });

  it("submits the password and persists auth on success", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as Response);

    render(
      <AuthGate>
        <div data-testid="protected">protected</div>
      </AuthGate>,
    );

    fireEvent.change(await screen.findByTestId("password-input"), {
      target: { value: "nicenovel" },
    });
    fireEvent.click(screen.getByTestId("password-submit"));

    await waitFor(() => expect(screen.queryByTestId("password-gate")).toBeNull());
    expect(screen.getByTestId("protected")).toBeInTheDocument();
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBe("1");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ password: "nicenovel" }),
      }),
    );
  });

  it("shows an error and clears input when password is wrong", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ ok: false }),
    } as Response);

    render(
      <AuthGate>
        <div data-testid="protected">protected</div>
      </AuthGate>,
    );

    fireEvent.change(await screen.findByTestId("password-input"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByTestId("password-submit"));

    expect(await screen.findByTestId("password-error")).toHaveTextContent("암호가 올바르지 않습니다.");
    expect((screen.getByTestId("password-input") as HTMLInputElement).value).toBe("");
    expect(screen.queryByTestId("protected")).toBeNull();
  });
});
