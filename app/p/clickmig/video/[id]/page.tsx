import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { readClickMigFileBytes } from "@/lib/clickmig/storage.server";

export const dynamic = "force-dynamic";

export default async function ClickMigPublicVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prisma = await getOrdersPrisma();
  const file = await prisma.clickMigFile.findFirst({
    where: { id, kind: "VIDEO" },
  });
  if (!file) {
    return (
      <main className="p-6">
        <p>Видео не найдено</p>
      </main>
    );
  }
  const bytes = await readClickMigFileBytes(file.diskRelPath, file.data);
  if (!bytes) {
    return (
      <main className="p-6">
        <p>Файл недоступен</p>
      </main>
    );
  }

  const b64 = bytes.toString("base64");
  const src = `data:${file.mimeType};base64,${b64}`;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-lg font-semibold">Видео по заказу</h1>
      <video controls className="w-full rounded-lg" src={src}>
        <track kind="captions" />
      </video>
    </main>
  );
}
