-- Normalize obvious legacy meal unit aliases to canonical values.
-- Unknown/custom units are preserved as-is.

do $$
declare
  target record;
begin
  for target in
    select table_schema, table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'unit'
      and table_name in (
        'meal_log_items',
        'meal_item_favorites',
        'meal_plan_assignment_meals',
        'client_meal_item_favorites'
      )
  loop
    execute format($fmt$
      update %I.%I
      set unit = case lower(trim(unit))
        when 'g' then 'g'
        when 'gram' then 'g'
        when 'grams' then 'g'
        when 'gm' then 'g'
        when 'gms' then 'g'
        when 'kg' then 'kg'
        when 'kilogram' then 'kg'
        when 'kilograms' then 'kg'
        when 'kgs' then 'kg'
        when 'mg' then 'mg'
        when 'milligram' then 'mg'
        when 'milligrams' then 'mg'
        when 'lb' then 'lb'
        when 'lbs' then 'lb'
        when 'pound' then 'lb'
        when 'pounds' then 'lb'
        when 'oz' then 'oz'
        when 'ounce' then 'oz'
        when 'ounces' then 'oz'
        when 'ml' then 'ml'
        when 'milliliter' then 'ml'
        when 'milliliters' then 'ml'
        when 'millilitre' then 'ml'
        when 'millilitres' then 'ml'
        when 'l' then 'l'
        when 'liter' then 'l'
        when 'liters' then 'l'
        when 'litre' then 'l'
        when 'litres' then 'l'
        when 'tsp' then 'tsp'
        when 'teaspoon' then 'tsp'
        when 'teaspoons' then 'tsp'
        when 'tbsp' then 'tbsp'
        when 'tablespoon' then 'tbsp'
        when 'tablespoons' then 'tbsp'
        when 'cup' then 'cup'
        when 'cups' then 'cup'
        when 'serving' then 'serving'
        when 'servings' then 'serving'
        when 'piece' then 'piece'
        when 'pieces' then 'piece'
        when 'slice' then 'slice'
        when 'slices' then 'slice'
        when 'bowl' then 'bowl'
        when 'bowls' then 'bowl'
        when 'plate' then 'plate'
        when 'plates' then 'plate'
        when 'packet' then 'packet'
        when 'packets' then 'packet'
        when 'scoop' then 'scoop'
        when 'scoops' then 'scoop'
        when 'can' then 'can'
        when 'cans' then 'can'
        when 'bottle' then 'bottle'
        when 'bottles' then 'bottle'
        when 'glass' then 'glass'
        when 'glasses' then 'glass'
        else unit
      end
      where unit is not null
        and lower(trim(unit)) in (
          'g', 'gram', 'grams', 'gm', 'gms',
          'kg', 'kilogram', 'kilograms', 'kgs',
          'mg', 'milligram', 'milligrams',
          'lb', 'lbs', 'pound', 'pounds',
          'oz', 'ounce', 'ounces',
          'ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres',
          'l', 'liter', 'liters', 'litre', 'litres',
          'tsp', 'teaspoon', 'teaspoons',
          'tbsp', 'tablespoon', 'tablespoons',
          'cup', 'cups',
          'serving', 'servings',
          'piece', 'pieces',
          'slice', 'slices',
          'bowl', 'bowls',
          'plate', 'plates',
          'packet', 'packets',
          'scoop', 'scoops',
          'can', 'cans',
          'bottle', 'bottles',
          'glass', 'glasses'
        )
    $fmt$, target.table_schema, target.table_name);
  end loop;
end $$;
