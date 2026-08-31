import { describe, expect, it } from "vitest";
import {
  kaitenBackgroundShouldWriteOrder,
  kaitenListTitlesPollIntervalMs,
  kaitenWrittenFieldsListUiChanged,
  orderCorrectionToastPollMs,
  shouldRefreshListFromKaitenPoll,
  shouldRefreshListFromToastFingerprint,
  toastFingerprintShouldRefreshListPath,
} from "@/lib/order-list-live-refresh";

describe("orderCorrectionToastPollMs", () => {
  it("по умолчанию 4 с, не быстрее 3 с", () => {
    expect(orderCorrectionToastPollMs()).toBe(4_000);
    expect(orderCorrectionToastPollMs("2000")).toBe(3_000);
    expect(orderCorrectionToastPollMs("8000")).toBe(8_000);
  });
});

describe("kaitenListTitlesPollIntervalMs", () => {
  it("фон списка ~45 с, не чаще 20 с", () => {
    expect(kaitenListTitlesPollIntervalMs()).toBe(45_000);
    expect(kaitenListTitlesPollIntervalMs("5000")).toBe(20_000);
  });
});

describe("toastFingerprintShouldRefreshListPath", () => {
  it("список заказов и фин отдел — да; карточка наряда — нет", () => {
    expect(toastFingerprintShouldRefreshListPath("/orders")).toBe(true);
    expect(toastFingerprintShouldRefreshListPath("/finance-office")).toBe(true);
    expect(toastFingerprintShouldRefreshListPath("/orders/or_abc")).toBe(false);
    expect(toastFingerprintShouldRefreshListPath("/kanban")).toBe(false);
  });
});

describe("shouldRefreshListFromToastFingerprint", () => {
  it("первый снимок и тот же fp — без refresh; новая корр — да", () => {
    expect(shouldRefreshListFromToastFingerprint("", "c:1")).toBe(false);
    expect(shouldRefreshListFromToastFingerprint("c:1", "c:1")).toBe(false);
    expect(
      shouldRefreshListFromToastFingerprint(
        "h:|c:corr-1|p:|m:|lmc:0",
        "h:|c:corr-1,corr-кириллица|p:|m:|lmc:0",
      ),
    ).toBe(true);
  });
});

describe("shouldRefreshListFromKaitenPoll", () => {
  it("пустой ok Kaiten — нет; импорт / mention / listUi — да", () => {
    expect(
      shouldRefreshListFromKaitenPoll({
        importHit: false,
        mentionChanged: false,
        listUiChanged: false,
      }),
    ).toBe(false);
    expect(
      shouldRefreshListFromKaitenPoll({
        importHit: true,
        mentionChanged: false,
        listUiChanged: false,
      }),
    ).toBe(true);
    expect(
      shouldRefreshListFromKaitenPoll({
        importHit: false,
        mentionChanged: true,
        listUiChanged: false,
      }),
    ).toBe(true);
    expect(
      shouldRefreshListFromKaitenPoll({
        importHit: false,
        mentionChanged: false,
        listUiChanged: true,
      }),
    ).toBe(true);
  });
});

describe("kaitenBackgroundShouldWriteOrder", () => {
  const same = {
    sameTitle: true,
    sameDescription: true,
    sameBlock: true,
    sameSort: true,
    sameUrgent: true,
    sameLane: true,
  };

  it("фон: колонка Kaiten ≠ CRM — не писать", () => {
    expect(
      kaitenBackgroundShouldWriteOrder({
        ...same,
        applyColumnFromKaiten: false,
        sameTitle: false,
      }),
    ).toBe(false);
  });

  it("фон: сменилась срочность — писать", () => {
    expect(
      kaitenBackgroundShouldWriteOrder({
        ...same,
        applyColumnFromKaiten: false,
        sameUrgent: false,
      }),
    ).toBe(true);
  });

  it("Обновить: расхождение колонки — писать", () => {
    expect(
      kaitenBackgroundShouldWriteOrder({
        ...same,
        applyColumnFromKaiten: true,
        sameTitle: false,
      }),
    ).toBe(true);
  });
});

describe("kaitenWrittenFieldsListUiChanged", () => {
  it("только описание или срочность или блок", () => {
    expect(
      kaitenWrittenFieldsListUiChanged({
        sameDescription: true,
        sameUrgent: true,
        wroteBlock: false,
      }),
    ).toBe(false);
    expect(
      kaitenWrittenFieldsListUiChanged({
        sameDescription: true,
        sameUrgent: false,
        wroteBlock: false,
      }),
    ).toBe(true);
  });
});
