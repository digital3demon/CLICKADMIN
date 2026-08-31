import { notFound } from "next/navigation";
import { PublicWorkExampleShowcase } from "@/components/work-examples/PublicWorkExampleShowcase";
import { loadPublicWorkExampleShowcase } from "@/lib/work-examples/load-public-showcase.server";

export const dynamic = "force-dynamic";

export default async function ShortPublicWorkExamplePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const loaded = await loadPublicWorkExampleShowcase(token);
  if (!loaded) notFound();
  return (
    <PublicWorkExampleShowcase
      tenantSlug={loaded.tenantSlug}
      token={loaded.token}
      data={loaded.data}
    />
  );
}
