import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AuthGate, AUTH_STORAGE_KEY } from "@/components/AuthGate";

describe("components/AuthGate", () => {
  beforeEach(() => {
    window.localStorage.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("shows PasswordGate first when no auth stored", async () => {
    render(
      <AuthGate>
        <div data-testid="protected">SECRET</div>
      </AuthGate>
    );
    expect(await screen.findByTestId("password-gate")).toBeInTheDocument();
    expect(screen.queryByTestId("protected")).toBeNull();
  });

  it("renders children directly when auth flag is present in localStorage", async () => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, "1");
    render(
      <AuthGate>
        <div data-testid="protected">SECRET</div>
      </AuthGate>
    );
    expect(await screen.findByTestId("protected")).toBeInTheDocument();
    expect(screen.queryByTestId("password-gate")).toBeNull();
  });

  it("ignores unrelated localStorage value", async () => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, "0");
    render(
      <AuthGate>
        <div data-testid="protected">SECRET</div>
      </AuthGate>
    );
    expect(await screen.findByTestId("password-gate")).toBeInTheDocument();
  });

  it("after successful PasswordGate flow, renders children and persists flag", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as Response);

    render(
      <AuthGate>
        <div data-testid="protected">SECRET</div>
      </AuthGate>
    );

    fireEvent.change(await screen.findByTestId("password-input"), { target: { value: "right" } });
    fireEvent.click(screen.getByTestId("password-submit"));

    await waitFor(() => expect(screen.queryByTestId("password-gate")).toBeNull());
    expect(screen.getByTestId("protected")).toBeInTheDocument();
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBe("1");
  });

  it("survives a localStorage read throw (defensive)", async () => {
    const getSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    render(
      <AuthGate>
        <div data-testid="protected">SECRET</div>
      </AuthGate>
    );
    // 예외가 던져져도 hydration이 진행되고 PasswordGate가 보여야 한다.
    expect(await screen.findByTestId("password-gate")).toBeInTheDocument();
    getSpy.mockRestore();
  });
});
