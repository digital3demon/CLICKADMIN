import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";
import {
  APP_S3_KEY_PREFIXES,
  assertSafeS3ObjectKey,
} from "@/lib/storage-path-safe";

type S3EnvConfig = {
  enabled: boolean;
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

let cachedClient: S3Client | null = null;
let cachedConfigKey = "";

function readS3EnvConfig(): S3EnvConfig {
  const enabled =
    (process.env.S3_ENABLED ?? "").trim().toLowerCase() === "true";
  return {
    enabled,
    endpoint: (process.env.S3_ENDPOINT ?? "").trim(),
    region: (process.env.S3_REGION ?? "").trim(),
    bucket: (process.env.S3_BUCKET ?? "").trim(),
    accessKeyId: (process.env.S3_ACCESS_KEY_ID ?? "").trim(),
    secretAccessKey: (process.env.S3_SECRET_ACCESS_KEY ?? "").trim(),
    forcePathStyle:
      (process.env.S3_FORCE_PATH_STYLE ?? "true").trim().toLowerCase() !==
      "false",
  };
}

function isS3ConfigComplete(cfg: S3EnvConfig): boolean {
  return Boolean(
    cfg.enabled &&
      cfg.endpoint &&
      cfg.region &&
      cfg.bucket &&
      cfg.accessKeyId &&
      cfg.secretAccessKey,
  );
}

function getClientAndConfig(): { client: S3Client; cfg: S3EnvConfig } {
  const cfg = readS3EnvConfig();
  if (!isS3ConfigComplete(cfg)) {
    throw new Error("S3 не настроен: проверьте S3_* переменные окружения");
  }
  const cfgKey = JSON.stringify(cfg);
  if (!cachedClient || cachedConfigKey !== cfgKey) {
    cachedClient = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint,
      forcePathStyle: cfg.forcePathStyle,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
    cachedConfigKey = cfgKey;
  }
  return { client: cachedClient, cfg };
}

export function isS3StorageEnabled(): boolean {
  return isS3ConfigComplete(readS3EnvConfig());
}

export async function putS3ObjectBytes(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const safeKey = assertSafeS3ObjectKey(key);
  const { client, cfg } = getClientAndConfig();
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: safeKey,
      Body: body,
      ContentType: contentType || "application/octet-stream",
    }),
  );
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function getS3ObjectBytes(key: string): Promise<Buffer> {
  const safeKey = assertSafeS3ObjectKey(key);
  const { client, cfg } = getClientAndConfig();
  const out = await client.send(
    new GetObjectCommand({
      Bucket: cfg.bucket,
      Key: safeKey,
    }),
  );
  const body = out.Body;
  if (!body) return Buffer.alloc(0);
  if (typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray === "function") {
    const arr = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    return Buffer.from(arr);
  }
  return streamToBuffer(body as Readable);
}

export async function listS3ObjectKeys(prefix: string): Promise<string[]> {
  const p = prefix.trim();
  if (
    !p ||
    p.includes("\\") ||
    p.includes("\0") ||
    p.includes("..") ||
    p.startsWith("/") ||
    !APP_S3_KEY_PREFIXES.some((allowed) => p === allowed || p.startsWith(allowed))
  ) {
    throw new Error("Недопустимый префикс хранилища");
  }
  const { client, cfg } = getClientAndConfig();
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const out = await client.send(
      new ListObjectsV2Command({
        Bucket: cfg.bucket,
        Prefix: p,
        ContinuationToken: token,
      }),
    );
    for (const obj of out.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    token = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

export async function deleteS3Object(key: string): Promise<void> {
  const safeKey = assertSafeS3ObjectKey(key);
  const { client, cfg } = getClientAndConfig();
  await client.send(
    new DeleteObjectCommand({
      Bucket: cfg.bucket,
      Key: safeKey,
    }),
  );
}

