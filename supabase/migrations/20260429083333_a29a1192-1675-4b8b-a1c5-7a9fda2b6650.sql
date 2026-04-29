
-- Remove Food and Ramen menu categories and their items
DELETE FROM public.menu_items
WHERE category_id IN (
  SELECT id FROM public.menu_categories WHERE name IN ('Food','Ramen')
);
DELETE FROM public.menu_categories WHERE name IN ('Food','Ramen');

-- Restructure HALL: keep 4, delete HALL5 (and any future extras), rename + set capacity 10
DELETE FROM public.station_seats
WHERE station_id IN (SELECT id FROM public.stations WHERE name = 'HALL5');
DELETE FROM public.bookings
WHERE station_id IN (SELECT id FROM public.stations WHERE name = 'HALL5');
DELETE FROM public.stations WHERE name = 'HALL5';

UPDATE public.stations SET name = 'Заал 1-р хэсэг', capacity = 10 WHERE name = 'HALL1';
UPDATE public.stations SET name = 'Заал 2-р хэсэг', capacity = 10 WHERE name = 'HALL2';
UPDATE public.stations SET name = 'Заал 3-р хэсэг', capacity = 10 WHERE name = 'HALL3';
UPDATE public.stations SET name = 'Заал 4-р хэсэг', capacity = 10 WHERE name = 'HALL4';

-- Rebuild seats for these 4 halls (PC-1 .. PC-10)
DELETE FROM public.station_seats
WHERE station_id IN (
  SELECT id FROM public.stations WHERE name IN ('Заал 1-р хэсэг','Заал 2-р хэсэг','Заал 3-р хэсэг','Заал 4-р хэсэг')
);

INSERT INTO public.station_seats (station_id, label, position, is_active)
SELECT s.id, 'PC-' || g.n, g.n, true
FROM public.stations s
CROSS JOIN generate_series(1,10) AS g(n)
WHERE s.name IN ('Заал 1-р хэсэг','Заал 2-р хэсэг','Заал 3-р хэсэг','Заал 4-р хэсэг');
