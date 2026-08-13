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


if __name__ == "__main__":
    unittest.main()
