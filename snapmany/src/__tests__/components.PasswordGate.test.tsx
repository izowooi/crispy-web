import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { PasswordGate } from "@/components/PasswordGate";

describe("components/PasswordGate", () => {
  beforeEach(() => {
    vi.useRealTimers();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetch(status: number, body: object) {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response);
  }

  it("renders the access password form", () => {
    render(<PasswordGate onSuccess={() => {}} />);
    expect(screen.getByTestId("password-gate")).toBeInTheDocument();
    expect(screen.getByTestId("password-input")).toBeInTheDocument();
    expect(screen.getByTestId("password-submit")).toBeInTheDocument();
    expect(screen.getByLabelText("접근 암호")).toBeInTheDocument();
  });

  it("disables submit when password is empty", () => {
    render(<PasswordGate onSuccess={() => {}} />);
    expect(screen.getByTestId("password-submit")).toBeDisabled();
  });

  it("enables submit when password has content", () => {
    render(<PasswordGate onSuccess={() => {}} />);
    fireEvent.change(screen.getByTestId("password-input"), { target: { value: "secret" } });
    expect(screen.getByTestId("password-submit")).toBeEnabled();
  });

  it("calls onSuccess when /api/auth returns 200", async () => {
    mockFetch(200, { ok: true });
    const onSuccess = vi.fn();
    render(<PasswordGate onSuccess={onSuccess} />);

    fireEvent.change(screen.getByTestId("password-input"), { target: { value: "secret" } });
    fireEvent.click(screen.getByTestId("password-submit"));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "secret" }),
      })
    );
  });

  it("shows wrong-password message on 401 and clears input", async () => {
    mockFetch(401, { ok: false, error: "Invalid" });
    const onSuccess = vi.fn();
    render(<PasswordGate onSuccess={onSuccess} />);

    fireEvent.change(screen.getByTestId("password-input"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByTestId("password-submit"));

    const error = await screen.findByTestId("password-error");
    expect(error.textContent).toMatch(/암호가 올바르지 않/);
    expect(onSuccess).not.toHaveBeenCalled();
    expect((screen.getByTestId("password-input") as HTMLInputElement).value).toBe("");
  });

  it("shows server-config message on 500", async () => {
    mockFetch(500, { ok: false, error: "Server" });
    render(<PasswordGate onSuccess={() => {}} />);

    fireEvent.change(screen.getByTestId("password-input"), { target: { value: "anything" } });
    fireEvent.click(screen.getByTestId("password-submit"));

    const error = await screen.findByTestId("password-error");
    expect(error.textContent).toMatch(/서버 설정 오류/);
  });

  it("shows network error when fetch throws", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("net"));
    render(<PasswordGate onSuccess={() => {}} />);

    fireEvent.change(screen.getByTestId("password-input"), { target: { value: "x" } });
    fireEvent.click(screen.getByTestId("password-submit"));

    const error = await screen.findByTestId("password-error");
    expect(error.textContent).toMatch(/네트워크 오류/);
  });
});
