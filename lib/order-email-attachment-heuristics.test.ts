import { describe, expect, it } from "vitest";
import {
  collectScanLikeAttachmentIds,
  deriveSourceDataFlagsFromAttachments,
  isScanLikeAttachment,
} from "./order-email-attachment-heuristics";

describe("order-email-attachment-heuristics", () => {
  it("detects STL occlusion shells as scan-like", () => {
    expect(
      isScanLikeAttachment("308113407_shell_occlusion_l.stl", "application/octet-stream"),
    ).toBe(true);
    expect(
      isScanLikeAttachment("308113407_shell_occlusion_u.stl", "application/octet-stream"),
    ).toBe(true);
  });

  it("sets hasScans from all attachments when AI omitted suggestedAttachmentIds", () => {
    const attachments = [
      { id: "stl-l", fileName: "308113407_shell_occlusion_l.stl", mimeType: "model/stl" },
      { id: "stl-u", fileName: "308113407_shell_occlusion_u.stl", mimeType: "model/stl" },
    ];
    expect(
      deriveSourceDataFlagsFromAttachments(attachments, [], {
        hasScans: false,
        hasCt: false,
        hasMri: false,
        hasPhoto: false,
      }),
    ).toEqual({
      hasScans: true,
      hasCt: false,
      hasMri: false,
      hasPhoto: false,
    });
    expect(collectScanLikeAttachmentIds(attachments)).toEqual(["stl-l", "stl-u"]);
  });
});
