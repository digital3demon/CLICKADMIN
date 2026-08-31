import { Children, type ReactNode } from "react";
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
  RECON_HEAD_GRAY as HEAD_GRAY,
  RECON_PAGE_INNER_PT as PAGE_INNER,
  RECON_PDF_PAGE_PAD_BOTTOM,
  RECON_PDF_PAGE_PAD_TOP,
  RECON_PDF_SPINE_PT as SPINE,
  RECON_ROW_GRAY as ROW_GRAY,
  reconPdfBoxedSpan,
  reconPdfInnerCol,
  reconPdfInnerSpan,
  reconPdfPrefixBeforeCol,
  reconSummaryCompact,
  type ReconSummaryCompact,
} from "@/lib/clinic-reconciliation-layout";

/**
 * Сетка сверки: линии — отдельные View, не border ячеек.
 * Yoga срезает 1pt у border на краю flex-ряда; линия-sibling остаётся.
 * Ряд: 11 вертикальных спин + inner колонок = PAGE_INNER.
 */

const CELL_PAD = 2;

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
  bg,
  align,
  bold,
  size,
  pad,
  lineHeight,
  children,
}: {
  w: number;
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

function withSpines(cells: ReactNode): ReactNode[] {
  const list = Children.toArray(cells);
  const out: ReactNode[] = [<View key="v-0" style={styles.vLine} />];
  list.forEach((cell, i) => {
    out.push(cell);
    out.push(<View key={`v-${i + 1}`} style={styles.vLine} />);
  });
  return out;
}

function GridRow({
  bg,
  first,
  minHeight,
  omitBottom,
  children,
}: {
  bg?: string;
  first?: boolean;
  minHeight?: number;
  omitBottom?: boolean;
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
        {withSpines(children)}
      </View>
      {omitBottom ? null : <View style={styles.hLine} />}
    </View>
  );
}

function InsetRow({
  fromCol,
  toCol,
  first,
  omitBottom,
  minHeight,
  children,
}: {
  fromCol: number;
  toCol: number;
  first?: boolean;
  omitBottom?: boolean;
  minHeight?: number;
  children: ReactNode;
}) {
  const padLeft = reconPdfPrefixBeforeCol(fromCol);
  const boxW = reconPdfBoxedSpan(fromCol, toCol);
  const padRight = PAGE_INNER - padLeft - boxW;
  return (
    <View wrap={false} style={{ width: PAGE_INNER }}>
      {first ? (
        <View
          style={{
            marginLeft: padLeft,
            width: boxW,
            height: SPINE,
            backgroundColor: BORDER,
          }}
        />
      ) : null}
      <View
        style={[
          styles.rowInner,
          { minHeight: minHeight ?? 14, backgroundColor: "transparent" },
        ]}
      >
        <View
          style={{
            width: padLeft,
            minWidth: padLeft,
            maxWidth: padLeft,
            flexGrow: 0,
            flexShrink: 0,
          }}
        />
        {withSpines(children)}
        {padRight > 0 ? (
          <View
            style={{
              width: padRight,
              minWidth: padRight,
              maxWidth: padRight,
              flexGrow: 0,
              flexShrink: 0,
            }}
          />
        ) : null}
      </View>
      {omitBottom ? null : (
        <View
          style={{
            marginLeft: padLeft,
            width: boxW,
            height: SPINE,
            backgroundColor: BORDER,
          }}
        />
      )}
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
      <PdfCell w={reconPdfInnerCol(0)} align="right" bg={ROW_GRAY}>
        {showMeta ? line.zashla : ""}
      </PdfCell>
      <PdfCell w={reconPdfInnerCol(1)} align="right" bg={ROW_GRAY}>
        {showMeta && line.otpr !== "—" ? line.otpr : ""}
      </PdfCell>
      <PdfCell w={reconPdfInnerCol(2)} align="center" bg={ROW_GRAY}>
        {showMeta ? line.orderNumber : ""}
      </PdfCell>
      <PdfCell w={reconPdfInnerCol(3)} align="left" bg={ROW_GRAY}>
        {showMeta ? line.patient : ""}
      </PdfCell>
      <PdfCell w={reconPdfInnerCol(4)} align="left" bg={ROW_GRAY}>
        {showMeta ? line.doctor : ""}
      </PdfCell>
      <PdfCell w={reconPdfInnerCol(5)} align="left" bg={ROW_GRAY}>
        {line.description}
      </PdfCell>
      <PdfCell w={reconPdfInnerCol(6)} align="right" bg={ROW_GRAY}>
        {String(line.quantity).replace(".", ",")}
      </PdfCell>
      <PdfCell w={reconPdfInnerCol(7)} align="right" bg={ROW_GRAY}>
        {moneyOrDash(line.unitRub)}
      </PdfCell>
      <PdfCell w={reconPdfInnerCol(8)} align="right" bg={ROW_GRAY}>
        {formatRubPdf(line.lineTotalRub)}
      </PdfCell>
      <PdfCell w={reconPdfInnerCol(9)} align="right" bg={ROW_GRAY}>
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
      <PdfCell w={reconPdfInnerCol(0)} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Дата когда зашла работа
      </PdfCell>
      <PdfCell w={reconPdfInnerCol(1)} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Дата отправки работы
      </PdfCell>
      <PdfCell w={reconPdfInnerCol(2)} bg={HEAD_GRAY} align="center" bold size={5.9}>
        {`Номер заказ-\nнаряда`}
      </PdfCell>
      <PdfCell w={reconPdfInnerCol(3)} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Пациент
      </PdfCell>
      <PdfCell w={reconPdfInnerCol(4)} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Врач
      </PdfCell>
      <PdfCell w={reconPdfInnerCol(5)} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Выставлено(наименование позиции)
      </PdfCell>
      <PdfCell w={reconPdfInnerCol(6)} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Кол-во единиц
      </PdfCell>
      <PdfCell w={reconPdfInnerCol(7)} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Цена за единицу
      </PdfCell>
      <PdfCell w={reconPdfInnerCol(8)} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Стоим. (Сумма единиц)
      </PdfCell>
      <PdfCell w={reconPdfInnerCol(9)} bg={HEAD_GRAY} align="center" bold size={5.9}>
        СКИДКА
      </PdfCell>
    </GridRow>
  );
}

function SummaryInsetRow({
  first,
  head,
  omitBottom,
  compact,
  name,
  qty,
  unit,
  sum,
}: {
  first?: boolean;
  head?: boolean;
  omitBottom?: boolean;
  compact: ReconSummaryCompact;
  name: string;
  qty: string;
  unit: string;
  sum: string;
}) {
  const bg = head ? HEAD_GRAY : ROW_GRAY;
  const size = head ? Math.max(5.2, compact.fontSize - 0.4) : compact.fontSize;
  return (
    <InsetRow
      fromCol={5}
      toCol={8}
      first={first}
      omitBottom={omitBottom}
      minHeight={head ? compact.headMinH : compact.rowMinH}
    >
      <PdfCell
        w={reconPdfInnerCol(5)}
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
        w={reconPdfInnerCol(6)}
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
        w={reconPdfInnerCol(7)}
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
        w={reconPdfInnerCol(8)}
        bg={bg}
        align={head ? "center" : "right"}
        bold={head}
        size={size}
        pad={compact.cellPad}
        lineHeight={1.05}
      >
        {sum}
      </PdfCell>
    </InsetRow>
  );
}

function SummaryBlock({
  payload,
  compact,
}: {
  payload: ClinicReconciliationPdfPayload;
  compact: ReconSummaryCompact;
}) {
  const lastSummary = payload.summary.length - 1;
  return (
    <View style={{ width: PAGE_INNER }}>
      <SummaryInsetRow
        first
        head
        omitBottom={payload.summary.length === 0}
        compact={compact}
        name="НАИМЕНОВАНИЕ ПОЗИЦИИ"
        qty="КОЛ-ВО ЕДИНИЦ"
        unit="СТОИМОСТЬ ЕДИНИЦЫ БЕЗ СКИДОК"
        sum="СУММА ЕДИНИЦ БЕЗ СКИДОК"
      />
      {payload.summary.map((row, i) => (
        <SummaryInsetRow
          key={`s-${i}`}
          omitBottom={i === lastSummary}
          compact={compact}
          name={row.label}
          qty={String(row.quantity).replace(".", ",")}
          unit={formatRubPdf(row.unitRub)}
          sum={formatRubPdf(row.totalRub)}
        />
      ))}
      <GridRow first bg={ROW_GRAY} minHeight={compact.yellowMinH}>
        <PdfCell
          w={reconPdfInnerSpan(0, 2)}
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
          w={reconPdfInnerCol(3)}
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
          w={reconPdfInnerCol(4)}
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
          w={reconPdfInnerCol(5)}
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
          w={reconPdfInnerCol(6)}
          bg={ROW_GRAY}
          align="right"
          bold
          pad={compact.cellPad}
          size={compact.fontSize}
          lineHeight={1.05}
        >
          {String(payload.yellowRow.totalUnits).replace(".", ",")}
        </PdfCell>
        <PdfCell w={reconPdfInnerCol(7)} bg={ROW_GRAY} pad={compact.cellPad} />
        <PdfCell
          w={reconPdfInnerCol(8)}
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
          w={reconPdfInnerCol(9)}
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
  return (
    <View wrap={false} style={{ width: PAGE_INNER }}>
      <InsetRow fromCol={8} toCol={9} minHeight={16}>
        <PdfCell
          w={reconPdfInnerCol(8)}
          bg={HEAD_GRAY}
          align="center"
          bold
          size={6.4}
        >
          Всего к оплате:
        </PdfCell>
        <PdfCell w={reconPdfInnerCol(9)} bg={ROW_GRAY} align="right" bold>
          {formatRubPdf(payload.yellowRow.discountedTotalRub)}
        </PdfCell>
      </InsetRow>
      <InsetRow fromCol={8} toCol={9} minHeight={16}>
        <PdfCell
          w={reconPdfInnerCol(8)}
          bg={HEAD_GRAY}
          align="center"
          bold
          size={6.4}
        >
          В т.ч. Сумма НДС 5%:
        </PdfCell>
        <PdfCell w={reconPdfInnerCol(9)} bg={ROW_GRAY} align="right" bold>
          {formatRubPdf(payload.yellowRow.vatRub)}
        </PdfCell>
      </InsetRow>
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
