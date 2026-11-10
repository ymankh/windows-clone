import { describe, expect, it } from "vitest";
import {
  parseNotesFile,
  serializedStateToMarkdown,
  textToSerializedState,
} from "@/apps/notes/serialization";

describe("notes serialization", () => {
  it("round-trips plain text through the editor state", () => {
    const text = "First line\n\nThird line";
    const state = textToSerializedState(text);

    expect(state.root.children).toHaveLength(3);
    expect(serializedStateToMarkdown(state)).toBe("First line\n\n\n\nThird line");
  });

  it("escapes Markdown control characters in text", () => {
    expect(serializedStateToMarkdown(textToSerializedState("2 * 3 _ok_"))).toBe(
      "2 \\* 3 \\_ok\\_"
    );
  });

  it("treats non-JSON files as plain text", () => {
    const state = parseNotesFile("note.md", "# Heading");
    expect(serializedStateToMarkdown(state)).toBe("# Heading");
  });

  it("accepts a valid Notes JSON document", () => {
    const original = textToSerializedState("Saved note");
    const parsed = parseNotesFile("note.JSON", JSON.stringify(original));
    expect(serializedStateToMarkdown(parsed)).toBe("Saved note");
  });

  it("rejects malformed or foreign JSON with a readable error", () => {
    const message = "The selected JSON file is not a valid Notes document.";
    expect(() => parseNotesFile("note.json", "{not-json")).toThrow(message);
    expect(() =>
      parseNotesFile("note.json", JSON.stringify({ root: { type: "nope" } }))
    ).toThrow(message);
  });
});
