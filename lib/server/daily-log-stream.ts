import fs from "node:fs";
import { Writable } from "node:stream";
import {
  dailyCrmLogPath,
  ensureCrmLogDir,
  formatLocalDayKey,
} from "@/lib/server/log-dir";

/**
 * Поток записи: один JSONL-файл на сутки (`crm-YYYY-MM-DD.log`).
 * При смене даты переключается на новый файл без перезапуска процесса.
 */
export class DailyCrmLogStream extends Writable {
  private currentDay = "";
  private fileStream: fs.WriteStream | null = null;

  override _write(
    chunk: Buffer | string,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    try {
      const day = formatLocalDayKey(new Date());
      if (day !== this.currentDay) {
        this.fileStream?.end();
        ensureCrmLogDir();
        this.currentDay = day;
        this.fileStream = fs.createWriteStream(dailyCrmLogPath(day), {
          flags: "a",
        });
      }
      this.fileStream!.write(chunk, encoding, callback);
    } catch (err) {
      callback(err instanceof Error ? err : new Error(String(err)));
    }
  }

  override _final(callback: (error?: Error | null) => void): void {
    if (this.fileStream) {
      this.fileStream.end(callback);
      return;
    }
    callback();
  }
}
