import { describe, expect, it } from "vitest";
import {
  hasCloudFolderPhotoName,
  isCloudFolderPhoto,
  shouldImportCloudFolderPhoto,
  uniqueCloudFolderFileName,
  workExamplePhotoCaption,
} from "@/lib/work-examples/cloud-folder-photo";

describe("isCloudFolderPhoto", () => {
  it("jpeg/png среди кириллицы", () => {
    expect(isCloudFolderPhoto({ name: "кт до.jpg", mime: "" })).toBe(true);
    expect(isCloudFolderPhoto({ name: "мрт левый до.JPG", mime: "image/jpeg" })).toBe(true);
    expect(isCloudFolderPhoto({ name: "счёт 178 от 10.02.2026.pdf", mime: "" })).toBe(false);
  });

  it("в смешанной папке архив/КТ/скан-не-картинка не фото", () => {
    expect(shouldImportCloudFolderPhoto({ name: "кт архив.zip", mime: "application/zip" })).toBe(
      false,
    );
    expect(shouldImportCloudFolderPhoto({ name: "мрт серия.dcm", mime: "" })).toBe(false);
    expect(shouldImportCloudFolderPhoto({ name: "сканы.rar", mime: "image/jpeg" })).toBe(false);
    expect(shouldImportCloudFolderPhoto({ name: "кт до.jpg", mime: "" })).toBe(true);
  });
});

describe("hasCloudFolderPhotoName", () => {
  it("берёт кириллические имена, отбрасывает id Drive", () => {
    expect(hasCloudFolderPhotoName("кт до.jpg")).toBe(true);
    expect(hasCloudFolderPhotoName("мрт левый до.JPG")).toBe(true);
    expect(hasCloudFolderPhotoName("IMG_3480.JPG")).toBe(true);
    expect(hasCloudFolderPhotoName("1LWGsFwYId745zDMbeXWg4RE3sjvmsBSD.jpg")).toBe(false);
    expect(hasCloudFolderPhotoName("1LWGsFwYId745zDMbeXWg4RE3sjvmsBSD")).toBe(false);
    expect(hasCloudFolderPhotoName("фото.jpg")).toBe(false);
  });
});

describe("workExamplePhotoCaption", () => {
  it("на витрине стебель среди кириллицы, без расширения", () => {
    expect(workExamplePhotoCaption("мрт левый до.JPG")).toBe("мрт левый до");
    expect(workExamplePhotoCaption("кт до.jpg")).toBe("кт до");
  });
});

describe("uniqueCloudFolderFileName", () => {
  it("не затирает уже взятое имя", () => {
    const used = new Set<string>();
    expect(uniqueCloudFolderFileName("кт до.jpg", used)).toBe("кт до.jpg");
    expect(uniqueCloudFolderFileName("кт до.jpg", used)).toBe("кт до-2.jpg");
  });
});
