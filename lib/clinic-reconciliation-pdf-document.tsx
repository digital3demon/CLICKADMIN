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
  RECON_PDF_PAGE_PAD_BOTTOM,
  RECON_PDF_PAGE_PAD_TOP,
  RECON_ROW_GRAY as ROW_GRAY,
  reconSummaryCompact,
  type ReconSummaryCompact,
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
    paddingTop: RECON_PDF_PAGE_PAD_TOP,
    paddingBottom: RECON_PDF_PAGE_PAD_BOTTOM,
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
  pad,
  lineHeight,
  children,
}: {
  w: number;
  last?: boolean;
  bg?: string;
  align?: "left" | "right" | "center";
  bold?: boolean;
  size?: number;
  pad?: number;
  lineHeight?: number;
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
        padding: pad ?? CELL_PAD,
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
          lineHeight: lineHeight ?? 1.15,
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
        Дата когда зашла работа
      </PdfCell>
      <PdfCell w={innerCol(1)} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Дата отправки работы
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

function SummaryInsetRow({
  first,
  head,
  compact,
  name,
  qty,
  unit,
  sum,
}: {
  first?: boolean;
  head?: boolean;
  compact: ReconSummaryCompact;
  name: string;
  qty: string;
  unit: string;
  sum: string;
}) {
  const gap = innerSpan(0, 4);
  const bg = head ? HEAD_GRAY : ROW_GRAY;
  const size = head ? Math.max(5.2, compact.fontSize - 0.4) : compact.fontSize;
  return (
    <View wrap={false} style={{ width: PAGE_INNER }}>
      {first ? <View style={styles.hLine} /> : null}
      <View
        style={[
          styles.rowInner,
          {
            minHeight: head ? compact.headMinH : compact.rowMinH,
            backgroundColor: "transparent",
          },
        ]}
      >
        <View
          style={{
            width: gap,
            minWidth: gap,
            maxWidth: gap,
            flexGrow: 0,
            flexShrink: 0,
          }}
        />
        <View style={styles.vLine} />
        <PdfCell
          w={innerCol(5)}
          bg={bg}
          align={head ? "center" : "left"}
          bold={head}
          size={size}
          pad={compact.cellPad}
          lineHeight={1.05}
        >
          {name}
        </PdfCell>
        <PdfCell
          w={innerCol(6)}
          bg={bg}
          align={head ? "center" : "right"}
          bold={head}
          size={size}
          pad={compact.cellPad}
          lineHeight={1.05}
        >
          {qty}
        </PdfCell>
        <PdfCell
          w={innerCol(7)}
          bg={bg}
          align={head ? "center" : "right"}
          bold={head}
          size={size}
          pad={compact.cellPad}
          lineHeight={1.05}
        >
          {unit}
        </PdfCell>
        <PdfCell
          w={innerCol(8)}
          last
          bg={bg}
          align={head ? "center" : "right"}
          bold={head}
          size={size}
          pad={compact.cellPad}
          lineHeight={1.05}
        >
          {sum}
        </PdfCell>
        <View style={styles.vLine} />
        <View
          style={{
            width: innerCol(9),
            minWidth: innerCol(9),
            maxWidth: innerCol(9),
          }}
        />
      </View>
      <View
        style={{
          marginLeft: gap,
          width: innerCol(5) + innerCol(6) + innerCol(7) + innerCol(8) + SPINE * 2,
          height: SPINE,
          backgroundColor: BORDER,
        }}
      />
    </View>
  );
}

function SummaryBlock({
  payload,
  compact,
}: {
  payload: ClinicReconciliationPdfPayload;
  compact: ReconSummaryCompact;
}) {
  return (
    <View style={{ width: PAGE_INNER }}>
      <SummaryInsetRow
        first
        head
        compact={compact}
        name="НАИМЕНОВАНИЕ ПОЗИЦИИ"
        qty="КОЛ-ВО ЕДИНИЦ"
        unit="СТОИМОСТЬ ЕДИНИЦЫ БЕЗ СКИДОК"
        sum="СУММА ЕДИНИЦ БЕЗ СКИДОК"
      />
      {payload.summary.map((row, i) => (
        <SummaryInsetRow
          key={`s-${i}`}
          compact={compact}
          name={row.label}
          qty={String(row.quantity).replace(".", ",")}
          unit={formatRubPdf(row.unitRub)}
          sum={formatRubPdf(row.totalRub)}
        />
      ))}
      <GridRow bg={ROW_GRAY} minHeight={compact.yellowMinH}>
        <PdfCell
          w={innerSpan(0, 2)}
          bg={ROW_GRAY}
          align="center"
          bold
          pad={compact.cellPad}
          size={compact.fontSize}
          lineHeight={1.05}
        >
          {payload.labLegalName}
        </PdfCell>
        <PdfCell
          w={innerCol(3)}
          bg={ROW_GRAY}
          align="center"
          bold
          pad={compact.cellPad}
          size={compact.fontSize}
          lineHeight={1.05}
        >
          {payload.periodFromLabel}
        </PdfCell>
        <PdfCell
          w={innerCol(4)}
          bg={ROW_GRAY}
          align="center"
          bold
          pad={compact.cellPad}
          size={compact.fontSize}
          lineHeight={1.05}
        >
          {payload.periodToLabel}
        </PdfCell>
        <PdfCell
          w={innerCol(5)}
          bg={ROW_GRAY}
          align="center"
          bold
          pad={compact.cellPad}
          size={compact.fontSize}
          lineHeight={1.05}
        >
          {payload.clinicTitleLine}
        </PdfCell>
        <PdfCell
          w={innerCol(6)}
          bg={ROW_GRAY}
          align="right"
          bold
          pad={compact.cellPad}
          size={compact.fontSize}
          lineHeight={1.05}
        >
          {String(payload.yellowRow.totalUnits).replace(".", ",")}
        </PdfCell>
        <PdfCell w={innerCol(7)} bg={ROW_GRAY} pad={compact.cellPad} />
        <PdfCell
          w={innerCol(8)}
          bg={ROW_GRAY}
          align="right"
          bold
          pad={compact.cellPad}
          size={compact.fontSize}
          lineHeight={1.05}
        >
          {formatRubPdf(payload.yellowRow.baseTotalRub)}
        </PdfCell>
        <PdfCell
          w={innerCol(9)}
          last
          bg={ROW_GRAY}
          align="right"
          bold
          pad={compact.cellPad}
          size={compact.fontSize}
          lineHeight={1.05}
        >
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
  const left = innerSpan(0, 7);
  const labelW = innerCol(8);
  const valueW = innerCol(9);
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

function DetailPages({
  payload,
  repeatHeaderAfterFirst,
}: {
  payload: ClinicReconciliationPdfPayload;
  repeatHeaderAfterFirst: boolean;
}) {
  return (
    <>
      {repeatHeaderAfterFirst ? (
        <View
          fixed
          render={({ pageNumber }) =>
            pageNumber > 1 ? <DetailHeaderRow first /> : <View />
          }
        />
      ) : null}
      <DetailHeaderRow first />
      {payload.detail.map((line, i) => (
        <DetailRow key={`d-${i}`} line={line} />
      ))}
    </>
  );
}

export function ClinicReconciliationPdfDocument({
  payload,
}: {
  payload: ClinicReconciliationPdfPayload;
}) {
  ensureNotoSansPdfFonts();
  const compact = reconSummaryCompact(payload.summary.length);

  const firstBlock = (
    <View wrap={compact.allowWrap} style={{ width: PAGE_INNER }}>
      <SummaryBlock payload={payload} compact={compact} />
      <View wrap={false}>
        <PayTotalsBlock payload={payload} />
      </View>
    </View>
  );

  return (
    <Document
      title={`Сверка ${payload.clinicTitleLine.slice(0, 80)}`}
      creator="dental-lab-crm"
      language="ru-RU"
    >
      {compact.allowWrap ? (
        <>
          <Page size="A4" orientation="landscape" style={styles.page}>
            {firstBlock}
          </Page>
          <Page size="A4" orientation="landscape" style={styles.page}>
            <DetailPages payload={payload} repeatHeaderAfterFirst />
          </Page>
        </>
      ) : (
        <Page size="A4" orientation="landscape" style={styles.page}>
          {firstBlock}
          <DetailPages payload={payload} repeatHeaderAfterFirst />
        </Page>
      )}
    </Document>
  );
}
