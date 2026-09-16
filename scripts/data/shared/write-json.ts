import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

export function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function hasSameJsonContent(path: string, value: unknown): boolean {
  return existsSync(path) && readFileSync(path, "utf8") === serializeJson(value);
}

export function readJsonFileIfExists(path: string): unknown | undefined {
  if (!existsSync(path)) {
    return undefined;
  }

  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

export function writeJsonIfChanged(path: string, value: unknown): boolean {
  const serialized = serializeJson(value);

  if (existsSync(path) && readFileSync(path, "utf8") === serialized) {
    return false;
  }

  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp-${process.pid}`;

  try {
    writeFileSync(temporaryPath, serialized, "utf8");
    renameSync(temporaryPath, path);
  } finally {
    rmSync(temporaryPath, { force: true });
  }

  return true;
}
