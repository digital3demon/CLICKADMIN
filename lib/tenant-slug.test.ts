import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { tenantSlugFromHostHeader } from "./tenant-slug";

describe("tenantSlugFromHostHeader", () => {
  const prevDefault = process.env.CRM_DEFAULT_TENANT_SLUG;
  const prevPortal = process.env.CRM_PORTAL_HOST;

  beforeEach(() => {
    delete process.env.CRM_DEFAULT_TENANT_SLUG;
    delete process.env.CRM_PORTAL_HOST;
  });

  afterEach(() => {
    if (prevDefault === undefined) delete process.env.CRM_DEFAULT_TENANT_SLUG;
    else process.env.CRM_DEFAULT_TENANT_SLUG = prevDefault;
    if (prevPortal === undefined) delete process.env.CRM_PORTAL_HOST;
    else process.env.CRM_PORTAL_HOST = prevPortal;
  });

  it("возвращает default на localhost", () => {
    expect(tenantSlugFromHostHeader("localhost:3000")).toBe("default");
  });

  it("достаёт поддомен с кириллицой в path (хост — латиница): lab.click-lab.online → lab", () => {
    expect(tenantSlugFromHostHeader("lab.click-lab.online")).toBe("lab");
  });

  it("пустой/зарезервированный www → default", () => {
    expect(tenantSlugFromHostHeader("www.example.com")).toBe("default");
  });

  it("CRM_DEFAULT_TENANT_SLUG фиксирует slug для любого хоста (одна организация)", () => {
    process.env.CRM_DEFAULT_TENANT_SLUG = "acme";
    expect(tenantSlugFromHostHeader(null)).toBe("acme");
    expect(tenantSlugFromHostHeader("lab.click-lab.online")).toBe("acme");
    expect(tenantSlugFromHostHeader("www.example.com")).toBe("acme");
  });
});
