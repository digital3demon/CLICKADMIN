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

const CELL_PAD = 2;

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
  topWrap: {
    width: PAGE_INNER,
    flexDirection: "row",
    marginBottom: 0,
  },
  row: {
    flexDirection: "row",
    width: PAGE_INNER,
    alignItems: "stretch",
    overflow: "visible",
  },
  mainWrap: {
    width: PAGE_INNER,
  },
});

function PdfCell({
  w,
  first,
  last,
  box,
  top,
  bg,
  align,
  bold,
  size,
  children,
}: {
  w: number;
  first?: boolean;
  last?: boolean;
  box?: boolean;
  top?: boolean;
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
        // Каждая ячейка — замкнутая рамка. Yoga срезает «только правую»
        // у последней колонки, если опираться на border родителя.
        borderStyle: "solid",
        borderColor: BORDER,
        borderTopWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderLeftWidth: 1,
        justifyContent: "flex-start",
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
  lastRow,
  minHeight,
  top,
  children,
}: {
  bg?: string;
  lastRow?: boolean;
  minHeight?: number;
  top?: boolean;
  children: ReactNode;
}) {
  return (
    <View
      wrap={false}
      style={[
        styles.row,
        {
          backgroundColor: bg,
          minHeight: minHeight ?? 14,
        },
      ]}
    >
      {children}
    </View>
  );
}

function moneyOrDash(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return formatRubPdf(v);
}

function DetailRow({
  line,
  last,
}: {
  line: ReconciliationPdfDetailLine;
  last: boolean;
}) {
  const showMeta = line.showOrderColumns;
  return (
    <GridRow bg={ROW_GRAY} lastRow={last} minHeight={14}>
      <PdfCell w={COL_W[0]} first align="right" bg={ROW_GRAY}>
        {showMeta ? line.zashla : ""}
      </PdfCell>
      <PdfCell w={COL_W[1]} align="right" bg={ROW_GRAY}>
        {showMeta && line.otpr !== "—" ? line.otpr : ""}
      </PdfCell>
      <PdfCell w={COL_W[2]} align="center" bg={ROW_GRAY}>
        {showMeta ? line.orderNumber : ""}
      </PdfCell>
      <PdfCell w={COL_W[3]} align="left" bg={ROW_GRAY}>
        {showMeta ? line.patient : ""}
      </PdfCell>
      <PdfCell w={COL_W[4]} align="left" bg={ROW_GRAY}>
        {showMeta ? line.doctor : ""}
      </PdfCell>
      <PdfCell w={COL_W[5]} align="left" bg={ROW_GRAY}>
        {line.description}
      </PdfCell>
      <PdfCell w={COL_W[6]} align="right" bg={ROW_GRAY}>
        {String(line.quantity).replace(".", ",")}
      </PdfCell>
      <PdfCell w={COL_W[7]} align="right" bg={ROW_GRAY}>
        {moneyOrDash(line.unitRub)}
      </PdfCell>
      <PdfCell w={COL_W[8]} align="right" bg={ROW_GRAY}>
        {formatRubPdf(line.lineTotalRub)}
      </PdfCell>
      <PdfCell w={COL_W[9]} last align="right" bg={ROW_GRAY}>
        {line.discountPercent == null
          ? ""
          : `${String(line.discountPercent).replace(".", ",")}%`}
      </PdfCell>
    </GridRow>
  );
}

function DetailHeaderRow() {
  return (
    <GridRow bg={HEAD_GRAY} minHeight={24} top>
      <PdfCell w={COL_W[0]} first bg={HEAD_GRAY} align="center" bold size={5.9}>
        Число когда зашла работа
      </PdfCell>
      <PdfCell w={COL_W[1]} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Число отправки работы
      </PdfCell>
      <PdfCell w={COL_W[2]} bg={HEAD_GRAY} align="center" bold size={5.9}>
        {`Номер заказ-\nнаряда`}
      </PdfCell>
      <PdfCell w={COL_W[3]} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Пациент
      </PdfCell>
      <PdfCell w={COL_W[4]} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Врач
      </PdfCell>
      <PdfCell w={COL_W[5]} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Выставлено(наименование позиции)
      </PdfCell>
      <PdfCell w={COL_W[6]} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Кол-во единиц
      </PdfCell>
      <PdfCell w={COL_W[7]} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Цена за единицу
      </PdfCell>
      <PdfCell w={COL_W[8]} bg={HEAD_GRAY} align="center" bold size={5.9}>
        Стоим. (Сумма единиц)
      </PdfCell>
      <PdfCell w={COL_W[9]} last bg={HEAD_GRAY} align="center" bold size={5.9}>
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
  const nameW = span(0, 5);
  const qtyW = COL_W[6];
  const unitW = COL_W[7];
  const sumW = span(8, 9);
  return (
    <View style={{ width: PAGE_INNER, marginBottom: 0 }}>
      <GridRow bg={HEAD_GRAY} minHeight={18} top>
        <PdfCell w={nameW} first bg={HEAD_GRAY} align="center" bold size={5.8}>
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
          <PdfCell w={nameW} first bg={ROW_GRAY} size={6.2}>
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
        <PdfCell w={labelW} first box top bg={HEAD_GRAY} align="center" bold size={6.4}>
          Всего к оплате:
        </PdfCell>
        <PdfCell w={valueW} last box top bg={ROW_GRAY} align="right" bold>
          {formatRubPdf(payload.yellowRow.discountedTotalRub)}
        </PdfCell>
      </View>
      <View style={{ flexDirection: "row", width: PAGE_INNER }}>
        <View style={spacer} />
        <PdfCell w={labelW} first box bg={HEAD_GRAY} align="center" bold size={6.4}>
          В т.ч. Сумма НДС 5%:
        </PdfCell>
        <PdfCell w={valueW} last box bg={ROW_GRAY} align="right" bold>
          {formatRubPdf(payload.yellowRow.vatRub)}
        </PdfCell>
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
            pageNumber > 1 ? <DetailHeaderRow /> : <View />
          }
        />
        <SummaryBlock payload={payload} />

        <View style={styles.mainWrap}>
          <GridRow bg={ROW_GRAY} minHeight={20} top>
            <PdfCell w={span(0, 2)} first bg={ROW_GRAY} align="center" bold>
              {payload.labLegalName}
            </PdfCell>
            <PdfCell w={COL_W[3]} bg={ROW_GRAY} align="center" bold>
              {payload.periodFromLabel}
            </PdfCell>
            <PdfCell w={COL_W[4]} bg={ROW_GRAY} align="center" bold>
              {payload.periodToLabel}
            </PdfCell>
            <PdfCell w={COL_W[5]} bg={ROW_GRAY} align="center" bold>
              {payload.clinicTitleLine}
            </PdfCell>
            <PdfCell w={COL_W[6]} bg={ROW_GRAY} align="center" bold>
              {String(payload.yellowRow.totalUnits).replace(".", ",")}
            </PdfCell>
            <PdfCell w={COL_W[7]} bg={ROW_GRAY} />
            <PdfCell w={COL_W[8]} bg={ROW_GRAY} align="center" bold>
              {formatRubPdf(payload.yellowRow.baseTotalRub)}
            </PdfCell>
            <PdfCell w={COL_W[9]} last bg={ROW_GRAY} align="center" bold>
              {formatRubPdf(payload.yellowRow.discountedTotalRub)}
            </PdfCell>
          </GridRow>

          <PayTotalsBlock payload={payload} />

          <DetailHeaderRow />

          {payload.detail.map((line, i) => (
            <DetailRow
              key={`d-${i}`}
              line={line}
              last={i === payload.detail.length - 1}
            />
          ))}
        </View>
      </Page>
    </Document>
  );
}
