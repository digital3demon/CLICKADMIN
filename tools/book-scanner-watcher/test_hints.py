"""Парсинг номера наряда / Kaiten из сырого OCR (без движка)."""

from __future__ import annotations

import unittest

from watch import (
    is_crm_useful_qr,
    is_manufacturer_or_noise_barcode,
    pick_kaiten_url_from_text,
    pick_order_number_from_text,
    pick_preferred_barcode,
)


class OrderParseTests(unittest.TestCase):
    def test_spaced_cyrillic_around(self) -> None:
        raw = "занес: Вика 2607-377 Оганесян Э. Киселев А.В. Накладки"
        self.assertEqual(pick_order_number_from_text(raw), "2607-377")

    def test_glued_latin_after_number(self) -> None:
        # RapidOCR часто склеивает номер с фамилией латиницей
        raw = "saHec:MapK 7.07.2026,09:57 2607-359KaMpaHOBC.3.KaCMMOBaA.C"
        self.assertEqual(pick_order_number_from_text(raw), "2607-359")

    def test_sticker_glued_prefix_letter(self) -> None:
        raw = "KnKHMKS HaCTHOe nMLO Anpec N3ax3a2608-006"
        self.assertEqual(pick_order_number_from_text(raw), "2608-006")

    def test_sticker_glued_prefix_digits(self) -> None:
        # «№ заказа» OCR → хвост цифр перед YYMM
        raw = "aueHTAHTOHOBaE 38x832608-045"
        self.assertEqual(pick_order_number_from_text(raw), "2608-045")
        raw2 = "Xy3VaxMeTOBP N38x8332608-134"
        self.assertEqual(pick_order_number_from_text(raw2), "2608-134")

    def test_sticker_no_hyphen_after_zakaz(self) -> None:
        # OCR глотает тире: «№ заказа 2608306»
        raw = "Клиника Ортодонтическая Пациент Волк В. № заказа 2608306 Адрес Тореза"
        self.assertEqual(pick_order_number_from_text(raw), "2608-306")
        raw2 = "Пациент Барыкина Я. N3aka3a2608246 Доктор Сильницкая"
        self.assertEqual(pick_order_number_from_text(raw2), "2608-246")

    def test_shipping_labels_from_failed_scans(self) -> None:
        self.assertEqual(
            pick_order_number_from_text(
                "Клиника Меди Пациент Белокосова Ю. № заказа 2608-245 Доктор Абдуллаев"
            ),
            "2608-245",
        )
        self.assertEqual(
            pick_order_number_from_text(
                "Клиника Атрибьют РЕМИ Пациент Карлеев П. № заказа 2608-353"
            ),
            "2608-353",
        )
        self.assertEqual(
            pick_order_number_from_text(
                "Клиника Атрибут РЕМИ Пациент Литвинская В. № заказа 2608-356"
            ),
            "2608-356",
        )

    def test_kaiten_ocr_typos(self) -> None:
        raw = "1/1 ittps://clicklab.kaiten.rw/68012438"
        self.assertEqual(
            pick_kaiten_url_from_text(raw),
            "https://clicklab.kaiten.ru/68012438",
        )

    def test_kaiten_clean_url(self) -> None:
        raw = "https://clicklab.kaiten.ru/68026387"
        self.assertEqual(
            pick_kaiten_url_from_text(raw),
            "https://clicklab.kaiten.ru/68026387",
        )


class BarcodePreferTests(unittest.TestCase):
    def test_gs1_datamatrix_is_noise(self) -> None:
        gs1 = "(01)08800028739713(10)250721-LB66(11)250721"
        self.assertTrue(is_manufacturer_or_noise_barcode(gs1))
        self.assertFalse(is_crm_useful_qr(gs1))
        self.assertIsNone(pick_preferred_barcode([gs1]))

    def test_hub_over_gs1(self) -> None:
        gs1 = "(01)08800028739713(10)250721-LB66(11)250721"
        hub = "https://click-lab.online/p/t/demo/s/tok_abc"
        self.assertEqual(pick_preferred_barcode([gs1, hub]), hub)
        self.assertEqual(pick_preferred_barcode([hub, gs1]), hub)

    def test_lot_code_noise(self) -> None:
        self.assertTrue(is_manufacturer_or_noise_barcode("250721-LB66"))
        self.assertFalse(is_manufacturer_or_noise_barcode("2608-164"))

    def test_geo_gs1_from_photo_is_noise(self) -> None:
        gs1 = "(01)08800028717599(10)260429-LS80(11)260429"
        self.assertTrue(is_manufacturer_or_noise_barcode(gs1))
        self.assertIsNone(pick_preferred_barcode([gs1]))

    def test_clickadmin_https_is_not_crm_qr(self) -> None:
        url = "https://clickadmin.ru/l/abc123"
        self.assertFalse(is_crm_useful_qr(url))
        self.assertFalse(is_crm_useful_qr("https://example.com/foo"))

    def test_bare_order_number_qr(self) -> None:
        self.assertTrue(is_crm_useful_qr("2608-306"))
        self.assertTrue(is_crm_useful_qr("2608306"))


class GeoLabelVsStickerTests(unittest.TestCase):
    def test_geo_label_text_does_not_yield_order(self) -> None:
        geo = (
            "Geo Multibase Abutment GM-IFU-KR-03 2025.01.14 "
            "LL2-SURO30-H2 260429-LS80 "
            "(01)08800028717599(10)260429-LS80(11)260429"
        )
        self.assertIsNone(pick_order_number_from_text(geo))

    def test_sticker_order_with_cyrillic_around(self) -> None:
        raw = (
            "Клиника Атрибут РЕМИ Адрес Новочеркасский "
            "Пациент Калашникова Ю. № заказа: 2608-156 Доктор Невский"
        )
        self.assertEqual(pick_order_number_from_text(raw), "2608-156")

    def test_mixed_geo_then_sticker_prefers_order(self) -> None:
        raw = (
            "Geo 260429-LS80 2026.04.29 "
            "Клиника Атрибут РЕМИ Пациент Калашникова Ю. "
            "№ заказа: 2608-156"
        )
        self.assertEqual(pick_order_number_from_text(raw), "2608-156")

    def test_invalid_month_from_date_ignored(self) -> None:
        self.assertIsNone(pick_order_number_from_text("2025-011 Rev.03"))
        self.assertIsNone(pick_order_number_from_text("2026-042 2026.04.29"))


if __name__ == "__main__":
    unittest.main()
