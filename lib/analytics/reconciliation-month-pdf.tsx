import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReconciliationMonthReport } from "@/lib/analytics/reconciliation-month.server";
import { ensureNotoSansPdfFonts } from "@/lib/pdf-noto-fonts";

function moneyRu(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(n);
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSans",
    fontSize: 8,
    padding: 16,
    color: "#111827",
  },
  title: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 8,
    marginBottom: 8,
    color: "#4b5563",
  },
  totals: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
    padding: 6,
    marginBottom: 8,
  },
  row: { flexDirection: "row" },
  th: {
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderColor: "#d1d5db",
    fontWeight: 700,
  },
  cell: {
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  cName: { width: "36%" },
  cPeriods: { width: "32%" },
  cSum: { width: "10%", textAlign: "right" },
  cCmp: { width: "10%", textAlign: "right" },
  cDelta: { width: "12%", textAlign: "right" },
  muted: { color: "#6b7280", fontSize: 7.2 },
});

function monthLabel(input: { year: number; month: number }): string {
  return `${String(input.month).padStart(2, "0")}.${input.year}`;
}

export function ReconciliationMonthPdfDocument({
  report,
}: {
  report: ReconciliationMonthReport;
}) {
  ensureNotoSansPdfFonts();
  const hasCompare = report.compareMonth != null;

  return (
    <Document
      title={`Сверки ${monthLabel(report.month)}`}
      creator="dental-lab-crm"
      language="ru-RU"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>
          Сверки за {monthLabel(report.month)}
          {hasCompare ? ` (сравнение с ${monthLabel(report.compareMonth!)})` : ""}
        </Text>
        <Text style={styles.subtitle}>
          Контрагенты по автосверкам месяца. Если в месяце 2 сверки - отображаются обе суммы по периодам.
        </Text>

        <View style={styles.totals}>
          <Text>Итого за месяц: {moneyRu(report.totals.monthTotalRub)}</Text>
          {hasCompare ? (
            <Text>
              Итого за месяц сравнения: {moneyRu(report.totals.compareTotalRub ?? 0)} | Разница: {moneyRu(report.totals.deltaRub ?? 0)}
              {report.totals.deltaPercent == null
                ? ""
                : ` (${String(report.totals.deltaPercent).replace(".", ",")}%)`}
            </Text>
          ) : null}
        </View>

        <View style={[styles.row, styles.th]}>
          <Text style={[styles.cell, styles.cName]}>Контрагент</Text>
          <Text style={[styles.cell, styles.cPeriods]}>Периоды сверки</Text>
          <Text style={[styles.cell, styles.cSum]}>Сумма</Text>
          <Text style={[styles.cell, styles.cCmp]}>Сравн.</Text>
          <Text style={[styles.cell, styles.cDelta]}>Разница</Text>
        </View>

        {report.rows.map((row) => (
          <View key={row.clinicId} style={styles.row}>
            <View style={[styles.cell, styles.cName]}>
              <Text>{row.contractorName}</Text>
            </View>
            <View style={[styles.cell, styles.cPeriods]}>
              <Text>
                {row.periods
                  .map((p) => `${p.periodLabelRu}: ${moneyRu(p.amountRub)}`)
                  .join("; ")}
              </Text>
              {hasCompare && row.comparePeriods.length > 0 ? (
                <Text style={styles.muted}>
                  Сравнение:{" "}
                  {row.comparePeriods
                    .map((p) => `${p.periodLabelRu}: ${moneyRu(p.amountRub)}`)
                    .join("; ")}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.cell, styles.cSum]}>{moneyRu(row.monthTotalRub)}</Text>
            <Text style={[styles.cell, styles.cCmp]}>
              {hasCompare && row.compareTotalRub != null ? moneyRu(row.compareTotalRub) : "—"}
            </Text>
            <Text style={[styles.cell, styles.cDelta]}>
              {hasCompare && row.deltaRub != null
                ? `${moneyRu(row.deltaRub)}${
                    row.deltaPercent == null
                      ? ""
                      : ` (${String(row.deltaPercent).replace(".", ",")}%)`
                  }`
                : "—"}
            </Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
