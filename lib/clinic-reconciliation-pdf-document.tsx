import type { ReactNode } from "react";
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
import {
  RECON_BORDER as BORDER,
  RECON_COL_W_PT as COL_W,
  RECON_HEAD_GRAY as HEAD_GRAY,
  RECON_PAGE_INNER_PT as PAGE_INNER,
  RECON_ROW_GRAY as ROW_GRAY,
  reconColSpan as span,
} from "@/lib/clinic-reconciliation-layout";

/**
 * Сетка сверки: линии — отдельные View, не border ячеек.
 * Yoga срезает 1pt у border на краю flex-ряда; линия-sibling остаётся.
 * В ряду две вертикальные «спины» по 1pt → ячейки суммируют PAGE_INNER-2.
 */
const SPINE = 1;
const CELL_PAD = 2;

function innerCol(i: number): number {
  return i === 9 ? COL_W[9]! - SPINE * 2 : COL_W[i]!;
}

function innerSpan(from: number, to: number): number {
  let s = 0;
  for (let i = from; i <= to; i++) s += innerCol(i);
  return s;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSans",
    fontSize: 7,
    paddingTop: 18,
    paddingBottom: 16,
    paddingLeft: 14,
    paddingRight: 18,
    color: "#000",
    backgroundColor: "#fff",
  },
  hLine: {
    width: PAGE_INNER,
    height: SPINE,
    backgroundColor: BORDER,
  },
  vLine: {
    width: SPINE,
    alignSelf: "stretch",
    backgroundColor: BORDER,
  },
  rowInner: {
    flexDirection: "row",
    width: PAGE_INNER,
    alignItems: "stretch",
  },
});

function PdfCell({
  w,
  last,
  bg,
  align,
  bold,
  size,
  children,
}: {
  w: number;
  last?: boolean;
  bg?: string;
  align?: "left" | "right" | "center";
  bold?: boolean;
  size?: number;
  children?: string;
}) {
  return (
    <View
      style={{
        width: w,
        minWidth: w,
        maxWidth: w,
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: w,
        padding: CELL_PAD,
        backgroundColor: bg,
        borderStyle: "solid",
        borderColor: BORDER,
        borderRightWidth: last ? 0 : 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderBottomWidth: 0,
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: size ?? 6.5,
          lineHeight: 1.15,
          textAlign: align ?? "left",
          fontWeight: bold ? 700 : 400,
          color: bg === HEAD_GRAY ? "#FFFFFF" : "#000000",
        }}
      >
        {children ?? ""}
      </Text>
    </View>
  );
}

function GridRow({
  bg,
  first,
  minHeight,
  children,
}: {
  bg?: string;
  first?: boolean;
  minHeight?: number;
  children: ReactNode;
}) {
  return (
    <View wrap={false} style={{ width: PAGE_INNER }}>
      {first ? <View style={styles.hLine} /> : null}
      <View
        style={[
          styles.rowInner,
          { backgroundColor: bg, minHeight: minHeight ?? 14 },
        ]}
      >
        <View style={styles.vLine} />
        {children}
        <View style={styles.vLine} />
      </View>
      <View style={styles.hLine} />
    </View>
  );
}

function BoxCell({
  w,
  bg,
  align,
  bold,
  size,
  children,
}: {
  w: number;
  bg?: string;
  align?: "left" | "right" | "center";
  bold?: boolean;
  size?: number;
  children?: string;
}) {
  return (
    <View
      style={{
        width: w,
        minWidth: w,
        maxWidth: w,
        flexGrow: 0,
        flexShrink: 0,
        padding: CELL_PAD,
        backgroundColor: bg,
        borderStyle: "solid",
        borderColor: BORDER,
        borderTopWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderLeftWidth: 1,
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: size ?? 6.5,
          lineHeight: 1.15,
          textAlign: align ?? "left",
          fontWeight: bold ? 700 : 400,
          color: bg === HEAD_GRAY ? "#FFFFFF" : "#000000",
        }}
      >
        {children ?? ""}
      </Text>
    </View>
  );
}

function moneyOrDash(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return formatRubPdf(v);
}

function DetailRow({
  line,
}: {
  line: ReconciliationPdfDetailLine;
}) {
  const showMeta = line.showOrderColumns;
  return (
    <GridRow bg={ROW_GRAY} minHeight={14}>
      <PdfCell w={innerCol(0)} align="right" bg={ROW_GRAY}>
        {showMeta ? line.zashla : ""}
      </PdfCell>
      <PdfCell w={innerCol(1)} align="right" bg={ROW_GRAY}>
        {showMeta && line.otpr !== "—" ? line.otpr : ""}
      </PdfCell>
      <PdfCell w={innerCol(2)} align="center" bg={ROW_GRAY}>
        {showMeta ? line.orderNumber : ""}
      </PdfCell>
      <PdfCell w={innerCol(3)} align="left" bg={ROW_GRAY}>
        {showMeta ? line.patient : ""}
      </PdfCell>
      <PdfCell w={innerCol(4)} align="left" bg={ROW_GRAY}>
        {showMeta ? line.doctor : ""}
      </PdfCell>
      <PdfCell w={innerCol(5)} align="left" bg={ROW_GRAY}>
        {line.description}
      </PdfCell>
      <PdfCell w={innerCol(6)} align="right" bg={ROW_GRAY}>
        {String(line.quantity).replace(".", ",")}
      </PdfCell>
      <PdfCell w={innerCol(7)} align="right" bg={ROW_GRAY}>
        {moneyOrDash(line.unitRub)}
      </PdfCell>
      <PdfCell w={innerCol(8)} align="right" bg={ROW_GRAY}>
        {formatRubPdf(line.lineTotalRub)}
      </PdfCell>
      <PdfCell w={innerCol(9)} last align="right" bg={ROW_GRAY}>
        {line.discountPercent == null
          ? ""
          : `${String(line.discountPercent).replace(".", ",")}%`}
      </PdfCell>
    </GridRow>
  );
}

function DetailHeaderRow({ first }: { first?: boolean }) {
  return (
    <GridRow bg={HEAD_GRAY} minHeight={24} first={first}>
      <PdfCell w={innerCol(0)} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Число когда зашла работа
      </PdfCell>
      <PdfCell w={innerCol(1)} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Число отправки работы
      </PdfCell>
      <PdfCell w={innerCol(2)} bg={HEAD_GRAY} align="center" bold size={5.9}>
        {`Номер заказ-\nнаряда`}
      </PdfCell>
      <PdfCell w={innerCol(3)} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Пациент
      </PdfCell>
      <PdfCell w={innerCol(4)} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Врач
      </PdfCell>
      <PdfCell w={innerCol(5)} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Выставлено(наименование позиции)
      </PdfCell>
      <PdfCell w={innerCol(6)} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Кол-во единиц
      </PdfCell>
      <PdfCell w={innerCol(7)} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Цена за единицу
      </PdfCell>
      <PdfCell w={innerCol(8)} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Стоим. (Сумма единиц)
      </PdfCell>
      <PdfCell w={innerCol(9)} last bg={HEAD_GRAY} align="center" bold size={5.9}>
        СКИДКА
      </PdfCell>
    </GridRow>
  );
}

function SummaryBlock({
  payload,
}: {
  payload: ClinicReconciliationPdfPayload;
}) {
  const nameW = innerSpan(0, 5);
  const qtyW = innerCol(6);
  const unitW = innerCol(7);
  const sumW = innerSpan(8, 9);
  return (
    <View style={{ width: PAGE_INNER }}>
      <GridRow bg={HEAD_GRAY} minHeight={18} first>
        <PdfCell w={nameW} bg={HEAD_GRAY} align="center" bold size={5.8}>
          НАИМЕНОВАНИЕ ПОЗИЦИИ
        </PdfCell>
        <PdfCell w={qtyW} bg={HEAD_GRAY} align="center" bold size={5.8}>
          КОЛ-ВО ЕДИНИЦ
        </PdfCell>
        <PdfCell w={unitW} bg={HEAD_GRAY} align="center" bold size={5.8}>
          СТОИМОСТЬ ЕДИНИЦЫ БЕЗ СКИДОК
        </PdfCell>
        <PdfCell w={sumW} last bg={HEAD_GRAY} align="center" bold size={5.8}>
          СУММА ЕДИНИЦ БЕЗ СКИДОК
        </PdfCell>
      </GridRow>
      {payload.summary.map((row, i) => (
        <GridRow key={`s-${i}`} bg={ROW_GRAY} minHeight={15}>
          <PdfCell w={nameW} bg={ROW_GRAY} size={6.2}>
            {row.label}
          </PdfCell>
          <PdfCell w={qtyW} bg={ROW_GRAY} align="right" size={6.2}>
            {String(row.quantity).replace(".", ",")}
          </PdfCell>
          <PdfCell w={unitW} bg={ROW_GRAY} align="right" size={6.2}>
            {formatRubPdf(row.unitRub)}
          </PdfCell>
          <PdfCell w={sumW} last bg={ROW_GRAY} align="right" size={6.2}>
            {formatRubPdf(row.totalRub)}
          </PdfCell>
        </GridRow>
      ))}
      <GridRow bg={ROW_GRAY} minHeight={20}>
        <PdfCell w={innerSpan(0, 2)} bg={ROW_GRAY} align="center" bold>
          {payload.labLegalName}
        </PdfCell>
        <PdfCell w={innerCol(3)} bg={ROW_GRAY} align="center" bold>
          {payload.periodFromLabel}
        </PdfCell>
        <PdfCell w={innerCol(4)} bg={ROW_GRAY} align="center" bold>
          {payload.periodToLabel}
        </PdfCell>
        <PdfCell w={innerCol(5)} bg={ROW_GRAY} align="center" bold>
          {payload.clinicTitleLine}
        </PdfCell>
        <PdfCell w={innerCol(6)} bg={ROW_GRAY} align="center" bold>
          {String(payload.yellowRow.totalUnits).replace(".", ",")}
        </PdfCell>
        <PdfCell w={innerCol(7)} bg={ROW_GRAY} />
        <PdfCell w={innerCol(8)} bg={ROW_GRAY} align="center" bold>
          {formatRubPdf(payload.yellowRow.baseTotalRub)}
        </PdfCell>
        <PdfCell w={innerCol(9)} last bg={ROW_GRAY} align="center" bold>
          {formatRubPdf(payload.yellowRow.discountedTotalRub)}
        </PdfCell>
      </GridRow>
    </View>
  );
}

function PayTotalsBlock({
  payload,
}: {
  payload: ClinicReconciliationPdfPayload;
}) {
  const left = span(0, 6);
  const labelW = COL_W[7];
  const valueW = span(8, 9);
  const spacer = {
    width: left,
    minWidth: left,
    maxWidth: left,
    flexGrow: 0,
    flexShrink: 0,
  };
  return (
    <View wrap={false} style={{ width: PAGE_INNER }}>
      <View style={{ flexDirection: "row", width: PAGE_INNER }}>
        <View style={spacer} />
        <BoxCell w={labelW} bg={HEAD_GRAY} align="center" bold size={6.4}>
          Всего к оплате:
        </BoxCell>
        <BoxCell w={valueW} bg={ROW_GRAY} align="right" bold>
          {formatRubPdf(payload.yellowRow.discountedTotalRub)}
        </BoxCell>
      </View>
      <View style={{ flexDirection: "row", width: PAGE_INNER }}>
        <View style={spacer} />
        <BoxCell w={labelW} bg={HEAD_GRAY} align="center" bold size={6.4}>
          В т.ч. Сумма НДС 5%:
        </BoxCell>
        <BoxCell w={valueW} bg={ROW_GRAY} align="right" bold>
          {formatRubPdf(payload.yellowRow.vatRub)}
        </BoxCell>
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
        <View
          fixed
          render={({ pageNumber }) =>
            pageNumber > 1 ? <DetailHeaderRow first /> : <View />
          }
        />
        <SummaryBlock payload={payload} />
        <PayTotalsBlock payload={payload} />
        <DetailHeaderRow first />
        {payload.detail.map((line, i) => (
          <DetailRow key={`d-${i}`} line={line} />
        ))}
      </Page>
    </Document>
  );
}
