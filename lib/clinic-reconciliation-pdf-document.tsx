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

/** Как в Excel-образце: ярко-жёлтая заливка шапки. */
const YELLOW = "#FFFF00";
const BORDER = "#000000";
const CELL_PAD = 3;

/** Должны совпадать с ширинами колонок детализации (flex). */
const F = {
  z: 0.62,
  o: 0.62,
  n: 0.82,
  p: 1.05,
  v: 1.05,
  desc: 2.75,
  q: 0.38,
  price: 0.82,
  s1: 0.82,
  s2: 0.82,
} as const;

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSans",
    fontSize: 7.5,
    paddingTop: 18,
    paddingBottom: 22,
    paddingHorizontal: 16,
    color: "#000",
    backgroundColor: "#fff",
  },

  summaryRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    minHeight: 16,
  },
  summaryTop: {
    borderTopWidth: 1,
    borderColor: BORDER,
  },
  summaryCell: {
    padding: CELL_PAD,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: "center",
  },
  summaryLabel: { flex: 5.4 },
  summaryQty: { flex: 0.65, textAlign: "right" },
  summaryPrice: { flex: 1.15, textAlign: "right" },
  summaryTotal: {
    flex: 1.15,
    textAlign: "right",
    borderRightWidth: 0,
  },

  gap: { height: 6 },

  yellowWrap: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: YELLOW,
  },
  yellowMetaRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: YELLOW,
    minHeight: 20,
  },
  yellowHeadRow: {
    flexDirection: "row",
    backgroundColor: YELLOW,
    minHeight: 26,
  },
  yCell: {
    padding: CELL_PAD,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 7,
  },
  yLab: { flex: 1.35 },
  yFrom: { flex: 0.62, textAlign: "right" },
  yTo: { flex: 0.62, textAlign: "right" },
  yClinic: { flex: 2.35 },
  yCnt: { flex: 0.42, textAlign: "right" },
  ySum: { flex: 1.05, textAlign: "right" },
  yZero: { flex: 0.72, textAlign: "right", borderRightWidth: 0 },

  hCell: {
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 6.5,
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
  hS1: { flex: F.s1, textAlign: "right" },
  hS2: { flex: F.s2, textAlign: "right", borderRightWidth: 0 },

  /** Одна строка наряда: «склеенные» 5 колонок + блок строк позиций. */
  orderGroup: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#fff",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  orderGroupFirst: {
    borderTopWidth: 0,
  },
  metaCell: {
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
  metaTextRight: { fontSize: 6.8, textAlign: "right" },
  metaTextCenter: { fontSize: 6.8, textAlign: "center" },
  metaTextLeft: { fontSize: 6.8, textAlign: "left" },

  linesBlock: {
    flexDirection: "column",
    flex:
      F.desc +
      F.q +
      F.price +
      F.s1 +
      F.s2,
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
    fontSize: 6.8,
    textAlign: "left",
  },
  cQ: {
    flex: F.q,
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    fontSize: 6.8,
    textAlign: "right",
  },
  cPrice: {
    flex: F.price,
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    fontSize: 6.8,
    textAlign: "right",
  },
  cS1: {
    flex: F.s1,
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    fontSize: 6.8,
    textAlign: "right",
  },
  cS2: {
    flex: F.s2,
    padding: 2,
    fontSize: 6.8,
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
  isFirst,
}: {
  group: ReconciliationPdfDetailLine[];
  isFirst: boolean;
}) {
  const first = group[0];
  if (!first) return null;

  return (
    <View style={[styles.orderGroup, isFirst ? styles.orderGroupFirst : {}]}>
      <View style={[styles.metaCell, styles.mZ]}>
        <Text style={styles.metaTextRight}>{first.zashla}</Text>
      </View>
      <View style={[styles.metaCell, styles.mO]}>
        <Text style={styles.metaTextRight}>{first.otpr}</Text>
      </View>
      <View style={[styles.metaCell, styles.mN]}>
        <Text style={styles.metaTextCenter}>{first.orderNumber}</Text>
      </View>
      <View style={[styles.metaCell, styles.mP]}>
        <Text style={styles.metaTextLeft}>{first.patient}</Text>
      </View>
      <View style={[styles.metaCell, styles.mV]}>
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
            <Text style={styles.cS1}>{formatRubPdf(line.lineTotalRub)}</Text>
            <Text style={styles.cS2}>
              {formatRubPdf(line.jobRunningTotalRub)}
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
        {payload.summary.map((row, i) => (
          <View
            key={`s-${i}`}
            style={[styles.summaryRow, i === 0 ? styles.summaryTop : {}]}
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

        <View style={styles.gap} />

        <View style={styles.yellowWrap} wrap={false}>
          <View style={styles.yellowMetaRow}>
            <Text style={[styles.yCell, styles.yLab]}>{payload.labLegalName}</Text>
            <Text style={[styles.yCell, styles.yFrom]}>
              {payload.periodFromLabel}
            </Text>
            <Text style={[styles.yCell, styles.yTo]}>
              {payload.periodToLabel}
            </Text>
            <Text style={[styles.yCell, styles.yClinic]}>
              {payload.clinicTitleLine}
            </Text>
            <Text style={[styles.yCell, styles.yCnt]}>
              {payload.yellowRow.totalLineCount}
            </Text>
            <Text style={[styles.yCell, styles.ySum]}>
              {formatRubPdf(payload.yellowRow.grandTotalRub)}
            </Text>
            <Text style={[styles.yCell, styles.yZero]}>
              {formatRubPdf(payload.yellowRow.secondTotalRub)}
            </Text>
          </View>
          <View style={styles.yellowHeadRow}>
            <Text style={[styles.hCell, styles.hZ]}>Зашла</Text>
            <Text style={[styles.hCell, styles.hO]}>Отпр</Text>
            <Text style={[styles.hCell, styles.hN]}>
              Номер{"\n"}заказ-наряда
            </Text>
            <Text style={[styles.hCell, styles.hP]}>Пациент</Text>
            <Text style={[styles.hCell, styles.hV]}>Врач</Text>
            <Text style={[styles.hCell, styles.hDesc]}>Выставлено</Text>
            <Text style={[styles.hCell, styles.hQ]}>Кол-во</Text>
            <Text style={[styles.hCell, styles.hPrice]}>Цена</Text>
            <Text style={[styles.hCell, styles.hS1]}>Стоим.</Text>
            <Text style={[styles.hCell, styles.hS2]}>
              Стоим.{"\n"}работы
            </Text>
          </View>
        </View>

        {groups.map((group, gi) => (
          <OrderGroupBlock
            key={`g-${gi}`}
            group={group}
            isFirst={gi === 0}
          />
        ))}
      </Page>
    </Document>
  );
}
