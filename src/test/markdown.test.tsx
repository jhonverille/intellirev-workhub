import { render, screen } from "@testing-library/react";
import { Markdown } from "@/components/ui/markdown";

const sample = [
  "# Heading one",
  "",
  "Body text with a [link](https://example.com) and `inline code`.",
  "",
  "- first bullet",
  "- second bullet",
  "",
  "| Column | Value |",
  "| ------ | ----- |",
  "| a      | 1     |",
  "",
  "> quoted line",
].join("\n");

describe("Markdown", () => {
  it("carries the class the markdown styles are keyed to", () => {
    // globals.css styles `.markdown`. The component previously used `prose`
    // classes with no plugin behind them, so note bodies rendered unstyled —
    // this pins the contract between the two files.
    const { container } = render(<Markdown content="text" />);
    expect(container.firstChild).toHaveClass("markdown");
  });

  it("renders headings, lists, links and inline code", () => {
    render(<Markdown content={sample} />);

    expect(screen.getByRole("heading", { level: 1, name: "Heading one" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "link" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
    expect(screen.getByText("inline code").tagName).toBe("CODE");
  });

  it("renders GFM tables, which need remark-gfm to be wired up", () => {
    render(<Markdown content={sample} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Column" })).toBeInTheDocument();
  });
});
