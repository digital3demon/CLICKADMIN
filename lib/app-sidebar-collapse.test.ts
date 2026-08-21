import { describe, expect, it } from "vitest";
import {
  resolveAppSidebarCollapsed,
  type AppSidebarCollapsePref,
} from "@/lib/app-sidebar-collapse";

describe("resolveAppSidebarCollapsed", () => {
  it("never collapses outside laptop shell (<1024 or short)", () => {
    expect(resolveAppSidebarCollapsed(900, 800, "collapsed")).toBe(false);
    expect(resolveAppSidebarCollapsed(1500, 500, "collapsed")).toBe(false);
  });

  it("auto uses rail on laptop and stays expanded on wide desktop", () => {
    expect(resolveAppSidebarCollapsed(1280, 800, "auto")).toBe(true);
    expect(resolveAppSidebarCollapsed(1500, 800, "auto")).toBe(false);
    expect(resolveAppSidebarCollapsed(1800, 900, "auto")).toBe(false);
  });

  it("honors explicit pref on laptop and desktop", () => {
    const collapsed: AppSidebarCollapsePref = "collapsed";
    const expanded: AppSidebarCollapsePref = "expanded";
    expect(resolveAppSidebarCollapsed(1280, 800, collapsed)).toBe(true);
    expect(resolveAppSidebarCollapsed(1280, 800, expanded)).toBe(false);
    expect(resolveAppSidebarCollapsed(1600, 900, collapsed)).toBe(true);
    expect(resolveAppSidebarCollapsed(1500, 900, expanded)).toBe(false);
  });
});
