import { describe, expect, it } from "vitest";
import { resolveClinicInvoiceEmail } from "@/lib/clinic-invoice-email";

describe("resolveClinicInvoiceEmail", () => {
  it("отдельный адрес счёта важнее галочки", () => {
    expect(
      resolveClinicInvoiceEmail({
        invoiceEmail: "schet@клиника.рф",
        email: "info@clinic.ru",
        useEmailForInvoices: true,
      }),
    ).toBe("schet@клиника.рф");
  });

  it("галочка берёт обычный e-mail", () => {
    expect(
      resolveClinicInvoiceEmail({
        invoiceEmail: "",
        email: "бух@клиника.рф",
        useEmailForInvoices: true,
      }),
    ).toBe("бух@клиника.рф");
  });
});
