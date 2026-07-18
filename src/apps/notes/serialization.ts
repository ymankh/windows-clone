import type { SerializedEditorState } from "lexical";
import { LexicalNodeTypes, LexicalTextModes } from "./constants";
import { serializedEditorStateSchema } from "./schema";

type SerializedNode = {
  type?: string;
  text?: string;
  format?: number | string;
  tag?: string;
  listType?: string;
  children?: SerializedNode[];
};

const TEXT_FORMATS = {
  bold: 1,
  italic: 2,
  strikethrough: 4,
  underline: 8,
  code: 16,
} as const;

const escapeMarkdown = (text: string) =>
  text.replace(/([\\`*_[\]<>])/g, "\\$1");

const serializeText = (node: SerializedNode) => {
  let text = escapeMarkdown(node.text ?? "");
  const format = typeof node.format === "number" ? node.format : 0;

  if (format & TEXT_FORMATS.code) text = `\`${text.replace(/`/g, "\\`")}\``;
  if (format & TEXT_FORMATS.bold) text = `**${text}**`;
  if (format & TEXT_FORMATS.italic) text = `*${text}*`;
  if (format & TEXT_FORMATS.strikethrough) text = `~~${text}~~`;
  if (format & TEXT_FORMATS.underline) text = `<u>${text}</u>`;
  return text;
};

const serializeNode = (node: SerializedNode): string => {
  if (node.type === LexicalNodeTypes.text) return serializeText(node);

  const content = (node.children ?? []).map(serializeNode).join("");
  if (node.type === "heading") {
    const level = Number(node.tag?.replace("h", "")) || 1;
    return `${"#".repeat(Math.min(6, Math.max(1, level)))} ${content}`;
  }
  if (node.type === "quote") return `> ${content.replace(/\n/g, "\n> ")}`;
  if (node.type === "listitem") return `- ${content}`;
  return content;
};

export const serializedStateToMarkdown = (state: SerializedEditorState) => {
  const root = state.root as SerializedNode;
  return (root.children ?? []).map(serializeNode).join("\n\n").trimEnd();
};

export const textToSerializedState = (text: string): SerializedEditorState =>
  ({
    root: {
      type: LexicalNodeTypes.root,
      version: 1,
      format: "",
      indent: 0,
      direction: null,
      children: text.split(/\r?\n/).map((line) => ({
        type: LexicalNodeTypes.paragraph,
        version: 1,
        format: "",
        indent: 0,
        direction: null,
        children: line
          ? [
              {
                type: LexicalNodeTypes.text,
                version: 1,
                text: line,
                detail: 0,
                format: 0,
                mode: LexicalTextModes.normal,
                style: "",
              },
            ]
          : [],
      })),
    },
  } as unknown as SerializedEditorState);

export const parseNotesFile = (name: string, content: string) => {
  if (!name.toLowerCase().endsWith(".json")) return textToSerializedState(content);

  const parsed = serializedEditorStateSchema.safeParse(JSON.parse(content));
  if (!parsed.success) {
    throw new Error("The selected JSON file is not a valid Notes document.");
  }
  return parsed.data;
};
