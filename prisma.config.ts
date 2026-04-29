import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  seed: "node prisma/seed.js",
} as unknown as Parameters<typeof defineConfig>[0]);
