import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "node:fs";
import path from "node:path";
import {
  extractContractPdfFormFields,
  fillContractPdfFromMap,
} from "@/lib/clinic-contract-pdf";

describe("clinic-contract-pdf", () => {
  it("извлекает имена полей из шаблона", async () => {
    const tplPath = path.join(
      process.cwd(),
      "data/templates/typical-contract-ooo.pdf",
    );
    if (!fs.existsSync(tplPath)) return;
    const buf = fs.readFileSync(tplPath);
    const fields = await extractContractPdfFormFields(buf);
    expect(fields).toContain("contract_number");
    expect(fields).toContain("client_name");
  });

  it("заполняет поле без flatten", async () => {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const page = doc.addPage();
    const form = doc.getForm();
    const field = form.createTextField("contract_number");
    field.addToPage(page, { x: 50, y: 700, width: 120, height: 20 });
    const tpl = Buffer.from(await doc.save());

    const filled = await fillContractPdfFromMap(
      tpl,
      new Map([["contract_number", "2605-042"]]),
    );
    const loaded = await PDFDocument.load(filled, { ignoreEncryption: true });
    const text = loaded.getForm().getTextField("contract_number").getText();
    expect(text).toBe("2605-042");
  });
});
