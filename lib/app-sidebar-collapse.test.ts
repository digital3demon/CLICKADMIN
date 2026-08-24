import { describe, expect, it } from "vitest";
import {
  resolveAppSidebarCollapsed,
  type AppSidebarCollapsePref,
} from "@/lib/app-sidebar-collapse";

describe("resolveAppSidebarCollapsed", () => {
  it("collapsed — компактный рельс на любом viewport", () => {
    expect(resolveAppSidebarCollapsed(900, 800, "collapsed")).toBe(true);
    expect(resolveAppSidebarCollapsed(1500, 500, "collapsed")).toBe(true);
    expect(resolveAppSidebarCollapsed(1800, 900, "collapsed")).toBe(true);
  });

  it("auto — рельс на laptop любой ширины", () => {
    expect(resolveAppSidebarCollapsed(1280, 800, "auto")).toBe(true);
    expect(resolveAppSidebarCollapsed(1500, 800, "auto")).toBe(true);
    expect(resolveAppSidebarCollapsed(1800, 900, "auto")).toBe(true);
  });

  it("auto на узком экране — drawer (не рельс)", () => {
    expect(resolveAppSidebarCollapsed(900, 800, "auto")).toBe(false);
    expect(resolveAppSidebarCollapsed(1500, 500, "auto")).toBe(false);
  });

  it("expanded на laptop — развёрнутое меню", () => {
    const expanded: AppSidebarCollapsePref = "expanded";
    expect(resolveAppSidebarCollapsed(1280, 800, expanded)).toBe(false);
    expect(resolveAppSidebarCollapsed(1600, 900, expanded)).toBe(false);
  });
});
