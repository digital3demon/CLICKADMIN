"""Парсинг номера наряда / Kaiten из сырого OCR (без движка)."""

from __future__ import annotations

import unittest

from watch import pick_kaiten_url_from_text, pick_order_number_from_text


class OrderParseTests(unittest.TestCase):
    def test_spaced_cyrillic_around(self) -> None:
        raw = "занес: Вика 2607-377 Оганесян Э. Киселев А.В. Накладки"
        self.assertEqual(pick_order_number_from_text(raw), "2607-377")

    def test_glued_latin_after_number(self) -> None:
        # RapidOCR часто склеивает номер с фамилией латиницей
        raw = "saHec:MapK 7.07.2026,09:57 2607-359KaMpaHOBC.3.KaCMMOBaA.C"
        self.assertEqual(pick_order_number_from_text(raw), "2607-359")

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


if __name__ == "__main__":
    unittest.main()
