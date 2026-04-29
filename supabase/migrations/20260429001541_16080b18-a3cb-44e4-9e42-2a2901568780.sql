
-- 1. Create station_seats table
CREATE TABLE public.station_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(station_id, label)
);

CREATE INDEX idx_station_seats_station ON public.station_seats(station_id);

ALTER TABLE public.station_seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view seats" ON public.station_seats
  FOR SELECT USING (true);

CREATE POLICY "Staff manage seats" ON public.station_seats
  FOR ALL USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- 2. Add seat_id to bookings (nullable — single-capacity stations don't need it)
ALTER TABLE public.bookings
  ADD COLUMN seat_id UUID REFERENCES public.station_seats(id) ON DELETE SET NULL;

CREATE INDEX idx_bookings_seat_overlap ON public.bookings(seat_id, start_time, end_time)
  WHERE seat_id IS NOT NULL;

-- 3. SCORPION = single suite (one booking at a time)
UPDATE public.stations SET capacity = 1 WHERE type = 'pc_scorpion';

-- 4. Generate seats for every multi-capacity station
INSERT INTO public.station_seats (station_id, label, position)
SELECT s.id, 'PC-' || g, g
FROM public.stations s
CROSS JOIN LATERAL generate_series(1, s.capacity) g
WHERE s.capacity > 1
  AND NOT EXISTS (SELECT 1 FROM public.station_seats ss WHERE ss.station_id = s.id);
