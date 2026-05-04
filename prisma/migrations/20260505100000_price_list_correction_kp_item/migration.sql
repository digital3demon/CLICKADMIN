-- Позиция прайса «КП · Коррекция / переделка»: каталог 0 ₽, сумма в строке состава наряда.
INSERT INTO "PriceListItem" (
  "id",
  "priceListId",
  "code",
  "name",
  "priceRub",
  "sortOrder",
  "isActive",
  "description",
  "createdAt",
  "updatedAt"
)
SELECT
  md5(random()::text || pl."id" || clock_timestamp()::text),
  pl."id",
  'КП',
  'Коррекция / переделка',
  0,
  99999,
  true,
  'В каталоге 0 ₽ — укажите цену в строке состава наряда (позиция прайса «КП»).',
  NOW(),
  NOW()
FROM "PriceList" pl
WHERE NOT EXISTS (
  SELECT 1
  FROM "PriceListItem" pi
  WHERE pi."priceListId" = pl."id" AND pi."code" = 'КП'
);
