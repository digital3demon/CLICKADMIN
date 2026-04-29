import { tenantSlugFromHostHeader } from "@/lib/tenant-slug";
import { prisma } from "@/lib/prisma";

export async function getTenantForRequest(req: Request) {
  const host =
    req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const slug = tenantSlugFromHostHeader(host);
  return prisma.tenant.findUnique({ where: { slug } });
}
