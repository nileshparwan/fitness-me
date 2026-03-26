-- ============================================================================
-- Migration: Rename unit-encoded columns to canonical metric names
-- Date: 2026-03-26
--
-- Database always stores metric values. These renames remove unit suffixes from
-- canonical storage columns while keeping the stored values unchanged.
-- ============================================================================

-- body_measurements: circumference columns (stored in cm, suffix removed)
ALTER TABLE public.body_measurements
  RENAME COLUMN waist_cm TO waist;
ALTER TABLE public.body_measurements
  RENAME COLUMN hips_cm TO hips;
ALTER TABLE public.body_measurements
  RENAME COLUMN chest_cm TO chest;
ALTER TABLE public.body_measurements
  RENAME COLUMN neck_cm TO neck;
ALTER TABLE public.body_measurements
  RENAME COLUMN bicep_left_cm TO bicep_left;
ALTER TABLE public.body_measurements
  RENAME COLUMN bicep_right_cm TO bicep_right;
ALTER TABLE public.body_measurements
  RENAME COLUMN thigh_left_cm TO thigh_left;
ALTER TABLE public.body_measurements
  RENAME COLUMN thigh_right_cm TO thigh_right;
ALTER TABLE public.body_measurements
  RENAME COLUMN calf_cm TO calf;

-- profiles: height stored in cm
ALTER TABLE public.profiles
  RENAME COLUMN height_cm TO height;

-- clients: weight and height stored in metric units
ALTER TABLE public.clients
  RENAME COLUMN weight_kg TO weight;
ALTER TABLE public.clients
  RENAME COLUMN height_cm TO height;

-- cardio_sessions: distance stored in km, speed in km/h
ALTER TABLE public.cardio_sessions
  RENAME COLUMN distance_km TO distance;
ALTER TABLE public.cardio_sessions
  RENAME COLUMN avg_speed_kmh TO avg_speed;

-- BMI trigger must reference the existing body_measurements height column.
CREATE OR REPLACE FUNCTION public.trigger_body_measurements_calculate_bmi()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  effective_height numeric;
BEGIN
  effective_height := new.height_cm;
  if effective_height is null and new.user_id is not null then
    select p.height into effective_height
    from public.profiles p
    where p.id = new.user_id;
  end if;

  if new.weight is not null and effective_height is not null and effective_height > 0 then
    new.bmi := round((new.weight / power((effective_height / 100.0), 2))::numeric, 2);
  else
    new.bmi := null;
  end if;

  return new;
END;
$$;

DROP TRIGGER IF EXISTS trg_body_measurements_bmi ON public.body_measurements;
CREATE TRIGGER trg_body_measurements_bmi
BEFORE INSERT OR UPDATE OF weight, height_cm, user_id
ON public.body_measurements
FOR EACH ROW
EXECUTE FUNCTION public.trigger_body_measurements_calculate_bmi();
