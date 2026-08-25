import { describe, expect, it } from "vitest";
import { buildDocFingerprint, fingerprintsMatch } from "@/lib/finance-office-doc-fingerprint";
import {
  applyManualUpdNumber,
  assignUpdsByFingerprint,
} from "@/lib/finance-office-upd-match";
import { extractUpdDigitsFromDocumentText, extractUpdDigitsFromFileName } from "@/lib/extract-upd-number";

/** Реальный счёт КЛИКЛАБ №1643 (наряд 2608-211). */
const INVOICE_1643 = `
ООО "Банк Точка" г. Москва БИК 044525104
Счет на оплату № 1643 от 20 августа 2026 г.
Поставщик ООО "КЛИКЛАБ", ИНН 7813675732, КПП 780201001
Покупатель
(Заказчик):
ООО "ДИАДЕНТ110", ИНН 7816563096, КПП 781601001, 192288, Город
Санкт-Петербург, ул. Бухарестская, дом 110
Основание: Без договора 2608-211 Успенский А.Д. Носкова Д.А.
№ Товары (работы, услуги) Кол-во Ед. Цена Сумма
1 -7209 Каппа ретенционная/Элайнер 1 шт 5 000,00 5 000,00
Итого: 5 000,00
В том числе НДС 5%: 238,10
Всего к оплате: 5 000,00
Всего наименований 1, на сумму 5 000,00 руб.
`;

/** Реальный УПД №1654 к той же работе. */
const UPD_1654 = `
Универсальный передаточный документ
Счет-фактура № 1654 от 20 августа 2026 г. (1)
Продавец: ООО "КЛИКЛАБ" (2) Покупатель: ООО "ДИАДЕНТ110" (6)
ИНН/КПП продавца: 7813675732/780201001 (2б) ИНН/КПП покупателя: 7816563096/781601001 (6б)
Документ об отгрузке Универсальный передаточный документ, № 1654 от 20.08.2026 (5а)
00-00006070 1 -7209 Каппа
ретенционная/Элайнер
-- 796 шт 1,000 4 761,90 4 761,90 без акциза
5% 238,10 5 000,00 -- -- --
Всего к оплате (9) 4 761,90 Х 238,10 5 000,00
Без договора [8]
`;

describe("отпечаток счёт↔УПД 1643/1654", () => {
  it("одна пара — уникальный матч", () => {
    const inv = buildDocFingerprint(INVOICE_1643);
    const upd = buildDocFingerprint(UPD_1654);
    expect(inv.buyerInn).toBe("7816563096");
    expect(upd.buyerInn).toBe("7816563096");
    expect(inv.totalRub).toBe(5000);
    expect(upd.totalRub).toBe(5000);
    expect(inv.ymd).toBe("2026-08-20");
    expect(upd.ymd).toBe("2026-08-20");
    expect(inv.codes).toContain("-7209");
    expect(upd.codes).toContain("-7209");
    expect(fingerprintsMatch(inv, upd)).toBe(true);

    const map = assignUpdsByFingerprint(
      new Map([["inv-1643", inv]]),
      [
        {
          key: "upd-1654",
          number: "1654",
          fileName: "УПД_статус_1_№_1654_от_20_августа_2026_г.pdf",
          fingerprint: upd,
        },
      ],
    );
    expect(map.get("inv-1643")).toEqual(["upd-1654"]);
  });

  it("два УПД с одним отпечатком — янтарь", () => {
    const inv = buildDocFingerprint(INVOICE_1643);
    const upd = buildDocFingerprint(UPD_1654);
    const map = assignUpdsByFingerprint(
      new Map([["inv-1643", inv]]),
      [
        { key: "u1", number: "1654", fileName: "a.pdf", fingerprint: upd },
        { key: "u2", number: "1655", fileName: "b.pdf", fingerprint: upd },
      ],
    );
    expect(map.get("inv-1643")?.sort()).toEqual(["u1", "u2"]);
  });

  it("ручной номер 1654 из имени и текста", () => {
    expect(
      extractUpdDigitsFromFileName(
        "УПД_статус_1_№_1654_от_20_августа_2026_г.pdf",
      ),
    ).toBe("1654");
    expect(extractUpdDigitsFromDocumentText(UPD_1654)).toBe("1654");
    const pool = [
      {
        key: "u1",
        number: "1654",
        fileName: "x.pdf",
        fingerprint: buildDocFingerprint(UPD_1654),
      },
    ];
    expect(applyManualUpdNumber(pool, "1654").match).toBe("one");
    expect(applyManualUpdNumber(pool, "9999").match).toBe("none");
  });
});
