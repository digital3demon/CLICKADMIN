import "server-only";

import type { PrismaClient } from "@prisma/client";
import { formatCrmUploadMaxShortRu } from "@/lib/crm-upload-limits";
import { CloudFolderImportError } from "@/lib/work-examples/cloud-folder-import-error";
import {
  parseCloudFolderImportUrl,
  type CloudFolderImportTarget,
} from "@/lib/work-examples/cloud-folder-url";
import {
  shouldImportCloudFolderPhoto,
  uniqueCloudFolderFileName,
} from "@/lib/work-examples/cloud-folder-photo";
import { WORK_EXAMPLE_MAX_FILES_PER_UPLOAD, WORK_EXAMPLE_MAX_FILE_BYTES } from "@/lib/work-examples/constants";
import { listGoogleDrivePhotos } from "@/lib/work-examples/google-drive-folder.server";
import { listYandexDiskPhotos } from "@/lib/work-examples/yandex-disk-folder.server";
import { ensureWorkExampleCardPreview } from "@/lib/work-examples/card-preview.server";
import { newWorkExampleFileId, writeWorkExampleFile } from "@/lib/work-examples/storage";
import { exampleSelect } from "@/lib/work-examples/access.server";
import { serializeWorkExample } from "@/lib/work-examples/serialize";

export { CloudFolderImportError };

/**
 * Карта: ссылка папки → список фото → копии на диск/S3 как PHOTO.
 * Не живой sync. Дубли по fileName пропускаем. Пачка как обычная загрузка (40).
 * Название примера не берём из папки — его пишет пользователь.
 */

async function listPhotos(target: CloudFolderImportTarget) {
  if (target.provider === "yandex-disk" && target.yandexPublicUrl) {
    return listYandexDiskPhotos({ publicUrl: target.yandexPublicUrl, mode: target.mode });
  }
  if (target.provider === "google-drive" && target.driveId) {
    return listGoogleDrivePhotos({ driveId: target.driveId, mode: target.mode });
  }
  throw new CloudFolderImportError("Непонятная ссылка на облако", 400);
}

export async function importWorkExampleCloudFolder(input: {
  prisma: PrismaClient;
  tenantId: string;
  exampleId: string;
  folderUrl: string;
}) {
  const target = parseCloudFolderImportUrl(input.folderUrl);
  if (!target) {
    throw new CloudFolderImportError(
      "Нужна ссылка на папку Google Drive или Яндекс Диска",
      400,
    );
  }
  const example = await input.prisma.workExample.findFirst({
    where: { id: input.exampleId, tenantId: input.tenantId, deletedAt: null },
    select: {
      id: true,
      title: true,
      files: { select: { fileName: true, sortOrder: true, deletedAt: true } },
    },
  });
  if (!example) throw new CloudFolderImportError("Не найдено", 404);

  const started = Date.now();
  const listed = await listPhotos(target);
  const used = new Set(
    example.files
      .filter((f) => !f.deletedAt)
      .map((f) => f.fileName.trim().toLowerCase())
      .filter(Boolean),
  );
  let sort = example.files.reduce((m, f) => Math.max(m, f.sortOrder), -1) + 1;
  let imported = 0;
  let skipped = 0;
  let truncated = false;
  const errors: string[] = [];

  for (const photo of listed.photos) {
    if (imported >= WORK_EXAMPLE_MAX_FILES_PER_UPLOAD) {
      truncated = true;
      break;
    }
    if (!shouldImportCloudFolderPhoto({ name: photo.name, mime: photo.mime })) {
      skipped += 1;
      continue;
    }
    const nameLower = photo.name.trim().toLowerCase();
    if (nameLower && used.has(nameLower)) {
      skipped += 1;
      continue;
    }
    let buf: Buffer;
    try {
      buf = await photo.download();
    } catch (e) {
      errors.push(
        `«${photo.name}»: ${e instanceof Error ? e.message : "не скачалось"}`,
      );
      continue;
    }
    if (buf.length > WORK_EXAMPLE_MAX_FILE_BYTES) {
      errors.push(`«${photo.name}» больше ${formatCrmUploadMaxShortRu()}`);
      continue;
    }
    if (buf.length < 32) {
      errors.push(`«${photo.name}»: пустой файл`);
      continue;
    }
    const fileName = uniqueCloudFolderFileName(photo.name, used);
    const fileId = newWorkExampleFileId();
    const mime = (photo.mime || "image/jpeg").slice(0, 120);
    const diskRelPath = await writeWorkExampleFile(example.id, fileId, buf, mime);
    await input.prisma.workExampleFile.create({
      data: {
        id: fileId,
        exampleId: example.id,
        kind: "PHOTO",
        fileName,
        mime,
        sizeBytes: buf.length,
        diskRelPath,
        sortOrder: sort,
      },
    });
    sort += 1;
    imported += 1;
    await ensureWorkExampleCardPreview(diskRelPath);
  }

  const row = await input.prisma.workExample.findFirstOrThrow({
    where: { id: example.id },
    select: exampleSelect,
  });
  console.info(
    JSON.stringify({
      evt: "work_example_cloud_import",
      provider: target.provider,
      exampleId: example.id,
      imported,
      skipped,
      truncated,
      listed: listed.photos.length,
      ms: Date.now() - started,
    }),
  );
  if (!imported && !skipped && errors.length) {
    throw new CloudFolderImportError(errors[0] || "Не удалось забрать фото", 502);
  }
  if (!imported && !skipped) {
    throw new CloudFolderImportError("В папке нет фото с именами файлов", 400);
  }
  return {
    item: serializeWorkExample(row, { includeInternal: true }),
    imported,
    skipped,
    truncated,
    folderName: listed.folderName || null,
    errors,
  };
}
