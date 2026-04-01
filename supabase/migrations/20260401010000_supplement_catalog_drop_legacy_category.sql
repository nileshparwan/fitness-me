alter table if exists public.supplement_catalog
  drop constraint if exists supplement_catalog_category_check;

alter table if exists public.supplement_catalog
  drop column if exists category;
