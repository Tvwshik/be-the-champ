
-- Add new station types
ALTER TYPE public.station_type ADD VALUE IF NOT EXISTS 'pc_vvip';
ALTER TYPE public.station_type ADD VALUE IF NOT EXISTS 'pc_stage';
ALTER TYPE public.station_type ADD VALUE IF NOT EXISTS 'pc_scorpion';
