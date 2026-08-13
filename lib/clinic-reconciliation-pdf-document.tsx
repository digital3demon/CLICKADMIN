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

/** Строки данных / жёлтые поля значений — светло-серый. */
const ROW_GRAY = "#F2F2F2";
/** Шапки и зелёные подписи («к оплате») — тёмно-серый. */
const HEAD_GRAY = "#7A7A7A";
const BORDER = "#000000";
const CELL_PAD = 2.5;

/**
 * Доли колонок основной таблицы (сумма = 100).
 * Только width % — без вложенного flex: иначе границы «скачут» при переносе текста.
 */
const W = {
  z: "6%",
  o: "5.5%",
  n: "7.5%",
  p: "10.5%",
  v: "10.5%",
  desc: "30%",
  q: "6%",
  price: "7.5%",
  total: "8.5%",
  disc: "8%",
} as const;

/** Суммы соседних колонок для шапки метаданных / «к оплате». */
const W_META = {
  legal: "19%", // z+o+n
  from: W.p,
  to: W.v,
  clinic: W.desc,
  units: W.q,
  blank: W.price,
  base: W.total,
  discTotal: W.disc,
  paySpacer: "83.5%", // всё кроме total+disc
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
    backgroundColor: HEAD_GRAY,
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
    color: "#000",
  },
  summaryRow: {
    flexDirection: "row",
    backgroundColor: ROW_GRAY,
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
  summaryLabel: { width: "48%" },
  summaryQty: { width: "14%", textAlign: "right" },
  summaryPrice: { width: "19%", textAlign: "right" },
  summaryTotal: {
    width: "19%",
    textAlign: "right",
    borderRightWidth: 0,
  },

  mainWrap: {
    width: "100%",
    borderWidth: 1,
    borderColor: BORDER,
  },
  metaRow: {
    flexDirection: "row",
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: ROW_GRAY,
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
  mLegal: { width: W_META.legal, textAlign: "center" },
  mFrom: { width: W_META.from, textAlign: "center" },
  mTo: { width: W_META.to, textAlign: "center" },
  mClinic: { width: W_META.clinic, textAlign: "center" },
  mUnits: { width: W_META.units, textAlign: "center" },
  mBlank: { width: W_META.blank },
  mBase: { width: W_META.base, textAlign: "center" },
  mDiscTotal: {
    width: W_META.discTotal,
    textAlign: "center",
    borderRightWidth: 0,
  },

  payRow: {
    flexDirection: "row",
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    minHeight: 16,
  },
  paySpacer: {
    width: W_META.paySpacer,
  },
  payLabel: {
    width: W.total,
    backgroundColor: HEAD_GRAY,
    padding: CELL_PAD,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    fontWeight: 700,
    fontSize: 6.4,
    textAlign: "center",
    justifyContent: "center",
  },
  payValue: {
    width: W.disc,
    backgroundColor: ROW_GRAY,
    padding: CELL_PAD,
    fontWeight: 700,
    fontSize: 6.5,
    textAlign: "right",
    justifyContent: "center",
  },

  headRow: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: HEAD_GRAY,
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
  hZ: { width: W.z },
  hO: { width: W.o },
  hN: { width: W.n },
  hP: { width: W.p },
  hV: { width: W.v },
  hDesc: { width: W.desc },
  hQ: { width: W.q },
  hPrice: { width: W.price },
  hTotal: { width: W.total },
  hDisc: { width: W.disc, borderRightWidth: 0 },

  dataRow: {
    flexDirection: "row",
    width: "100%",
    alignItems: "stretch",
    backgroundColor: ROW_GRAY,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    minHeight: 14,
  },
  dCell: {
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    justifyContent: "flex-start",
  },
  dZ: { width: W.z },
  dO: { width: W.o },
  dN: { width: W.n },
  dP: { width: W.p },
  dV: { width: W.v },
  dDesc: { width: W.desc },
  dQ: { width: W.q },
  dPrice: { width: W.price },
  dTotal: { width: W.total },
  dDisc: { width: W.disc, borderRightWidth: 0 },
  tRight: { fontSize: 6.5, textAlign: "right" },
  tCenter: { fontSize: 6.5, textAlign: "center" },
  tLeft: { fontSize: 6.5, textAlign: "left" },
});

function moneyOrDash(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return formatRubPdf(v);
}

function DetailRow({ line }: { line: ReconciliationPdfDetailLine }) {
  const showMeta = line.showOrderColumns;
  return (
    <View style={styles.dataRow} wrap={false}>
      <View style={[styles.dCell, styles.dZ]}>
        <Text style={styles.tRight}>{showMeta ? line.zashla : ""}</Text>
      </View>
      <View style={[styles.dCell, styles.dO]}>
        <Text style={styles.tRight}>
          {showMeta && line.otpr !== "—" ? line.otpr : ""}
        </Text>
      </View>
      <View style={[styles.dCell, styles.dN]}>
        <Text style={styles.tCenter}>{showMeta ? line.orderNumber : ""}</Text>
      </View>
      <View style={[styles.dCell, styles.dP]}>
        <Text style={styles.tLeft}>{showMeta ? line.patient : ""}</Text>
      </View>
      <View style={[styles.dCell, styles.dV]}>
        <Text style={styles.tLeft}>{showMeta ? line.doctor : ""}</Text>
      </View>
      <View style={[styles.dCell, styles.dDesc]}>
        <Text style={styles.tLeft}>{line.description}</Text>
      </View>
      <View style={[styles.dCell, styles.dQ]}>
        <Text style={styles.tRight}>
          {String(line.quantity).replace(".", ",")}
        </Text>
      </View>
      <View style={[styles.dCell, styles.dPrice]}>
        <Text style={styles.tRight}>{moneyOrDash(line.unitRub)}</Text>
      </View>
      <View style={[styles.dCell, styles.dTotal]}>
        <Text style={styles.tRight}>{formatRubPdf(line.lineTotalRub)}</Text>
      </View>
      <View style={[styles.dCell, styles.dDisc]}>
        <Text style={styles.tRight}>
          {line.discountPercent == null
            ? ""
            : `${String(line.discountPercent).replace(".", ",")}%`}
        </Text>
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

          {payload.detail.map((line, i) => (
            <DetailRow key={`d-${i}`} line={line} />
          ))}
        </View>
      </Page>
    </Document>
  );
}
