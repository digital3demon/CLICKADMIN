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
import { groupReconciliationDetailRows } from "@/lib/clinic-reconciliation-math";
import { ensureNotoSansPdfFonts } from "@/lib/pdf-noto-fonts";

const YELLOW = "#FFFF00";
const GREEN = "#00FF00";
const BORDER = "#000000";
const CELL_PAD = 2.5;

const F = {
  z: 8,
  o: 7,
  n: 10,
  p: 14,
  v: 14,
  desc: 40,
  q: 8,
  price: 10,
  total: 11,
  disc: 11,
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
    width: "42%",
    borderWidth: 1,
    borderColor: BORDER,
  },
  summaryHead: {
    flexDirection: "row",
    backgroundColor: YELLOW,
    borderBottomWidth: 1,
    borderColor: BORDER,
    minHeight: 17,
  },
  summaryHeadCell: {
    padding: CELL_PAD,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: "center",
    textAlign: "center",
    fontWeight: 700,
    fontSize: 5.8,
  },
  summaryRow: {
    flexDirection: "row",
    backgroundColor: YELLOW,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    minHeight: 15,
  },
  summaryCell: {
    padding: CELL_PAD,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: "center",
    fontSize: 6.2,
  },
  summaryLabel: { flex: 3.4 },
  summaryQty: { flex: 0.7, textAlign: "right" },
  summaryPrice: { flex: 1.1, textAlign: "right" },
  summaryTotal: {
    flex: 1.2,
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
    minHeight: 20,
  },
  metaCell: {
    padding: CELL_PAD,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: "center",
    fontSize: 6.3,
    fontWeight: 700,
  },
  mLegal: { flex: F.z + F.o + F.n, textAlign: "center" },
  mFrom: { flex: F.p, textAlign: "center" },
  mTo: { flex: F.v, textAlign: "center" },
  mClinic: { flex: F.desc, textAlign: "center" },
  mUnits: { flex: F.q, textAlign: "center" },
  mBlank: { flex: F.price },
  mBase: { flex: F.total, textAlign: "center" },
  mDiscTotal: { flex: F.disc, textAlign: "center", borderRightWidth: 0 },

  payRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    minHeight: 16,
  },
  paySpacer: {
    flex: F.z + F.o + F.n + F.p + F.v + F.desc + F.q + F.price,
  },
  payLabel: {
    flex: F.total,
    backgroundColor: GREEN,
    padding: CELL_PAD,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    fontWeight: 700,
    fontSize: 6.4,
    textAlign: "center",
    justifyContent: "center",
  },
  payValue: {
    flex: F.disc,
    backgroundColor: YELLOW,
    padding: CELL_PAD,
    fontWeight: 700,
    fontSize: 6.5,
    textAlign: "right",
    justifyContent: "center",
  },

  headRow: {
    flexDirection: "row",
    backgroundColor: GREEN,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    minHeight: 22,
  },
  hCell: {
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: "center",
    textAlign: "center",
    fontWeight: 700,
    fontSize: 5.9,
    lineHeight: 1.15,
  },
  hZ: { flex: F.z },
  hO: { flex: F.o },
  hN: { flex: F.n },
  hP: { flex: F.p },
  hV: { flex: F.v },
  hDesc: { flex: F.desc },
  hQ: { flex: F.q },
  hPrice: { flex: F.price },
  hTotal: { flex: F.total },
  hDisc: { flex: F.disc, borderRightWidth: 0 },

  orderGroup: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: YELLOW,
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
    flex: F.desc + F.q + F.price + F.total + F.disc,
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
        <Text style={styles.metaTextRight}>
          {first.otpr === "—" ? "" : first.otpr}
        </Text>
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
  const groups = groupReconciliationDetailRows(payload.detail);

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
                НАИМЕНОВАНИЕ ПОЗИЦИИ
              </Text>
              <Text style={[styles.summaryHeadCell, styles.summaryQty]}>
                КОЛ-ВО ЕДИНИЦ
              </Text>
              <Text style={[styles.summaryHeadCell, styles.summaryPrice]}>
                СТОИМОСТЬ ЕДИНИЦЫ БЕЗ СКИДОК
              </Text>
              <Text style={[styles.summaryHeadCell, styles.summaryTotal]}>
                СУММА ЕДИНИЦ БЕЗ СКИДОК
              </Text>
            </View>
            {payload.summary.map((row, i) => (
              <View
                key={`s-${i}`}
                style={[
                  styles.summaryRow,
                  i === payload.summary.length - 1
                    ? { borderBottomWidth: 0 }
                    : {},
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
          </View>
        </View>

        <View style={styles.mainWrap}>
          <View style={styles.metaRow}>
            <Text style={[styles.metaCell, styles.mLegal]}>
              {payload.labLegalName}
            </Text>
            <Text style={[styles.metaCell, styles.mFrom]}>
              {payload.periodFromLabel}
            </Text>
            <Text style={[styles.metaCell, styles.mTo]}>
              {payload.periodToLabel}
            </Text>
            <Text style={[styles.metaCell, styles.mClinic]}>
              {payload.clinicTitleLine}
            </Text>
            <Text style={[styles.metaCell, styles.mUnits]}>
              {String(payload.yellowRow.totalUnits).replace(".", ",")}
            </Text>
            <Text style={[styles.metaCell, styles.mBlank]} />
            <Text style={[styles.metaCell, styles.mBase]}>
              {formatRubPdf(payload.yellowRow.baseTotalRub)}
            </Text>
            <Text style={[styles.metaCell, styles.mDiscTotal]}>
              {formatRubPdf(payload.yellowRow.discountedTotalRub)}
            </Text>
          </View>

          <View style={styles.payRow}>
            <View style={styles.paySpacer} />
            <Text style={styles.payLabel}>Всего к оплате:</Text>
            <Text style={styles.payValue}>
              {formatRubPdf(payload.yellowRow.discountedTotalRub)}
            </Text>
          </View>
          <View style={styles.payRow}>
            <View style={styles.paySpacer} />
            <Text style={styles.payLabel}>В т.ч.Сумма НДС 5%:</Text>
            <Text style={styles.payValue}>
              {formatRubPdf(payload.yellowRow.vatRub)}
            </Text>
          </View>

          <View style={styles.headRow}>
            <Text style={[styles.hCell, styles.hZ]}>
              Число когда зашла работа
            </Text>
            <Text style={[styles.hCell, styles.hO]}>
              Число отправки работы
            </Text>
            <Text style={[styles.hCell, styles.hN]}>
              {`Номер заказ-\nнаряда`}
            </Text>
            <Text style={[styles.hCell, styles.hP]}>Пациент</Text>
            <Text style={[styles.hCell, styles.hV]}>Врач</Text>
            <Text style={[styles.hCell, styles.hDesc]}>
              Выставлено(наименование позиции)
            </Text>
            <Text style={[styles.hCell, styles.hQ]}>Кол-во единиц</Text>
            <Text style={[styles.hCell, styles.hPrice]}>Цена за единицу</Text>
            <Text style={[styles.hCell, styles.hTotal]}>
              Стоим. (Сумма единиц)
            </Text>
            <Text style={[styles.hCell, styles.hDisc]}>СКИДКА</Text>
          </View>

          {groups.map((group, gi) => (
            <OrderGroupBlock key={`g-${gi}`} group={group} />
          ))}
        </View>
      </Page>
    </Document>
  );
}
