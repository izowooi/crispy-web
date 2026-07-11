import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminUpload from "@/components/admin-upload";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("AdminUpload", () => {
  function openUploadForm() {
    render(<AdminUpload />);
    fireEvent.click(screen.getByRole("button", { name: /HTML 업로드/ }));
  }

  it("브라우저 기본 파일 입력을 노출해 선택 창을 한 번만 연다", () => {
    openUploadForm();

    const input = document.querySelector('input[type="file"]');
    expect(input).not.toBeNull();

    const handleInputClick = vi.fn();
    input!.addEventListener("click", handleInputClick);
    fireEvent.click(screen.getByText("파일 선택"));

    expect(handleInputClick).toHaveBeenCalledTimes(1);
    expect(input).toHaveAccessibleName("HTML 파일 선택");
    expect(input).toHaveAttribute("type", "file");
    expect(input).not.toHaveClass("hidden");
    expect(document.querySelectorAll('input[type="file"]')).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "파일 선택" })).not.toBeInTheDocument();
  });

  it("선택한 HTML 파일명과 기본 제목을 즉시 표시한다", () => {
    openUploadForm();
    const input = screen.getByLabelText("HTML 파일 선택");
    const file = new File(["<html></html>"], "sample-page.html", {
      type: "text/html",
    });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("sample-page.html")).toBeInTheDocument();
    expect(screen.getByDisplayValue("sample-page")).toBeInTheDocument();
  });
});
