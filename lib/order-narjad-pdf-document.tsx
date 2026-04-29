import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { ensureNotoSansPdfFonts } from "@/lib/pdf-noto-fonts";

export type OrderNarjadPdfProps = {
  printDateFormatted: string;
  createdByLabel: string;
  titleLine: string;
  clientOrderText: string;
  notes: string;
  kaitenUrl: string | null;
  qrDataUrl: string | null;
  /** Текст под пустым QR (если нет URL для кода) */
  qrPlaceholder?: string;
};

function ensureNarjadFonts(): void {
  ensureNotoSansPdfFonts();
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSans",
    fontSize: 8,
    paddingTop: 10,
    paddingBottom: 30,
    paddingHorizontal: 12,
    color: "#111",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  printDate: { fontSize: 7, color: "#333" },
  createdBy: {
    fontSize: 7,
    maxWidth: 200,
    textAlign: "right",
    color: "#333",
  },
  sectionLabel: {
    fontSize: 6.5,
    fontWeight: 700,
    marginBottom: 2,
    color: "#111",
  },
  kanbanBlock: {
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#94a3b8",
  },
  title: {
    fontSize: 9,
    fontWeight: 700,
    lineHeight: 1.3,
  },
  bodyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexGrow: 1,
  },
  textColumn: {
    flex: 1,
    marginRight: 8,
    paddingRight: 2,
  },
  blockBox: {
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    padding: 4,
    marginBottom: 5,
  },
  sectionText: {
    fontSize: 7.5,
    lineHeight: 1.35,
    whiteSpace: "pre-wrap",
  },
  qrWrap: {
    width: 80,
    alignItems: "center",
    paddingTop: 0,
  },
  qrImage: { width: 76, height: 76 },
  qrPlaceholder: {
    fontSize: 6.5,
    color: "#64748b",
    textAlign: "center",
    padding: 4,
    maxWidth: 76,
  },
  footer: {
    position: "absolute",
    bottom: 10,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    fontSize: 6.5,
    color: "#444",
  },
  footerUrl: { flex: 1, paddingRight: 8 },
  footerPage: { fontSize: 7 },
});

export function OrderNarjadPdfDocument({
  printDateFormatted,
  createdByLabel,
  titleLine,
  clientOrderText,
  notes,
  kaitenUrl,
  qrDataUrl,
  qrPlaceholder = "Нет ссылки на карточку Kaiten",
}: OrderNarjadPdfProps) {
  ensureNarjadFonts();
  const clientBlock =
    clientOrderText.trim().length > 0 ? clientOrderText.trim() : "—";
  const notesBlock = notes.trim().length > 0 ? notes.trim() : "—";
  const urlLine = (kaitenUrl ?? "").trim() || "—";

  return (
    <Document
      title={`Наряд ${titleLine.slice(0, 80)}`}
      creator="dental-lab-crm"
      language="ru-RU"
    >
      <Page size="A6" orientation="landscape" style={styles.page}>
        <View style={styles.topRow} fixed>
          <Text style={styles.printDate}>{printDateFormatted}</Text>
          <Text style={styles.createdBy}>
            Занёс: {createdByLabel}
          </Text>
        </View>

        <View style={styles.kanbanBlock}>
          <Text style={styles.title}>{titleLine}</Text>
        </View>

        <View style={styles.bodyRow}>
          <View style={styles.textColumn}>
            <View style={styles.blockBox}>
              <Text style={styles.sectionLabel}>Заказ клиента</Text>
              <Text style={styles.sectionText}>{clientBlock}</Text>
            </View>
            <View style={styles.blockBox}>
              <Text style={styles.sectionLabel}>Комментарии</Text>
              <Text style={styles.sectionText}>{notesBlock}</Text>
            </View>
          </View>
          <View style={styles.qrWrap}>
            {qrDataUrl ? (
              <Image src={qrDataUrl} style={styles.qrImage} />
            ) : (
              <Text style={styles.qrPlaceholder}>{qrPlaceholder}</Text>
            )}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerUrl}>{urlLine}</Text>
          <Text
            style={styles.footerPage}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber}/${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
