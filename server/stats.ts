import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const statsSchema = z.record(z.string(), z.number().int().min(0));

export type InstallStats = {
  get: (appId: string) => number;
  increment: (appId: string) => number;
};

/**
 * Install counters. Persisted to a JSON file when `filePath` is given,
 * otherwise kept in memory (used by tests).
 */
export const createInstallStats = (filePath: string | null): InstallStats => {
  let counts: Record<string, number> = {};

  if (filePath && existsSync(filePath)) {
    try {
      const parsed = statsSchema.safeParse(JSON.parse(readFileSync(filePath, "utf8")));
      if (parsed.success) counts = parsed.data;
    } catch {
      console.warn(`[store] Ignoring unreadable stats file ${filePath}`);
    }
  }

  const save = () => {
    if (!filePath) return;
    try {
      mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileSync(filePath, JSON.stringify(counts, null, 2));
    } catch (error) {
      console.warn(`[store] Could not save stats: ${(error as Error).message}`);
    }
  };

  return {
    get: (appId) => counts[appId] ?? 0,
    increment: (appId) => {
      counts[appId] = (counts[appId] ?? 0) + 1;
      save();
      return counts[appId];
    },
  };
};
