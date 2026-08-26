import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  collectFilesUnderRoot,
  zipRelForLocalFile,
} from "./pack-local-files";

const tmpDirs: string[] = [];

afterEach(() => {
  for (const d of tmpDirs.splice(0)) {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

describe("collectFilesUnderRoot", () => {
  it("берёт файлы с кириллицей и не заходит в crm-dumps", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "crm-bak-"));
    tmpDirs.push(root);
    fs.mkdirSync(path.join(root, "фото"), { recursive: true });
    fs.writeFileSync(path.join(root, "фото", "снимок.jpg"), "pic");
    fs.mkdirSync(path.join(root, "crm-dumps", "daily"), { recursive: true });
    fs.writeFileSync(path.join(root, "crm-dumps", "daily", "x.zip"), "skip");
    const files = collectFilesUnderRoot(root);
    expect(files.some((f) => f.endsWith("снимок.jpg"))).toBe(true);
    expect(files.some((f) => f.endsWith("x.zip"))).toBe(false);
  });
});

describe("zipRelForLocalFile", () => {
  it("кладёт относительный путь в files/{id}/", () => {
    const root = path.join(os.tmpdir(), "crm-root-аватары");
    const file = path.join(root, "юзер", "1.bin");
    expect(zipRelForLocalFile("user-avatars", root, file)).toBe(
      "files/user-avatars/юзер/1.bin",
    );
  });
});
