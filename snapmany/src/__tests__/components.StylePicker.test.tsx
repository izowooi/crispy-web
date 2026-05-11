import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { StylePicker } from "@/components/StylePicker";
import { CATEGORIES, STYLES, getStylesByCategory } from "@/config/styles";

describe("StylePicker — rendering & default tab", () => {
  it("renders all 7 category tabs", () => {
    render(<StylePicker selectedIds={[]} onChange={() => {}} />);
    for (const cat of CATEGORIES) {
      expect(
        screen.getByTestId(`style-tab-${cat.id}`),
      ).toBeInTheDocument();
    }
  });

  it("activates the first category tab by default", () => {
    render(<StylePicker selectedIds={[]} onChange={() => {}} />);
    const firstCat = CATEGORIES[0];
    const firstCatStyles = getStylesByCategory(firstCat.id);
    // styles for first category should be visible
    for (const s of firstCatStyles) {
      expect(screen.getByTestId(`style-card-${s.id}`)).toBeInTheDocument();
    }
    // styles for second category should NOT be visible
    const secondCat = CATEGORIES[1];
    const secondCatStyles = getStylesByCategory(secondCat.id);
    for (const s of secondCatStyles) {
      expect(
        screen.queryByTestId(`style-card-${s.id}`),
      ).not.toBeInTheDocument();
    }
  });
});

describe("StylePicker — tab switching", () => {
  it("shows the styles for the clicked category", () => {
    render(<StylePicker selectedIds={[]} onChange={() => {}} />);
    const targetCat = CATEGORIES[1]; // illust_paint
    fireEvent.click(screen.getByTestId(`style-tab-${targetCat.id}`));
    const targetStyles = getStylesByCategory(targetCat.id);
    expect(targetStyles.length).toBeGreaterThan(0);
    for (const s of targetStyles) {
      expect(screen.getByTestId(`style-card-${s.id}`)).toBeInTheDocument();
    }
    // first category styles should now be hidden
    const firstCatStyles = getStylesByCategory(CATEGORIES[0].id);
    for (const s of firstCatStyles) {
      expect(
        screen.queryByTestId(`style-card-${s.id}`),
      ).not.toBeInTheDocument();
    }
  });
});

describe("StylePicker — selection toggling", () => {
  it("calls onChange adding the style id when an unselected card is clicked", () => {
    const onChange = vi.fn();
    const firstStyle = getStylesByCategory(CATEGORIES[0].id)[0];
    render(<StylePicker selectedIds={[]} onChange={onChange} />);

    fireEvent.click(screen.getByTestId(`style-card-${firstStyle.id}`));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([firstStyle.id]);
  });

  it("calls onChange removing the style id when an already-selected card is clicked", () => {
    const onChange = vi.fn();
    const firstStyle = getStylesByCategory(CATEGORIES[0].id)[0];
    const secondStyle = getStylesByCategory(CATEGORIES[0].id)[1];
    render(
      <StylePicker
        selectedIds={[firstStyle.id, secondStyle.id]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByTestId(`style-card-${firstStyle.id}`));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([secondStyle.id]);
  });
});

describe("StylePicker — enabledStyleIds filter", () => {
  it("renders disabled styles as non-interactive (click is ignored)", () => {
    const onChange = vi.fn();
    const firstCatStyles = getStylesByCategory(CATEGORIES[0].id);
    const enabled = firstCatStyles.slice(0, 1).map((s) => s.id);
    const disabledStyle = firstCatStyles[firstCatStyles.length - 1];

    render(
      <StylePicker
        selectedIds={[]}
        onChange={onChange}
        enabledStyleIds={enabled}
      />,
    );

    // disabled card still renders
    const card = screen.getByTestId(`style-card-${disabledStyle.id}`);
    expect(card).toBeInTheDocument();

    fireEvent.click(card);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("allows clicking an enabled style even when enabledStyleIds is provided", () => {
    const onChange = vi.fn();
    const firstCatStyles = getStylesByCategory(CATEGORIES[0].id);
    const enabled = firstCatStyles.map((s) => s.id);
    const enabledStyle = firstCatStyles[0];

    render(
      <StylePicker
        selectedIds={[]}
        onChange={onChange}
        enabledStyleIds={enabled}
      />,
    );

    fireEvent.click(screen.getByTestId(`style-card-${enabledStyle.id}`));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe("StylePicker — maxSelection cap", () => {
  it("blocks selecting a 3rd style when maxSelection is 2 (already 2 selected)", () => {
    const onChange = vi.fn();
    const styles = STYLES.slice(0, 3);
    const firstCat = styles[0].category;
    // ensure they're in the same active tab for clicking
    render(
      <StylePicker
        selectedIds={[styles[0].id, styles[1].id]}
        onChange={onChange}
        maxSelection={2}
      />,
    );

    // Switch to the tab that contains styles[2] (could be any)
    fireEvent.click(screen.getByTestId(`style-tab-${styles[2].category}`));

    fireEvent.click(screen.getByTestId(`style-card-${styles[2].id}`));
    expect(onChange).not.toHaveBeenCalled();

    // sanity: it's not an unrelated issue with the test setup — switch back & try deselect
    fireEvent.click(screen.getByTestId(`style-tab-${firstCat}`));
    fireEvent.click(screen.getByTestId(`style-card-${styles[0].id}`));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([styles[1].id]);
  });
});

describe("StylePicker — bulk select helpers", () => {
  it("renders 'select all in tab' and 'clear in tab' buttons", () => {
    render(<StylePicker selectedIds={[]} onChange={() => {}} />);
    expect(screen.getByTestId("style-bulk-select")).toBeInTheDocument();
    expect(screen.getByTestId("style-bulk-clear")).toBeInTheDocument();
  });

  it("'select all in tab' adds all enabled styles of the active tab to onChange", () => {
    const onChange = vi.fn();
    render(<StylePicker selectedIds={[]} onChange={onChange} />);
    const activeCatStyles = getStylesByCategory(CATEGORIES[0].id);

    fireEvent.click(screen.getByTestId("style-bulk-select"));

    expect(onChange).toHaveBeenCalledTimes(1);
    const newSelection = onChange.mock.calls[0][0] as string[];
    for (const s of activeCatStyles) {
      expect(newSelection).toContain(s.id);
    }
  });
});

// silence act() warnings from async state during event handlers
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation((msg, ...rest) => {
    if (
      typeof msg === "string" &&
      (msg.includes("act(") || msg.includes("not wrapped in act"))
    ) {
      return;
    }
    console.warn(msg, ...rest);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

// use within so import isn't flagged unused if helpers expand
void within;
