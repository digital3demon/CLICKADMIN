import "server-only";

import { NextResponse } from "next/server";
import { isWorkExampleCardPreviewRequest } from "@/lib/work-examples/card-preview";
import { readOrCreateWorkExampleCardPreview } from "@/lib/work-examples/card-preview.server";
import { workExampleFileContentType } from "@/lib/work-examples/mesh-file";
import { readWorkExampleFileBytes } from "@/lib/work-examples/storage";

export async function workExampleFileHttpResponse(input: {
  reqUrl: string;
  diskRelPath: string;
  fileName: string;
  mime: string | null;
  cacheControl: string;
  previewCacheControl: string;
}): Promise<NextResponse> {
  const preview = isWorkExampleCardPreviewRequest(new URL(input.reqUrl).searchParams);
  if (preview) {
    const jpeg = await readOrCreateWorkExampleCardPreview(input.diskRelPath);
    if (jpeg) {
      return new NextResponse(new Uint8Array(jpeg), {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": String(jpeg.length),
          "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(`${input.fileName}.card.jpg`)}`,
          "Cache-Control": input.previewCacheControl,
        },
      });
    }
  }
  const bytes = await readWorkExampleFileBytes(input.diskRelPath);
  if (!bytes) return NextResponse.json({ error: "Файл недоступен" }, { status: 404 });
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": workExampleFileContentType(input.fileName, input.mime),
      "Content-Length": String(bytes.length),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(input.fileName)}`,
      "Cache-Control": input.cacheControl,
    },
  });
}
