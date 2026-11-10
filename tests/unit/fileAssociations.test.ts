import { describe, expect, it } from "vitest";
import { z } from "zod";
import { resolveDefaultApp } from "@/apps/fileAssociations";
import type { DesktopApp } from "@/apps/types";
import { appToHostMessageSchema } from "@/apps/store/protocol";

const app = (id: string, fileTypes: DesktopApp["fileCapabilities"] = []): DesktopApp => ({
  id,
  title: id,
  icon: () => null,
  Component: () => null,
  fileCapabilities: fileTypes,
});

const opens = (...types: ("notes" | "pdf")[]) =>
  types.map((fileType) => ({ fileType, schema: z.unknown() }));

const apps = [
  app("notes", opens("notes")),
  app("pdf", opens("pdf")),
  app("store:markdown-pad", opens("notes")),
  app("store:calculator"),
];

describe("resolveDefaultApp", () => {
  it("falls back to the first capable app (built-ins come first)", () => {
    expect(resolveDefaultApp(apps, {}, "notes")?.id).toBe("notes");
  });

  it("uses the user's chosen default", () => {
    expect(resolveDefaultApp(apps, { notes: "store:markdown-pad" }, "notes")?.id).toBe(
      "store:markdown-pad"
    );
  });

  it("ignores a default that is uninstalled or cannot open the type", () => {
    expect(resolveDefaultApp(apps, { notes: "store:gone" }, "notes")?.id).toBe("notes");
    expect(resolveDefaultApp(apps, { notes: "store:calculator" }, "notes")?.id).toBe("notes");
  });

  it("returns undefined when nothing can open the type", () => {
    expect(resolveDefaultApp(apps, {}, "audio")).toBeUndefined();
  });
});

describe("app bridge messages", () => {
  it("accepts well-formed messages", () => {
    expect(
      appToHostMessageSchema.safeParse({ source: "desktop-app", type: "setTitle", title: "Hi" }).success
    ).toBe(true);
    expect(
      appToHostMessageSchema.safeParse({
        source: "desktop-app",
        type: "download",
        name: "note.md",
        content: "# hi",
      }).success
    ).toBe(true);
  });

  it("rejects unknown types, foreign sources and oversized titles", () => {
    expect(appToHostMessageSchema.safeParse({ source: "desktop-app", type: "eval" }).success).toBe(false);
    expect(appToHostMessageSchema.safeParse({ source: "other", type: "ready" }).success).toBe(false);
    expect(
      appToHostMessageSchema.safeParse({ source: "desktop-app", type: "setTitle", title: "x".repeat(81) })
        .success
    ).toBe(false);
  });
});
