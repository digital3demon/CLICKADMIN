import { describe, expect, it } from "vitest";
import {
  resolveAppSidebarCollapsed,
  type AppSidebarCollapsePref,
} from "@/lib/app-sidebar-collapse";

describe("resolveAppSidebarCollapsed", () => {
  it("never collapses outside desktop shell", () => {
    expect(resolveAppSidebarCollapsed(900, 800, "collapsed")).toBe(false);
    expect(resolveAppSidebarCollapsed(1200, 500, "collapsed")).toBe(false);
  });

  it("auto-collapses under 1400 on desktop", () => {
    expect(resolveAppSidebarCollapsed(1280, 800, "auto")).toBe(true);
    expect(resolveAppSidebarCollapsed(1500, 800, "auto")).toBe(false);
  });

  it("honors explicit pref on desktop", () => {
    const collapsed: AppSidebarCollapsePref = "collapsed";
    const expanded: AppSidebarCollapsePref = "expanded";
    expect(resolveAppSidebarCollapsed(1600, 900, collapsed)).toBe(true);
    expect(resolveAppSidebarCollapsed(1100, 900, expanded)).toBe(false);
  });
});
