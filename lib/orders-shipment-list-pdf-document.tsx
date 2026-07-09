import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { OrdersShipmentListPdfPayload } from "@/lib/load-orders-shipment-list-pdf";
import { ensureNotoSansPdfFonts } from "@/lib/pdf-noto-fonts";

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSans",
    fontSize: 7,
    padding: 14,
    color: "#111827",
  },
  title: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 7.5,
    color: "#4b5563",
    marginBottom: 8,
  },
  warn: {
    fontSize: 7,
    color: "#b45309",
    marginBottom: 6,
  },
  table: {
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  headRow: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderColor: "#d1d5db",
  },
  cell: {
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderRightWidth: 1,
    borderColor: "#e5e7eb",
  },
  headCell: {
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderRightWidth: 1,
    borderColor: "#d1d5db",
    fontWeight: 700,
    fontSize: 6.5,
  },
  cStatus: { width: "11%" },
  cOrder: { width: "9%" },
  cPatient: { width: "11%" },
  cDoctor: { width: "12%" },
  cClinic: { width: "18%" },
  cComposition: { width: "22%" },
  cAppointment: { width: "17%", borderRightWidth: 0 },
  lastCell: { borderRightWidth: 0 },
  emph: { fontSize: 8.5, fontWeight: 700 },
  muted: { color: "#6b7280" },
  empty: {
    padding: 12,
    textAlign: "center",
    color: "#6b7280",
  },
});

function PdfRow({
  row,
  index,
}: {
  row: OrdersShipmentListPdfPayload["rows"][number];
  index: number;
}) {
  const bg = index % 2 === 1 ? "#f9fafb" : "#ffffff";
  return (
    <View style={[styles.row, { backgroundColor: bg }]}>
      <Text style={[styles.cell, styles.cStatus]}>{row.status}</Text>
      <Text style={[styles.cell, styles.cOrder, styles.emph]}>{row.orderNumber}</Text>
      <Text style={[styles.cell, styles.cPatient, styles.emph]}>{row.patientName}</Text>
      <Text style={[styles.cell, styles.cDoctor]}>{row.doctorName}</Text>
      <Text style={[styles.cell, styles.cClinic]}>{row.clinicLine}</Text>
      <Text style={[styles.cell, styles.cComposition]}>{row.compositionBrief}</Text>
      <Text style={[styles.cell, styles.cAppointment, styles.lastCell]}>
        {row.appointmentLine}
      </Text>
    </View>
  );
}

export function OrdersShipmentListPdfDocument({
  payload,
}: {
  payload: OrdersShipmentListPdfPayload;
}) {
  ensureNotoSansPdfFonts();

  return (
    <Document
      title={payload.title}
      creator="dental-lab-crm"
      language="ru-RU"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>{payload.title}</Text>
        <Text style={styles.subtitle}>
          Печать: {payload.printedAtLabel} · нарядов: {payload.rows.length}
        </Text>
        {payload.truncated ? (
          <Text style={styles.warn}>
            Показаны первые {payload.rows.length} нарядов (лимит выгрузки).
          </Text>
        ) : null}

        {payload.rows.length === 0 ? (
          <Text style={styles.empty}>Нет неотгруженных нарядов в выбранном режиме.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.headRow}>
              <Text style={[styles.headCell, styles.cStatus]}>Статус</Text>
              <Text style={[styles.headCell, styles.cOrder]}>№ наряда</Text>
              <Text style={[styles.headCell, styles.cPatient]}>Пациент</Text>
              <Text style={[styles.headCell, styles.cDoctor]}>Врач</Text>
              <Text style={[styles.headCell, styles.cClinic]}>Клиника</Text>
              <Text style={[styles.headCell, styles.cComposition]}>Состав</Text>
              <Text style={[styles.headCell, styles.cAppointment, styles.lastCell]}>
                Запись
              </Text>
            </View>
            {payload.rows.map((row, i) => (
              <PdfRow key={`${row.orderNumber}-${i}`} row={row} index={i} />
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
