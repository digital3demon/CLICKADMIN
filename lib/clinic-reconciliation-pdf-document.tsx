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

/** Строки / поля значений. */
const ROW_GRAY = "#F3F3F3";
/** Шапки и «к оплате». */
const HEAD_GRAY = "#5A5A5A";
const BORDER = "#000000";
const CELL_PAD = 2;

/**
 * A4 landscape = 842pt, paddingHorizontal 16 → 810pt на таблицу.
 * Целые пункты, сумма ровно 810 — иначе Yoga округляет % и вертикали «скачут».
 */
const PAGE_INNER = 810;
const COL_W = [49, 45, 61, 85, 85, 243, 49, 61, 69, 63] as const;

function span(from: number, to: number): number {
  let s = 0;
  for (let i = from; i <= to; i++) s += COL_W[i]!;
  return s;
}

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
    width: PAGE_INNER,
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  summaryWrap: {
    width: 380,
    borderWidth: 1,
    borderColor: BORDER,
  },
  row: {
    flexDirection: "row",
    width: PAGE_INNER,
    alignItems: "stretch",
  },
  mainWrap: {
    width: PAGE_INNER,
    borderWidth: 1,
    borderColor: BORDER,
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
        borderRightWidth: last ? 0 : 1,
        borderRightColor: BORDER,
        justifyContent: "flex-start",
      }}
    >
      <Text
        style={{
          fontSize: size ?? 6.5,
          lineHeight: 1.15,
          textAlign: align ?? "left",
          fontWeight: bold ? 700 : 400,
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
  children,
}: {
  bg?: string;
  lastRow?: boolean;
  minHeight?: number;
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
          borderBottomWidth: lastRow ? 0 : 1,
          borderBottomColor: BORDER,
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
      <PdfCell w={COL_W[0]} align="right" bg={ROW_GRAY}>
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

export function ClinicReconciliationPdfDocument({
  payload,
}: {
  payload: ClinicReconciliationPdfPayload;
}) {
  ensureNotoSansPdfFonts();
  const summaryW = [180, 50, 75, 75] as const;

  return (
    <Document
      title={`Сверка ${payload.clinicTitleLine.slice(0, 80)}`}
      creator="dental-lab-crm"
      language="ru-RU"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.topWrap}>
          <View style={styles.summaryWrap}>
            <View
              wrap={false}
              style={{
                flexDirection: "row",
                backgroundColor: HEAD_GRAY,
                minHeight: 18,
                borderBottomWidth: 1,
                borderBottomColor: BORDER,
              }}
            >
              <PdfCell w={summaryW[0]} bg={HEAD_GRAY} align="center" bold size={5.8}>
                НАИМЕНОВАНИЕ ПОЗИЦИИ
              </PdfCell>
              <PdfCell w={summaryW[1]} bg={HEAD_GRAY} align="center" bold size={5.8}>
                КОЛ-ВО ЕДИНИЦ
              </PdfCell>
              <PdfCell w={summaryW[2]} bg={HEAD_GRAY} align="center" bold size={5.8}>
                СТОИМОСТЬ ЕДИНИЦЫ БЕЗ СКИДОК
              </PdfCell>
              <PdfCell
                w={summaryW[3]}
                last
                bg={HEAD_GRAY}
                align="center"
                bold
                size={5.8}
              >
                СУММА ЕДИНИЦ БЕЗ СКИДОК
              </PdfCell>
            </View>
            {payload.summary.map((row, i) => (
              <View
                key={`s-${i}`}
                wrap={false}
                style={{
                  flexDirection: "row",
                  backgroundColor: ROW_GRAY,
                  minHeight: 15,
                  borderBottomWidth:
                    i === payload.summary.length - 1 ? 0 : 1,
                  borderBottomColor: BORDER,
                }}
              >
                <PdfCell w={summaryW[0]} bg={ROW_GRAY} size={6.2}>
                  {row.label}
                </PdfCell>
                <PdfCell w={summaryW[1]} bg={ROW_GRAY} align="right" size={6.2}>
                  {String(row.quantity).replace(".", ",")}
                </PdfCell>
                <PdfCell w={summaryW[2]} bg={ROW_GRAY} align="right" size={6.2}>
                  {formatRubPdf(row.unitRub)}
                </PdfCell>
                <PdfCell
                  w={summaryW[3]}
                  last
                  bg={ROW_GRAY}
                  align="right"
                  size={6.2}
                >
                  {formatRubPdf(row.totalRub)}
                </PdfCell>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.mainWrap}>
          <GridRow bg={ROW_GRAY} minHeight={20}>
            <PdfCell w={span(0, 2)} bg={ROW_GRAY} align="center" bold>
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

          <GridRow minHeight={16}>
            <View
              style={{
                width: span(0, 7),
                minWidth: span(0, 7),
                maxWidth: span(0, 7),
                flexGrow: 0,
                flexShrink: 0,
              }}
            />
            <PdfCell w={COL_W[8]} bg={HEAD_GRAY} align="center" bold size={6.4}>
              Всего к оплате:
            </PdfCell>
            <PdfCell w={COL_W[9]} last bg={ROW_GRAY} align="right" bold>
              {formatRubPdf(payload.yellowRow.discountedTotalRub)}
            </PdfCell>
          </GridRow>
          <GridRow minHeight={16}>
            <View
              style={{
                width: span(0, 7),
                minWidth: span(0, 7),
                maxWidth: span(0, 7),
                flexGrow: 0,
                flexShrink: 0,
              }}
            />
            <PdfCell w={COL_W[8]} bg={HEAD_GRAY} align="center" bold size={6.4}>
              В т.ч.Сумма НДС 5%:
            </PdfCell>
            <PdfCell w={COL_W[9]} last bg={ROW_GRAY} align="right" bold>
              {formatRubPdf(payload.yellowRow.vatRub)}
            </PdfCell>
          </GridRow>

          <GridRow bg={HEAD_GRAY} minHeight={24}>
            <PdfCell w={COL_W[0]} bg={HEAD_GRAY} align="center" bold size={5.9}>
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
            <PdfCell
              w={COL_W[9]}
              last
              bg={HEAD_GRAY}
              align="center"
              bold
              size={5.9}
            >
              СКИДКА
            </PdfCell>
          </GridRow>

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
