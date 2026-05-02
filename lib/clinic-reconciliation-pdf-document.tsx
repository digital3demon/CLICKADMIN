import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type {
  ClinicReconciliationPdfPayload,
  ReconciliationPdfDetailLine,
} from "@/lib/clinic-reconciliation-pdf-data";
import { formatRubPdf } from "@/lib/clinic-reconciliation-pdf-format";
import { ensureNotoSansPdfFonts } from "@/lib/pdf-noto-fonts";

const YELLOW = "#FFFF00";
const GREEN = "#00FF00";
const BORDER = "#000000";
const CELL_PAD = 2.5;

const F = {
  z: 0.78,
  o: 0.62,
  n: 0.9,
  p: 1.2,
  v: 1.2,
  desc: 3.45,
  q: 0.62,
  price: 0.9,
  total: 0.95,
  disc: 0.95,
} as const;

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSans",
    fontSize: 7,
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 16,
    color: "#000",
    backgroundColor: "#fff",
  },

  topWrap: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  summaryWrap: {
    width: "34%",
    borderWidth: 1,
    borderColor: BORDER,
  },
  summaryHead: {
    flexDirection: "row",
    backgroundColor: GREEN,
    borderBottomWidth: 1,
    borderColor: BORDER,
    minHeight: 17,
  },
  summaryHeadCell: {
    padding: CELL_PAD,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 6.5,
  },
  summaryRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    minHeight: 16,
  },
  summaryCell: {
    padding: CELL_PAD,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: "center",
    fontSize: 6.5,
  },
  summaryLabel: { flex: 3.2 },
  summaryQty: { flex: 0.6, textAlign: "right" },
  summaryPrice: { flex: 0.9, textAlign: "right" },
  summaryTotal: {
    flex: 1.05,
    textAlign: "right",
    borderRightWidth: 0,
  },
  summaryTotalRow: {
    flexDirection: "row",
    backgroundColor: YELLOW,
    minHeight: 16,
  },
  summaryTotalLabel: {
    flex: 4.7,
    fontWeight: 700,
    textAlign: "right",
  },
  summaryTotalValue: {
    flex: 1.05,
    fontWeight: 700,
    textAlign: "right",
    borderRightWidth: 0,
  },

  mainWrap: {
    borderWidth: 1,
    borderColor: BORDER,
  },
  metaRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: YELLOW,
    minHeight: 18,
  },
  metaCell: {
    padding: CELL_PAD,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: "center",
    fontSize: 6.5,
    fontWeight: 700,
  },
  mLegal: { flex: F.z + F.o + F.n },
  mFrom: { flex: 0.95, textAlign: "center" },
  mTo: { flex: 0.95, textAlign: "center" },
  mClinic: { flex: F.p + F.v + 0.9 },
  mBlank1: { flex: 0.85 },
  mBlank2: { flex: 0.85 },
  mTotal: { flex: F.total, textAlign: "right" },
  mDiscTotal: { flex: F.disc, textAlign: "right", borderRightWidth: 0 },

  headRow: {
    flexDirection: "row",
    backgroundColor: GREEN,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    minHeight: 18,
  },
  hCell: {
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 6.4,
    lineHeight: 1.15,
  },
  hZ: { flex: F.z, textAlign: "right" },
  hO: { flex: F.o, textAlign: "right" },
  hN: { flex: F.n, textAlign: "center" },
  hP: { flex: F.p },
  hV: { flex: F.v },
  hDesc: { flex: F.desc },
  hQ: { flex: F.q, textAlign: "right" },
  hPrice: { flex: F.price, textAlign: "right" },
  hTotal: { flex: F.total, textAlign: "right" },
  hDisc: { flex: F.disc, textAlign: "right", borderRightWidth: 0 },

  orderGroup: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  groupMetaCell: {
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: "center",
  },
  mZ: { flex: F.z },
  mO: { flex: F.o },
  mN: { flex: F.n },
  mP: { flex: F.p },
  mV: { flex: F.v },
  metaTextRight: { fontSize: 6.5, textAlign: "right" },
  metaTextCenter: { fontSize: 6.5, textAlign: "center" },
  metaTextLeft: { fontSize: 6.5, textAlign: "left" },

  linesBlock: {
    flexDirection: "column",
    flex:
      F.desc +
      F.q +
      F.price +
      F.total +
      F.disc,
  },
  innerLine: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  innerLineLast: {
    borderBottomWidth: 0,
  },
  cDesc: {
    flex: F.desc,
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    fontSize: 6.5,
    textAlign: "left",
  },
  cQ: {
    flex: F.q,
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    fontSize: 6.5,
    textAlign: "right",
  },
  cPrice: {
    flex: F.price,
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    fontSize: 6.5,
    textAlign: "right",
  },
  cTotal: {
    flex: F.total,
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    fontSize: 6.5,
    textAlign: "right",
  },
  cDisc: {
    flex: F.disc,
    padding: 2,
    fontSize: 6.5,
    textAlign: "right",
  },
});

function moneyOrDash(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return formatRubPdf(v);
}

function groupDetailRows(
  rows: ReconciliationPdfDetailLine[],
): ReconciliationPdfDetailLine[][] {
  const groups: ReconciliationPdfDetailLine[][] = [];
  let cur: ReconciliationPdfDetailLine[] = [];
  for (const row of rows) {
    if (row.showOrderColumns) {
      if (cur.length) groups.push(cur);
      cur = [row];
    } else {
      cur.push(row);
    }
  }
  if (cur.length) groups.push(cur);
  return groups;
}

function OrderGroupBlock({
  group,
}: {
  group: ReconciliationPdfDetailLine[];
}) {
  const first = group[0];
  if (!first) return null;

  return (
    <View style={styles.orderGroup}>
      <View style={[styles.groupMetaCell, styles.mZ]}>
        <Text style={styles.metaTextRight}>{first.zashla}</Text>
      </View>
      <View style={[styles.groupMetaCell, styles.mO]}>
        <Text style={styles.metaTextRight}>{first.otpr}</Text>
      </View>
      <View style={[styles.groupMetaCell, styles.mN]}>
        <Text style={styles.metaTextCenter}>{first.orderNumber}</Text>
      </View>
      <View style={[styles.groupMetaCell, styles.mP]}>
        <Text style={styles.metaTextLeft}>{first.patient}</Text>
      </View>
      <View style={[styles.groupMetaCell, styles.mV]}>
        <Text style={styles.metaTextLeft}>{first.doctor}</Text>
      </View>

      <View style={styles.linesBlock}>
        {group.map((line, li) => (
          <View
            key={li}
            style={[
              styles.innerLine,
              li === group.length - 1 ? styles.innerLineLast : {},
            ]}
          >
            <Text style={styles.cDesc}>{line.description}</Text>
            <Text style={styles.cQ}>
              {String(line.quantity).replace(".", ",")}
            </Text>
            <Text style={styles.cPrice}>{moneyOrDash(line.unitRub)}</Text>
            <Text style={styles.cTotal}>{formatRubPdf(line.lineTotalRub)}</Text>
            <Text style={styles.cDisc}>
              {line.discountPercent == null
                ? ""
                : `${String(line.discountPercent).replace(".", ",")}%`}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ClinicReconciliationPdfDocument({
  payload,
}: {
  payload: ClinicReconciliationPdfPayload;
}) {
  ensureNotoSansPdfFonts();
  const groups = groupDetailRows(payload.detail);

  return (
    <Document
      title={`Сверка ${payload.clinicTitleLine.slice(0, 80)}`}
      creator="dental-lab-crm"
      language="ru-RU"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.topWrap}>
          <View style={styles.summaryWrap}>
            <View style={styles.summaryHead}>
              <Text style={[styles.summaryHeadCell, styles.summaryLabel]}>
                Позиции
              </Text>
              <Text style={[styles.summaryHeadCell, styles.summaryQty]}>Кол-во</Text>
              <Text style={[styles.summaryHeadCell, styles.summaryPrice]}>Цена</Text>
              <Text style={[styles.summaryHeadCell, styles.summaryTotal]}>
                Стоимость
              </Text>
            </View>
            {payload.summary.map((row, i) => (
              <View
                key={`s-${i}`}
                style={[
                  styles.summaryRow,
                  i === payload.summary.length - 1 ? { borderBottomWidth: 0 } : {},
                ]}
              >
                <Text style={[styles.summaryCell, styles.summaryLabel]}>
                  {row.label}
                </Text>
                <Text style={[styles.summaryCell, styles.summaryQty]}>
                  {String(row.quantity).replace(".", ",")}
                </Text>
                <Text style={[styles.summaryCell, styles.summaryPrice]}>
                  {formatRubPdf(row.unitRub)}
                </Text>
                <Text style={[styles.summaryCell, styles.summaryTotal]}>
                  {formatRubPdf(row.totalRub)}
                </Text>
              </View>
            ))}
            <View style={styles.summaryTotalRow}>
              <Text style={[styles.summaryCell, styles.summaryTotalLabel]}>
                ИТОГО
              </Text>
              <Text style={[styles.summaryCell, styles.summaryTotalValue]}>
                {formatRubPdf(payload.yellowRow.discountedTotalRub)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.mainWrap} wrap={false}>
          <View style={styles.metaRow}>
            <Text style={[styles.metaCell, styles.mLegal]}>
              {payload.labLegalName}
            </Text>
            <Text style={[styles.metaCell, styles.mFrom]}>
              Дата от{"\n"}
              {payload.periodFromLabel}
            </Text>
            <Text style={[styles.metaCell, styles.mTo]}>
              Дата до{"\n"}
              {payload.periodToLabel}
            </Text>
            <Text style={[styles.metaCell, styles.mClinic]}>
              {payload.clinicTitleLine}
            </Text>
            <Text style={[styles.metaCell, styles.mBlank1]} />
            <Text style={[styles.metaCell, styles.mBlank2]} />
            <Text style={[styles.metaCell, styles.mTotal]}>
              Итого{"\n"}
              {formatRubPdf(payload.yellowRow.baseTotalRub)}
            </Text>
            <Text style={[styles.metaCell, styles.mDiscTotal]}>
              Итого со{"\n"}скидкой{"\n"}
              {formatRubPdf(payload.yellowRow.discountedTotalRub)}
            </Text>
          </View>
          <View style={styles.headRow}>
            <Text style={[styles.hCell, styles.hZ]}>Зашла</Text>
            <Text style={[styles.hCell, styles.hO]}>Отпр</Text>
            <Text style={[styles.hCell, styles.hN]}>{`Номер\nнаряда`}</Text>
            <Text style={[styles.hCell, styles.hP]}>Пациент</Text>
            <Text style={[styles.hCell, styles.hV]}>Доктор</Text>
            <Text style={[styles.hCell, styles.hDesc]}>Выставлено</Text>
            <Text style={[styles.hCell, styles.hQ]}>Колво</Text>
            <Text style={[styles.hCell, styles.hPrice]}>Цена</Text>
            <Text style={[styles.hCell, styles.hTotal]}>Стоимость</Text>
            <Text style={[styles.hCell, styles.hDisc]}>Скидка</Text>
          </View>

          {groups.map((group, gi) => (
            <OrderGroupBlock key={`g-${gi}`} group={group} />
          ))}
        </View>
      </Page>
    </Document>
  );
}
