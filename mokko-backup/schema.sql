


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";








ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."design_type" AS ENUM (
    'generic',
    'custom',
    'partner',
    'limited'
);


ALTER TYPE "public"."design_type" OWNER TO "postgres";


CREATE TYPE "public"."order_status" AS ENUM (
    'draft',
    'pending_payment',
    'payment_submitted',
    'paid',
    'in_production',
    'ready',
    'shipped',
    'delivered',
    'cancelled'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


CREATE TYPE "public"."partner_lead_status" AS ENUM (
    'new',
    'contacted',
    'qualified',
    'converted',
    'discarded'
);


ALTER TYPE "public"."partner_lead_status" OWNER TO "postgres";


CREATE TYPE "public"."partner_type" AS ENUM (
    'veterinary',
    'pet_shop',
    'printer',
    'distributor',
    'rescue',
    'groomer',
    'other'
);


ALTER TYPE "public"."partner_type" OWNER TO "postgres";


CREATE TYPE "public"."payment_method" AS ENUM (
    'yape',
    'plin',
    'transfer',
    'cash',
    'other'
);


ALTER TYPE "public"."payment_method" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'submitted',
    'verified',
    'rejected'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."pet_sex_type" AS ENUM (
    'male',
    'female',
    'unknown'
);


ALTER TYPE "public"."pet_sex_type" OWNER TO "postgres";


CREATE TYPE "public"."pet_tag_status" AS ENUM (
    'active',
    'inactive'
);


ALTER TYPE "public"."pet_tag_status" OWNER TO "postgres";


CREATE TYPE "public"."profile_visibility_status" AS ENUM (
    'public',
    'private',
    'lost_mode'
);


ALTER TYPE "public"."profile_visibility_status" OWNER TO "postgres";


CREATE TYPE "public"."report_status" AS ENUM (
    'new',
    'viewed',
    'resolved',
    'dismissed'
);


ALTER TYPE "public"."report_status" OWNER TO "postgres";


CREATE TYPE "public"."role_code" AS ENUM (
    'admin',
    'customer',
    'partner'
);


ALTER TYPE "public"."role_code" OWNER TO "postgres";


CREATE TYPE "public"."sales_channel" AS ENUM (
    'web',
    'whatsapp',
    'partner',
    'manual',
    'presential'
);


ALTER TYPE "public"."sales_channel" OWNER TO "postgres";


CREATE TYPE "public"."scan_source" AS ENUM (
    'nfc',
    'qr',
    'manual',
    'unknown'
);


ALTER TYPE "public"."scan_source" OWNER TO "postgres";


CREATE TYPE "public"."sold_plan_type" AS ENUM (
    'essential',
    'custom',
    'partner_batch',
    'other'
);


ALTER TYPE "public"."sold_plan_type" OWNER TO "postgres";


CREATE TYPE "public"."source_type" AS ENUM (
    'direct',
    'partner',
    'referral',
    'internal'
);


ALTER TYPE "public"."source_type" OWNER TO "postgres";


CREATE TYPE "public"."species_type" AS ENUM (
    'dog',
    'cat',
    'other'
);


ALTER TYPE "public"."species_type" OWNER TO "postgres";


CREATE TYPE "public"."tag_status" AS ENUM (
    'available',
    'reserved',
    'activated',
    'suspended',
    'lost',
    'retired'
);


ALTER TYPE "public"."tag_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."activate_tag_for_pet"("p_tag_code" "text", "p_pet_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_effective_user_id uuid := auth.uid();
  v_tag_id uuid;
  v_tag_status public.tag_status;
  v_tag_plan public.sold_plan_type;
  v_is_fabricated boolean;
  v_pet_owner uuid;
  v_existing_active_pet uuid;
begin
  if v_effective_user_id is null then
    raise exception 'Debes iniciar sesión para activar una placa';
  end if;

  select
    t.id,
    t.status,
    t.sold_plan_type,
    coalesce(t.is_fabricated, false)
  into
    v_tag_id,
    v_tag_status,
    v_tag_plan,
    v_is_fabricated
  from public.tags t
  where t.code = upper(trim(p_tag_code))
  for update;

  if v_tag_id is null then
    raise exception 'Código no encontrado';
  end if;

  if v_tag_status <> 'available' then
    raise exception 'Esta placa ya no está disponible para activación';
  end if;

  if not v_is_fabricated then
    raise exception 'Esta placa aún no fue fabricada y no está lista para activación';
  end if;

  select p.owner_user_id
  into v_pet_owner
  from public.pets p
  where p.id = p_pet_id;

  if v_pet_owner is null then
    raise exception 'Mascota no encontrada';
  end if;

  if v_pet_owner <> v_effective_user_id
     and not public.is_admin(v_effective_user_id) then
    raise exception 'No tienes permisos para activar esta placa en esta mascota';
  end if;

  select pt.pet_id
  into v_existing_active_pet
  from public.pet_tags pt
  where pt.tag_id = v_tag_id
    and pt.status = 'active'
  limit 1;

  if v_existing_active_pet is not null then
    raise exception 'Esta placa ya tiene una asignación activa';
  end if;

  update public.tags
  set
    status = 'activated',
    activated_by_user_id = v_effective_user_id,
    activated_at = now(),
    updated_at = now()
  where id = v_tag_id;

  insert into public.pet_tags (
    pet_id,
    tag_id,
    sold_plan_type,
    is_primary,
    status,
    assigned_at,
    unassigned_at,
    updated_at
  )
  values (
    p_pet_id,
    v_tag_id,
    v_tag_plan,
    false,
    'active',
    now(),
    null,
    now()
  )
  on conflict (pet_id, tag_id) do update
  set
    sold_plan_type = excluded.sold_plan_type,
    is_primary = excluded.is_primary,
    status = excluded.status,
    assigned_at = excluded.assigned_at,
    unassigned_at = excluded.unassigned_at,
    updated_at = excluded.updated_at;

  insert into public.tag_activations (
    tag_id,
    activated_by_user_id,
    pet_id,
    created_at
  )
  values (
    v_tag_id,
    v_effective_user_id,
    p_pet_id,
    now()
  );

  insert into public.pet_profiles (
    pet_id,
    visibility_status,
    allow_found_reports,
    show_phone,
    show_whatsapp,
    show_medical_alerts,
    medical_profile_enabled
  )
  values (
    p_pet_id,
    'public',
    true,
    true,
    true,
    true,
    case when v_tag_plan = 'custom' then true else false end
  )
  on conflict (pet_id) do nothing;

  perform public.refresh_pet_medical_profile_enabled(p_pet_id);

  return jsonb_build_object(
    'success', true,
    'message', 'Placa activada correctamente',
    'tag_id', v_tag_id,
    'pet_id', p_pet_id,
    'sold_plan_type', v_tag_plan
  );
end;
$$;


ALTER FUNCTION "public"."activate_tag_for_pet"("p_tag_code" "text", "p_pet_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_tag_code"("p_tag_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_tag_id uuid;
  v_tag_status public.tag_status;
  v_tag_plan public.sold_plan_type;
  v_is_fabricated boolean;
begin
  if p_tag_code is null or btrim(p_tag_code) = '' then
    return jsonb_build_object(
      'valid', false,
      'message', 'Ingresa un código válido.'
    );
  end if;

  select
    t.id,
    t.status,
    t.sold_plan_type,
    coalesce(t.is_fabricated, false)
  into
    v_tag_id,
    v_tag_status,
    v_tag_plan,
    v_is_fabricated
  from public.tags t
  where t.code = upper(trim(p_tag_code))
  limit 1;

  if v_tag_id is null then
    return jsonb_build_object(
      'valid', false,
      'message', 'Código no encontrado.'
    );
  end if;

  if v_tag_status <> 'available' then
    return jsonb_build_object(
      'valid', false,
      'message', 'La placa no está disponible para activación.',
      'status', v_tag_status,
      'tag_id', v_tag_id,
      'sold_plan_type', v_tag_plan
    );
  end if;

  if not v_is_fabricated then
    return jsonb_build_object(
      'valid', false,
      'message', 'Esta placa aún no fue fabricada y no está lista para activación.',
      'status', v_tag_status,
      'tag_id', v_tag_id,
      'sold_plan_type', v_tag_plan
    );
  end if;

  return jsonb_build_object(
    'valid', true,
    'message', 'Código verificado correctamente.',
    'status', v_tag_status,
    'tag_id', v_tag_id,
    'sold_plan_type', v_tag_plan
  );
end;
$$;


ALTER FUNCTION "public"."check_tag_code"("p_tag_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_guest_orders_for_current_user"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_updated_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Usuario no autenticado.';
  end if;

  v_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));

  if v_email = '' then
    return 0;
  end if;

  update public.orders
  set customer_user_id = v_user_id
  where customer_user_id is null
    and guest_email is not null
    and lower(trim(guest_email)) = v_email;

  get diagnostics v_updated_count = row_count;

  return v_updated_count;
end;
$$;


ALTER FUNCTION "public"."claim_guest_orders_for_current_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_order_with_items"("p_items" "jsonb", "p_guest_name" "text" DEFAULT NULL::"text", "p_guest_email" "text" DEFAULT NULL::"text", "p_guest_phone" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_customer_user_id uuid := auth.uid();
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_custom_data jsonb;
  v_item_index integer := 0;
  v_plan_type text;
  v_design_type text;
  v_quantity integer;
  v_unit_price numeric(10,2);
  v_line_subtotal numeric(10,2);
  v_total numeric(10,2) := 0;
  v_color text;
  v_color_label text;
  v_shape text;
  v_shape_label text;
  v_size_code text;
  v_size_label text;
  v_pet_name text;
begin
  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Debes enviar al menos una placa.';
  end if;

  if v_customer_user_id is null then
    if btrim(coalesce(p_guest_name, '')) = '' then
      raise exception 'Ingresa tu nombre para continuar.';
    end if;

    if btrim(coalesce(p_guest_phone, '')) = '' then
      raise exception 'Ingresa tu teléfono para continuar.';
    end if;
  end if;

  if btrim(coalesce(p_guest_email, '')) <> ''
     and p_guest_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Ingresa un correo válido o déjalo vacío.';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_item_index := v_item_index + 1;
    v_plan_type := lower(coalesce(v_item->>'sold_plan_type', ''));
    v_quantity := coalesce(nullif(v_item->>'quantity', '')::integer, 1);

    if v_plan_type not in ('essential', 'custom') then
      raise exception 'La placa % tiene un tipo inválido.', v_item_index;
    end if;

    if v_quantity <= 0 then
      raise exception 'La placa % tiene una cantidad inválida.', v_item_index;
    end if;

    v_pet_name := nullif(
      btrim(coalesce(v_item #>> '{customization_data,pet_name}', '')),
      ''
    );

    if v_plan_type = 'custom' and v_pet_name is null then
      raise exception 'La placa % requiere el nombre de la mascota.', v_item_index;
    end if;

    v_unit_price := case
      when v_plan_type = 'essential' then 29.00
      when v_plan_type = 'custom' then 39.00
      else 0.00
    end;

    v_total := v_total + (v_unit_price * v_quantity);
  end loop;

  insert into public.orders (
    customer_user_id,
    guest_name,
    guest_email,
    guest_phone,
    sales_channel,
    status,
    subtotal,
    discount_amount,
    shipping_amount,
    total,
    currency,
    notes
  )
  values (
    v_customer_user_id,
    nullif(btrim(coalesce(p_guest_name, '')), ''),
    nullif(btrim(coalesce(p_guest_email, '')), ''),
    nullif(btrim(coalesce(p_guest_phone, '')), ''),
    'web',
    'pending_payment',
    v_total,
    0,
    0,
    v_total,
    'PEN',
    'Pedido generado desde la página web.'
  )
  returning id, order_number
  into v_order_id, v_order_number;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_plan_type := lower(coalesce(v_item->>'sold_plan_type', ''));
    v_quantity := coalesce(nullif(v_item->>'quantity', '')::integer, 1);

    v_unit_price := case
      when v_plan_type = 'essential' then 29.00
      when v_plan_type = 'custom' then 39.00
      else 0.00
    end;

    v_line_subtotal := v_unit_price * v_quantity;

    v_design_type := case
      when v_plan_type = 'custom' then 'custom'
      else 'generic'
    end;

    v_custom_data := coalesce(v_item->'customization_data', '{}'::jsonb);

    v_color := lower(coalesce(nullif(v_custom_data->>'color', ''), 'white'));

    v_color_label := case v_color
      when 'white' then 'Blanco'
      when 'black' then 'Negro'
      when 'green' then 'Verde'
      else 'Blanco'
    end;

    v_shape := case
      when v_plan_type = 'essential' then 'circle'
      else lower(coalesce(nullif(v_custom_data->>'shape', ''), 'circle'))
    end;

    v_shape_label := case v_shape
      when 'circle' then 'Circular'
      when 'bone' then 'Huesito'
      else 'Circular'
    end;

    v_size_code := case
      when v_plan_type = 'essential' then 'S'
      else coalesce(
        nullif(v_custom_data->>'size_code', ''),
        nullif(v_custom_data->>'size', ''),
        'S'
      )
    end;

    v_size_label := case
      when v_plan_type = 'essential' then '3 cm diámetro'
      else coalesce(
        nullif(v_custom_data->>'size_label', ''),
        nullif(v_custom_data->>'size', ''),
        'S'
      )
    end;

    v_pet_name := case
      when v_plan_type = 'custom' then
        nullif(btrim(coalesce(v_custom_data->>'pet_name', '')), '')
      else null
    end;

    insert into public.order_items (
      order_id,
      sold_plan_type,
      design_type,
      quantity,
      unit_price,
      subtotal,
      notes,
      customization_data
    )
    values (
      v_order_id,
      v_plan_type::public.sold_plan_type,
      v_design_type::public.design_type,
      v_quantity,
      v_unit_price,
      v_line_subtotal,
      null,
      v_custom_data ||
      jsonb_build_object(
        'plan_type', v_plan_type,
        'plan_label', case when v_plan_type = 'essential' then 'Essential' else 'Custom' end,
        'color', v_color,
        'color_label', v_color_label,
        'shape', v_shape,
        'shape_label', v_shape_label,
        'size_code', v_size_code,
        'size_label', v_size_label,
        'pet_name', v_pet_name,
        'constraints',
          case
            when v_plan_type = 'essential' then
              jsonb_build_object(
                'fixed_shape', true,
                'fixed_shape_label', 'Circular',
                'fixed_size', true,
                'fixed_size_label', '3 cm diámetro',
                'fixed_logo_color', '#E8C547'
              )
            else
              jsonb_build_object(
                'fixed_logo_color', '#E8C547'
              )
          end
      )
    );
  end loop;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_total,
    'total', v_total
  );
end;
$_$;


ALTER FUNCTION "public"."create_order_with_items"("p_items" "jsonb", "p_guest_name" "text", "p_guest_email" "text", "p_guest_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_order_number"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_next_num bigint;
begin
  v_next_num := nextval('public.order_number_seq');
  return 'MK-' || lpad(v_next_num::text, 6, '0');
end;
$$;


ALTER FUNCTION "public"."generate_order_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_tag_batch"("p_count" integer, "p_batch_code" "text" DEFAULT 'INITIAL-2026-01'::"text", "p_sold_plan_type" "public"."sold_plan_type" DEFAULT 'essential'::"public"."sold_plan_type", "p_source_type" "public"."source_type" DEFAULT 'internal'::"public"."source_type") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_inserted integer := 0;
  v_code text;
  v_batch_code text;
begin
  if p_count is null or p_count <= 0 then
    raise exception 'La cantidad debe ser mayor a 0';
  end if;

  v_batch_code := coalesce(nullif(trim(p_batch_code), ''), 'INITIAL-2026-01');

  while v_inserted < p_count loop
    v_code := public.generate_tag_code(6);

    insert into public.tags (
      code,
      status,
      sold_plan_type,
      batch_code,
      source_type,
      is_fabricated,
      fabricated_at
    )
    values (
      v_code,
      'available',
      p_sold_plan_type,
      v_batch_code,
      p_source_type,
      false,
      null
    )
    on conflict (code) do nothing;

    if found then
      v_inserted := v_inserted + 1;
    end if;
  end loop;

  return v_inserted;
end;
$$;


ALTER FUNCTION "public"."generate_tag_batch"("p_count" integer, "p_batch_code" "text", "p_sold_plan_type" "public"."sold_plan_type", "p_source_type" "public"."source_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_tag_code"("code_length" integer DEFAULT 6) RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  if code_length < 1 then
    raise exception 'code_length debe ser >= 1';
  end if;

  for i in 1..code_length loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;

  return result;
end;
$$;


ALTER FUNCTION "public"."generate_tag_code"("code_length" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_tag_code"("code_length" integer) IS 'Genera códigos legibles excluyendo 0, O, 1, I. El 5 se mantiene.';



CREATE OR REPLACE FUNCTION "public"."get_geo_divisions"("p_country_id" "uuid", "p_parent_id" "uuid" DEFAULT NULL::"uuid", "p_level" smallint DEFAULT NULL::smallint) RETURNS TABLE("id" "uuid", "country_id" "uuid", "parent_id" "uuid", "level" smallint, "code" "text", "name" "text", "division_type" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select
    gd.id,
    gd.country_id,
    gd.parent_id,
    gd.level,
    gd.code,
    gd.name,
    gd.division_type
  from public.geo_divisions gd
  where gd.is_active = true
    and gd.country_id = p_country_id
    and (
      (p_parent_id is null and gd.parent_id is null)
      or gd.parent_id = p_parent_id
    )
    and (p_level is null or gd.level = p_level)
  order by gd.name asc
$$;


ALTER FUNCTION "public"."get_geo_divisions"("p_country_id" "uuid", "p_parent_id" "uuid", "p_level" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pet_breeds"("p_species" "public"."species_type") RETURNS TABLE("id" "uuid", "species" "public"."species_type", "name" "text", "slug" "text", "is_mixed" boolean)
    LANGUAGE "sql" STABLE
    AS $$
  select
    pb.id,
    pb.species,
    pb.name,
    pb.slug,
    pb.is_mixed
  from public.pet_breeds pb
  where pb.is_active = true
    and pb.species = p_species
  order by pb.is_mixed desc, pb.name asc
$$;


ALTER FUNCTION "public"."get_pet_breeds"("p_species" "public"."species_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pet_extended"("p_pet_id" "uuid") RETURNS TABLE("id" "uuid", "owner_user_id" "uuid", "name" "text", "species" "public"."species_type", "breed_id" "uuid", "breed_name" "text", "breed_custom" "text", "sex" "text", "color" "text", "birthdate" "date", "weight_kg" numeric, "photo_url" "text", "notes" "text", "is_active" boolean)
    LANGUAGE "sql" STABLE
    AS $$
  select
    p.id,
    p.owner_user_id,
    p.name,
    p.species,
    p.breed_id,
    pb.name as breed_name,
    p.breed_custom,
    p.sex,
    p.color,
    p.birthdate,
    p.weight_kg,
    p.photo_url,
    p.notes,
    p.is_active
  from public.pets p
  left join public.pet_breeds pb on pb.id = p.breed_id
  where p.id = p_pet_id
$$;


ALTER FUNCTION "public"."get_pet_extended"("p_pet_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_profile_location"("p_user_id" "uuid") RETURNS TABLE("profile_id" "uuid", "country_id" "uuid", "country_name" "text", "division_level_1_id" "uuid", "division_level_1_name" "text", "division_level_2_id" "uuid", "division_level_2_name" "text", "division_level_3_id" "uuid", "division_level_3_name" "text", "address_line" "text")
    LANGUAGE "sql" STABLE
    AS $$
  select
    p.id as profile_id,
    c.id as country_id,
    c.name as country_name,
    d1.id as division_level_1_id,
    d1.name as division_level_1_name,
    d2.id as division_level_2_id,
    d2.name as division_level_2_name,
    d3.id as division_level_3_id,
    d3.name as division_level_3_name,
    p.address_line
  from public.profiles p
  left join public.countries c on c.id = p.country_id
  left join public.geo_divisions d1 on d1.id = p.division_level_1_id
  left join public.geo_divisions d2 on d2.id = p.division_level_2_id
  left join public.geo_divisions d3 on d3.id = p.division_level_3_id
  where p.id = p_user_id
$$;


ALTER FUNCTION "public"."get_profile_location"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_app_config"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    jsonb_object_agg(ac.key, ac.value),
    '{}'::jsonb
  )
  from public.app_config ac
  where ac.is_public = true;
$$;


ALTER FUNCTION "public"."get_public_app_config"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_public_app_config"() IS 'Devuelve solo las claves públicas de app_config como JSON.';



CREATE OR REPLACE FUNCTION "public"."get_public_pet_profile_by_tag_code"("p_tag_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_tag record;
  v_pet record;
  v_profile record;
  v_owner record;
  v_medical record;
  v_msg_public text;
  v_msg_private text;
  v_breed_label text;
  v_visibility public.profile_visibility_status;
  v_can_show_medical boolean := false;
begin
  select value
  into v_msg_public
  from public.app_config
  where key = 'profile_message_public';

  v_msg_public := coalesce(
    v_msg_public,
    'Si encontraste a esta mascota, por favor contacta a su dueño.'
  );

  select value
  into v_msg_private
  from public.app_config
  where key = 'profile_message_private';

  v_msg_private := coalesce(
    v_msg_private,
    'Este perfil es privado. Puedes enviar tu ubicación o un reporte para ayudar a contactar a su familia.'
  );

  select
    t.id,
    t.code,
    t.status,
    t.sold_plan_type,
    t.retired_reason,
    t.lost_message
  into v_tag
  from public.tags t
  where t.code = upper(trim(p_tag_code));

  if v_tag.id is null then
    return jsonb_build_object(
      'success', false,
      'message', 'Código no encontrado',
      'not_found', true
    );
  end if;

  if v_tag.status in ('suspended', 'lost', 'retired') then
    return jsonb_build_object(
      'success', true,
      'tag_id', v_tag.id,
      'tag_code', v_tag.code,
      'tag_status', v_tag.status,
      'tag_lost_message',
        case
          when v_tag.status = 'lost' then v_tag.lost_message
          else null
        end,
      'sold_plan_type', v_tag.sold_plan_type,
      'is_assigned', false,
      'message',
        case
          when v_tag.status = 'suspended' then 'Esta placa está suspendida temporalmente.'
          when v_tag.status = 'lost' then 'Esta placa fue reportada como extraviada.'
          when v_tag.status = 'retired' then 'Esta placa fue retirada.'
          else 'Esta placa no está disponible.'
        end,
      'retired_reason', v_tag.retired_reason
    );
  end if;

  select
    p.id,
    p.owner_user_id,
    p.name,
    p.species,
    p.sex,
    p.color,
    p.photo_url,
    p.breed_custom,
    pb.name as breed_name,
    pb.name_es as breed_name_es
  into v_pet
  from public.pet_tags pt
  join public.pets p
    on p.id = pt.pet_id
  left join public.pet_breeds pb
    on pb.id = p.breed_id
  where pt.tag_id = v_tag.id
    and pt.status = 'active'
  order by pt.is_primary desc, pt.assigned_at desc
  limit 1;

  if v_pet.id is null then
    return jsonb_build_object(
      'success', true,
      'tag_id', v_tag.id,
      'tag_code', v_tag.code,
      'tag_status', v_tag.status,
      'tag_lost_message', null,
      'sold_plan_type', v_tag.sold_plan_type,
      'is_assigned', false,
      'message', 'Esta placa no tiene una mascota activa asociada.'
    );
  end if;

  select *
  into v_profile
  from public.pet_profiles
  where pet_id = v_pet.id;

  select *
  into v_owner
  from public.profiles
  where id = v_pet.owner_user_id;

  select *
  into v_medical
  from public.pet_medical_profiles
  where pet_id = v_pet.id;

  v_visibility := coalesce(
    v_profile.visibility_status,
    'public'::public.profile_visibility_status
  );

  v_breed_label := coalesce(
    nullif(btrim(v_pet.breed_custom), ''),
    nullif(btrim(coalesce(v_pet.breed_name_es, v_pet.breed_name)), ''),
    null
  );

  v_can_show_medical :=
    v_visibility <> 'private'
    and coalesce(v_profile.medical_profile_enabled, false)
    and coalesce(v_profile.show_medical_alerts, true);

  return jsonb_build_object(
    'success', true,
    'tag_id', v_tag.id,
    'tag_code', v_tag.code,
    'tag_status', v_tag.status,
    'tag_lost_message', null,
    'sold_plan_type', v_tag.sold_plan_type,
    'is_assigned', true,
    'visibility_status', v_visibility,

    'pet', jsonb_build_object(
      'id', v_pet.id,
      'name', v_pet.name,
      'species',
        case
          when v_visibility = 'private' then null
          else v_pet.species
        end,
      'breed',
        case
          when v_visibility = 'private' then null
          else v_breed_label
        end,
      'sex',
        case
          when v_visibility = 'private' then null
          else v_pet.sex
        end,
      'color',
        case
          when v_visibility = 'private' then null
          else v_pet.color
        end,
      'photo_url', v_pet.photo_url
    ),

    'profile', jsonb_build_object(
      'message',
        case
          when v_visibility = 'lost_mode'
            then coalesce(v_profile.lost_mode_message, v_msg_public)
          when v_visibility = 'private'
            then v_msg_private
          else
            v_msg_public
        end,
      'lost_mode_message',
        case
          when v_visibility = 'lost_mode'
            then v_profile.lost_mode_message
          else
            null
        end,
      'emergency_message',
        case
          when v_can_show_medical then v_profile.emergency_message
          else null
        end,
      'allow_found_reports', coalesce(v_profile.allow_found_reports, true),
      'lost_mode_activated_at', v_profile.lost_mode_activated_at
    ),

    'owner', jsonb_build_object(
      'full_name',
        case
          when v_visibility = 'private' then null
          when coalesce(v_profile.show_owner_name, false) then v_owner.full_name
          else null
        end,
      'phone',
        case
          when v_visibility = 'private' then null
          when coalesce(v_profile.show_phone, true) then v_owner.phone
          else null
        end,
      'whatsapp_phone',
        case
          when v_visibility = 'private' then null
          when coalesce(v_profile.show_whatsapp, true)
            then coalesce(v_owner.whatsapp_phone, v_owner.phone)
          else null
        end,
      'address_text',
        case
          when v_visibility = 'private' then null
          when coalesce(v_profile.show_address, false) then v_profile.address_text
          else null
        end
    ),

    'medical', jsonb_build_object(
      'enabled',
        case
          when v_visibility = 'private' then false
          else coalesce(v_profile.medical_profile_enabled, false)
        end,
      'sterilized',
        case
          when v_can_show_medical then v_medical.sterilized
          else null
        end,
      'allergies_text',
        case
          when v_can_show_medical then v_medical.allergies_text
          else null
        end,
      'conditions_text',
        case
          when v_can_show_medical then v_medical.conditions_text
          else null
        end,
      'medications_text',
        case
          when v_can_show_medical then v_medical.medications_text
          else null
        end,
      'dietary_notes',
        case
          when v_can_show_medical then v_medical.dietary_notes
          else null
        end,
      'vaccinations',
        case
          when v_can_show_medical then
            coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'id', pv.id,
                    'vaccine_name', vt.name,
                    'applied_at', pv.applied_on,
                    'next_due_at', pv.expires_on,
                    'dose_number', pv.dose_number,
                    'notes', pv.notes
                  )
                  order by pv.applied_on desc nulls last, pv.created_at desc, pv.id desc
                )
                from public.pet_vaccinations pv
                join public.vaccine_types vt
                  on vt.id = pv.vaccine_type_id
                where pv.pet_id = v_pet.id
              ),
              '[]'::jsonb
            )
          else
            '[]'::jsonb
        end
    )
  );
end;
$$;


ALTER FUNCTION "public"."get_public_pet_profile_by_tag_code"("p_tag_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_public_pet_profile_by_tag_code"("p_tag_code" "text") IS 'Vista pública final del perfil por código de placa. public/private usan mensaje global; lost_mode usa mensaje personalizado obligatorio.';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
begin
  insert into public.profiles as p (
    id,
    full_name,
    email,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), '')
    ),
    new.email,
    now(),
    now()
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(p.full_name, excluded.full_name),
    updated_at = now();

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r
      on r.id = ur.role_id
    where ur.user_id = coalesce(p_user_id, auth.uid())
      and r.code = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin"("p_user_id" "uuid") IS 'Devuelve true si el usuario tiene rol admin. Uso interno para RLS y RPC.';



CREATE OR REPLACE FUNCTION "public"."mark_tag_as_lost"("p_tag_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update public.tags
  set
    status = 'lost',
    updated_at = now()
  where id = p_tag_id;

  perform public.unassign_tag_from_pet(p_tag_id);
end;
$$;


ALTER FUNCTION "public"."mark_tag_as_lost"("p_tag_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_tag_as_suspended"("p_tag_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update public.tags
  set
    status = 'suspended',
    updated_at = now()
  where id = p_tag_id;

  perform public.unassign_tag_from_pet(p_tag_id);
end;
$$;


ALTER FUNCTION "public"."mark_tag_as_suspended"("p_tag_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_order_totals"("p_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_items_subtotal numeric(10,2);
begin
  if p_order_id is null then
    return;
  end if;

  select coalesce(sum(oi.subtotal), 0)::numeric(10,2)
  into v_items_subtotal
  from public.order_items oi
  where oi.order_id = p_order_id;

  update public.orders o
  set
    subtotal = v_items_subtotal,
    total = greatest(
      0,
      v_items_subtotal
      - coalesce(o.discount_amount, 0)
      + coalesce(o.shipping_amount, 0)
    ),
    updated_at = now()
  where o.id = p_order_id;
end;
$$;


ALTER FUNCTION "public"."recalculate_order_totals"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_pet_medical_profile_enabled"("p_pet_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_medical_enabled boolean := false;
begin
  if p_pet_id is null then
    return;
  end if;

  select exists (
    select 1
    from public.tag_activations ta
    join public.tags t
      on t.id = ta.tag_id
    where ta.pet_id = p_pet_id
      and t.sold_plan_type = 'custom'::public.sold_plan_type
  )
  into v_medical_enabled;

  insert into public.pet_profiles (
    pet_id,
    visibility_status,
    allow_found_reports,
    show_phone,
    show_whatsapp,
    show_medical_alerts,
    medical_profile_enabled
  )
  values (
    p_pet_id,
    'public',
    true,
    true,
    true,
    true,
    v_medical_enabled
  )
  on conflict (pet_id) do update
  set
    medical_profile_enabled = excluded.medical_profile_enabled;
end;
$$;


ALTER FUNCTION "public"."refresh_pet_medical_profile_enabled"("p_pet_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."retire_tag"("p_tag_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update public.tags
  set
    status = 'retired',
    retired_reason = p_reason,
    updated_at = now()
  where id = p_tag_id;

  perform public.unassign_tag_from_pet(p_tag_id);
end;
$$;


ALTER FUNCTION "public"."retire_tag"("p_tag_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_lost_mode_activated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if new.visibility_status = 'lost_mode' then
    if tg_op = 'INSERT' or old.visibility_status is distinct from 'lost_mode' then
      new.lost_mode_activated_at := coalesce(new.lost_mode_activated_at, now());
    end if;
  else
    new.lost_mode_activated_at := null;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."set_lost_mode_activated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_my_primary_pet_tag"("p_pet_tag_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_pet_id uuid;
  v_tag_status public.tag_status;
  v_pet_tag_status public.pet_tag_status;
begin
  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'message', 'No hay sesión activa.'
    );
  end if;

  select
    pt.pet_id,
    t.status,
    pt.status
  into
    v_pet_id,
    v_tag_status,
    v_pet_tag_status
  from public.pet_tags pt
  join public.pets p
    on p.id = pt.pet_id
  join public.tags t
    on t.id = pt.tag_id
  where pt.id = p_pet_tag_id
    and p.owner_user_id = v_user_id
  limit 1;

  if v_pet_id is null then
    return jsonb_build_object(
      'success', false,
      'message', 'No se encontró la placa vinculada a tu cuenta.'
    );
  end if;

  if v_pet_tag_status <> 'active'::public.pet_tag_status then
    return jsonb_build_object(
      'success', false,
      'message', 'Solo puedes marcar como principal una placa activa.'
    );
  end if;

  if v_tag_status <> 'activated'::public.tag_status then
    return jsonb_build_object(
      'success', false,
      'message', 'Solo puedes marcar como principal una placa activada.'
    );
  end if;

  update public.pet_tags
  set is_primary = false,
      updated_at = now()
  where pet_id = v_pet_id
    and status = 'active'::public.pet_tag_status
    and is_primary = true;

  update public.pet_tags
  set is_primary = true,
      updated_at = now()
  where id = p_pet_tag_id;

  return jsonb_build_object(
    'success', true,
    'message', 'Placa principal actualizada correctamente.'
  );
end;
$$;


ALTER FUNCTION "public"."set_my_primary_pet_tag"("p_pet_tag_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_order_item_subtotal"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  new.subtotal := round(
    (coalesce(new.quantity, 0)::numeric * coalesce(new.unit_price, 0)::numeric),
    2
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."set_order_item_subtotal"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_order_number_if_null"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if new.order_number is null or btrim(new.order_number) = '' then
    new.order_number := public.generate_order_number();
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."set_order_number_if_null"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_pet_tags_sold_plan_type_from_tags"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.tag_id is null then
    return new;
  end if;

  select t.sold_plan_type
    into new.sold_plan_type
  from public.tags t
  where t.id = new.tag_id;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_pet_tags_sold_plan_type_from_tags"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_recalculate_order_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    perform public.recalculate_order_totals(new.order_id);
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.recalculate_order_totals(old.order_id);
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.order_id is distinct from new.order_id then
      perform public.recalculate_order_totals(old.order_id);
      perform public.recalculate_order_totals(new.order_id);
    else
      perform public.recalculate_order_totals(new.order_id);
    end if;
    return new;
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."trg_recalculate_order_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_refresh_pet_medical_profile_enabled"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_pet_medical_profile_enabled(old.pet_id);
    return null;
  end if;

  perform public.refresh_pet_medical_profile_enabled(new.pet_id);

  if tg_op = 'UPDATE' and old.pet_id is distinct from new.pet_id then
    perform public.refresh_pet_medical_profile_enabled(old.pet_id);
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."trg_refresh_pet_medical_profile_enabled"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unassign_tag_from_pet"("p_tag_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_pet_id uuid;
begin
  select pt.pet_id
  into v_pet_id
  from public.pet_tags pt
  where pt.tag_id = p_tag_id
    and pt.status = 'active'
  limit 1;

  update public.pet_tags
  set
    status = 'inactive',
    unassigned_at = now(),
    updated_at = now()
  where tag_id = p_tag_id
    and status = 'active';

  if v_pet_id is not null then
    perform public.refresh_pet_medical_profile_enabled(v_pet_id);
  end if;
end;
$$;


ALTER FUNCTION "public"."unassign_tag_from_pet"("p_tag_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_my_tag_status"("p_pet_tag_id" "uuid", "p_new_status" "public"."tag_status", "p_lost_message" "text" DEFAULT NULL::"text", "p_retired_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_pet_id uuid;
  v_tag_id uuid;
  v_current_tag_status public.tag_status;
  v_pet_tag_status public.pet_tag_status;
  v_was_primary boolean;
  v_replacement_pet_tag_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'message', 'No hay sesión activa.'
    );
  end if;

  if p_new_status not in (
    'activated'::public.tag_status,
    'suspended'::public.tag_status,
    'lost'::public.tag_status,
    'retired'::public.tag_status
  ) then
    return jsonb_build_object(
      'success', false,
      'message', 'Estado no permitido para el usuario.'
    );
  end if;

  select
    pt.pet_id,
    pt.tag_id,
    pt.status,
    pt.is_primary,
    t.status
  into
    v_pet_id,
    v_tag_id,
    v_pet_tag_status,
    v_was_primary,
    v_current_tag_status
  from public.pet_tags pt
  join public.pets p
    on p.id = pt.pet_id
  join public.tags t
    on t.id = pt.tag_id
  where pt.id = p_pet_tag_id
    and p.owner_user_id = v_user_id
  limit 1;

  if v_pet_id is null or v_tag_id is null then
    return jsonb_build_object(
      'success', false,
      'message', 'No se encontró la placa vinculada a tu cuenta.'
    );
  end if;

  if v_pet_tag_status <> 'active'::public.pet_tag_status then
    return jsonb_build_object(
      'success', false,
      'message', 'Solo puedes gestionar placas activas en tu cuenta.'
    );
  end if;

  if v_current_tag_status = 'retired'::public.tag_status
     and p_new_status <> 'retired'::public.tag_status then
    return jsonb_build_object(
      'success', false,
      'message', 'Una placa retirada no puede reactivarse.'
    );
  end if;

  update public.tags
  set
    status = p_new_status,
    lost_message = case
      when p_new_status = 'lost'::public.tag_status
        then nullif(trim(p_lost_message), '')
      when p_new_status = 'activated'::public.tag_status
        then null
      else lost_message
    end,
    retired_reason = case
      when p_new_status = 'retired'::public.tag_status
        then coalesce(nullif(trim(p_retired_reason), ''), retired_reason, 'Retirada por el usuario')
      else retired_reason
    end,
    updated_at = now()
  where id = v_tag_id;

  -- Si deja de estar activa operativamente, ya no debe quedar como principal
  if p_new_status in (
    'suspended'::public.tag_status,
    'lost'::public.tag_status,
    'retired'::public.tag_status
  ) then
    update public.pet_tags
    set is_primary = false,
        updated_at = now()
    where id = p_pet_tag_id;
  end if;

  -- Si la principal salió de circulación, buscar reemplazo automático
  if v_was_primary and p_new_status in (
    'suspended'::public.tag_status,
    'lost'::public.tag_status,
    'retired'::public.tag_status
  ) then
    select pt.id
    into v_replacement_pet_tag_id
    from public.pet_tags pt
    join public.tags t
      on t.id = pt.tag_id
    where pt.pet_id = v_pet_id
      and pt.id <> p_pet_tag_id
      and pt.status = 'active'::public.pet_tag_status
      and t.status = 'activated'::public.tag_status
    order by pt.assigned_at asc, pt.created_at asc
    limit 1;

    if v_replacement_pet_tag_id is not null then
      update public.pet_tags
      set is_primary = true,
          updated_at = now()
      where id = v_replacement_pet_tag_id;
    end if;
  end if;

  -- Si la placa vuelve a activated y no hay principal, asignarla como principal
  if p_new_status = 'activated'::public.tag_status then
    if not exists (
      select 1
      from public.pet_tags pt
      where pt.pet_id = v_pet_id
        and pt.status = 'active'::public.pet_tag_status
        and pt.is_primary = true
    ) then
      update public.pet_tags
      set is_primary = true,
          updated_at = now()
      where id = p_pet_tag_id;
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'message', 'Estado de la placa actualizado correctamente.',
    'status', p_new_status
  );
end;
$$;


ALTER FUNCTION "public"."update_my_tag_status"("p_pet_tag_id" "uuid", "p_new_status" "public"."tag_status", "p_lost_message" "text", "p_retired_reason" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "text",
    "description" "text",
    "is_public" boolean DEFAULT false NOT NULL,
    "updated_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."app_config" IS 'Configuración global editable desde el panel admin.';



CREATE TABLE IF NOT EXISTS "public"."countries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "iso2" character(2) NOT NULL,
    "iso3" character(3),
    "name" "text" NOT NULL,
    "phone_code" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."countries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."found_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "pet_id" "uuid",
    "reporter_name" "text",
    "reporter_phone" "text",
    "note" "text",
    "location_lat" numeric(9,6),
    "location_lng" numeric(9,6),
    "location_text" "text",
    "source" "public"."scan_source" DEFAULT 'unknown'::"public"."scan_source" NOT NULL,
    "status" "public"."report_status" DEFAULT 'new'::"public"."report_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "viewed_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "scan_event_id" "uuid",
    CONSTRAINT "chk_found_reports_lat_range" CHECK ((("location_lat" IS NULL) OR (("location_lat" >= ('-90'::integer)::numeric) AND ("location_lat" <= (90)::numeric)))),
    CONSTRAINT "chk_found_reports_lng_range" CHECK ((("location_lng" IS NULL) OR (("location_lng" >= ('-180'::integer)::numeric) AND ("location_lng" <= (180)::numeric))))
);


ALTER TABLE "public"."found_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."geo_divisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "country_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "level" smallint NOT NULL,
    "code" "text",
    "name" "text" NOT NULL,
    "division_type" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "geo_divisions_level_check" CHECK ((("level" >= 1) AND ("level" <= 4)))
);


ALTER TABLE "public"."geo_divisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "sold_plan_type" "public"."sold_plan_type" NOT NULL,
    "design_type" "public"."design_type" DEFAULT 'generic'::"public"."design_type" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2) DEFAULT 0 NOT NULL,
    "subtotal" numeric(10,2) DEFAULT 0 NOT NULL,
    "assigned_tag_id" "uuid",
    "fulfillment_partner_id" "uuid",
    "customization_data" "jsonb",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_order_items_subtotal_nonnegative" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "chk_order_items_unit_price_nonnegative" CHECK (("unit_price" >= (0)::numeric)),
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."order_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."order_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" "text" NOT NULL,
    "customer_user_id" "uuid",
    "guest_name" "text",
    "guest_email" "text",
    "guest_phone" "text",
    "sales_channel" "public"."sales_channel" DEFAULT 'web'::"public"."sales_channel" NOT NULL,
    "referral_code_id" "uuid",
    "partner_id" "uuid",
    "status" "public"."order_status" DEFAULT 'pending_payment'::"public"."order_status" NOT NULL,
    "subtotal" numeric(10,2) DEFAULT 0 NOT NULL,
    "discount_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "shipping_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "total" numeric(10,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'PEN'::"text" NOT NULL,
    "notes" "text",
    "confirmed_at" timestamp with time zone,
    "whatsapp_thread" "text",
    "created_by_admin_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_orders_discount_nonnegative" CHECK (("discount_amount" >= (0)::numeric)),
    CONSTRAINT "chk_orders_shipping_nonnegative" CHECK (("shipping_amount" >= (0)::numeric)),
    CONSTRAINT "chk_orders_subtotal_nonnegative" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "chk_orders_total_nonnegative" CHECK (("total" >= (0)::numeric))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partner_leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_name" "text" NOT NULL,
    "contact_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "city" "text",
    "partner_type" "public"."partner_type",
    "estimated_volume" "text",
    "message" "text",
    "status" "public"."partner_lead_status" DEFAULT 'new'::"public"."partner_lead_status" NOT NULL,
    "source" "text" DEFAULT 'landing'::"text",
    "contacted_by_user_id" "uuid",
    "converted_partner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."partner_leads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partner_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."partner_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "partner_type" "public"."partner_type" NOT NULL,
    "contact_name" "text",
    "phone" "text",
    "email" "text",
    "city" "text",
    "can_sell" boolean DEFAULT false NOT NULL,
    "can_print" boolean DEFAULT false NOT NULL,
    "can_distribute" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "country_id" "uuid"
);


ALTER TABLE "public"."partners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "method" "public"."payment_method" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status" NOT NULL,
    "operation_code" "text",
    "proof_file_url" "text",
    "submitted_by_user_id" "uuid",
    "verified_by_user_id" "uuid",
    "submitted_at" timestamp with time zone,
    "verified_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payments_amount_check" CHECK (("amount" >= (0)::numeric))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pet_breeds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "species" "public"."species_type" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text",
    "is_mixed" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "normalized_name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "external_code" "text",
    "name_es" "text",
    "is_popular" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."pet_breeds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pet_medical_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "sterilized" boolean,
    "allergies_text" "text",
    "conditions_text" "text",
    "medications_text" "text",
    "dietary_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pet_medical_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pet_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "visibility_status" "public"."profile_visibility_status" DEFAULT 'public'::"public"."profile_visibility_status" NOT NULL,
    "allow_found_reports" boolean DEFAULT true NOT NULL,
    "show_owner_name" boolean DEFAULT false NOT NULL,
    "show_phone" boolean DEFAULT true NOT NULL,
    "show_whatsapp" boolean DEFAULT true NOT NULL,
    "show_address" boolean DEFAULT false NOT NULL,
    "show_medical_alerts" boolean DEFAULT true NOT NULL,
    "medical_profile_enabled" boolean DEFAULT false NOT NULL,
    "lost_mode_message" "text",
    "address_text" "text",
    "emergency_message" "text",
    "lost_mode_activated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_lost_mode_message_required" CHECK ((("visibility_status" <> 'lost_mode'::"public"."profile_visibility_status") OR (("lost_mode_message" IS NOT NULL) AND ("btrim"("lost_mode_message") <> ''::"text"))))
);


ALTER TABLE "public"."pet_profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."pet_profiles"."visibility_status" IS 'public = normal, private = protegido, lost_mode = mascota perdida.';



COMMENT ON COLUMN "public"."pet_profiles"."medical_profile_enabled" IS 'Desbloqueo médico por mascota, no por placa.';



COMMENT ON COLUMN "public"."pet_profiles"."lost_mode_message" IS 'Mensaje personalizado obligatorio cuando visibility_status = lost_mode.';



CREATE TABLE IF NOT EXISTS "public"."pet_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "sold_plan_type" "public"."sold_plan_type" DEFAULT 'essential'::"public"."sold_plan_type" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "status" "public"."pet_tag_status" DEFAULT 'active'::"public"."pet_tag_status" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "unassigned_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pet_tags" OWNER TO "postgres";


COMMENT ON COLUMN "public"."pet_tags"."sold_plan_type" IS 'Plan comercial con el que se vendió la placa.';



CREATE TABLE IF NOT EXISTS "public"."pet_vaccinations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "vaccine_type_id" "uuid" NOT NULL,
    "applied_on" "date",
    "expires_on" "date",
    "dose_number" integer,
    "applied_by_partner_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pet_vaccinations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "species" "public"."species_type" DEFAULT 'dog'::"public"."species_type" NOT NULL,
    "color" "text",
    "birthdate" "date",
    "weight_kg" numeric(6,2),
    "photo_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "breed_id" "uuid",
    "breed_custom" "text",
    "sex" "public"."pet_sex_type" DEFAULT 'unknown'::"public"."pet_sex_type" NOT NULL,
    CONSTRAINT "chk_pets_breed_custom_length" CHECK ((("breed_custom" IS NULL) OR ("char_length"(TRIM(BOTH FROM "breed_custom")) >= 2))),
    CONSTRAINT "chk_pets_weight_nonnegative" CHECK ((("weight_kg" IS NULL) OR ("weight_kg" >= (0)::numeric)))
);


ALTER TABLE "public"."pets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "email" "text",
    "phone" "text",
    "whatsapp_phone" "text",
    "must_change_password" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "country_id" "uuid",
    "division_level_1_id" "uuid",
    "division_level_2_id" "uuid",
    "division_level_3_id" "uuid",
    "address_line" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referral_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "partner_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."referral_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "public"."role_code" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scan_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "pet_id" "uuid",
    "source" "public"."scan_source" DEFAULT 'unknown'::"public"."scan_source" NOT NULL,
    "ip" "inet",
    "user_agent" "text",
    "location_lat" numeric(9,6),
    "location_lng" numeric(9,6),
    "location_text" "text",
    "shared_location" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_scan_events_lat_range" CHECK ((("location_lat" IS NULL) OR (("location_lat" >= ('-90'::integer)::numeric) AND ("location_lat" <= (90)::numeric)))),
    CONSTRAINT "chk_scan_events_lng_range" CHECK ((("location_lng" IS NULL) OR (("location_lng" >= ('-180'::integer)::numeric) AND ("location_lng" <= (180)::numeric))))
);


ALTER TABLE "public"."scan_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tag_activations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "activated_by_user_id" "uuid" NOT NULL,
    "pet_id" "uuid",
    "partner_id" "uuid",
    "activation_ip" "inet",
    "activation_user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tag_activations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "status" "public"."tag_status" DEFAULT 'available'::"public"."tag_status" NOT NULL,
    "batch_code" "text",
    "source_type" "public"."source_type" DEFAULT 'direct'::"public"."source_type" NOT NULL,
    "partner_id" "uuid",
    "activated_by_user_id" "uuid",
    "activated_at" timestamp with time zone,
    "reserved_at" timestamp with time zone,
    "retired_reason" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sold_plan_type" "public"."sold_plan_type" DEFAULT 'essential'::"public"."sold_plan_type" NOT NULL,
    "lost_message" "text",
    "is_fabricated" boolean DEFAULT false NOT NULL,
    "fabricated_at" timestamp with time zone,
    CONSTRAINT "chk_tags_code_len" CHECK (("char_length"("code") = 6))
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tags"."status" IS 'Estado operativo de la placa. lost = placa perdida. retired = fuera de uso definitivo (incluye rota/dañada).';



COMMENT ON COLUMN "public"."tags"."is_fabricated" IS 'Indica si la placa física ya fue fabricada y está disponible físicamente.';



COMMENT ON COLUMN "public"."tags"."fabricated_at" IS 'Fecha y hora en que la placa fue marcada como fabricada.';



CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_countries_active" AS
 SELECT "id",
    "iso2",
    "iso3",
    "name",
    "phone_code"
   FROM "public"."countries"
  WHERE ("is_active" = true)
  ORDER BY "name";


ALTER VIEW "public"."v_countries_active" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_pet_breeds_active" AS
 SELECT "id",
    "species",
    "name",
    "slug",
    "is_mixed"
   FROM "public"."pet_breeds"
  WHERE ("is_active" = true)
  ORDER BY "species", "is_mixed" DESC, "name";


ALTER VIEW "public"."v_pet_breeds_active" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vaccine_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "species" "public"."species_type" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "recommended_frequency_months" integer,
    "is_core" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vaccine_types" OWNER TO "postgres";


ALTER TABLE ONLY "public"."app_config"
    ADD CONSTRAINT "app_config_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."app_config"
    ADD CONSTRAINT "app_config_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."pets"
    ADD CONSTRAINT "chk_pets_breed_required" CHECK ((("breed_id" IS NOT NULL) OR ("breed_custom" IS NOT NULL))) NOT VALID;



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_iso2_key" UNIQUE ("iso2");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_iso3_key" UNIQUE ("iso3");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."found_reports"
    ADD CONSTRAINT "found_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."geo_divisions"
    ADD CONSTRAINT "geo_divisions_country_id_parent_id_level_name_key" UNIQUE ("country_id", "parent_id", "level", "name");



ALTER TABLE ONLY "public"."geo_divisions"
    ADD CONSTRAINT "geo_divisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_leads"
    ADD CONSTRAINT "partner_leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_users"
    ADD CONSTRAINT "partner_users_partner_id_user_id_key" UNIQUE ("partner_id", "user_id");



ALTER TABLE ONLY "public"."partner_users"
    ADD CONSTRAINT "partner_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pet_breeds"
    ADD CONSTRAINT "pet_breeds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pet_breeds"
    ADD CONSTRAINT "pet_breeds_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."pet_breeds"
    ADD CONSTRAINT "pet_breeds_species_name_key" UNIQUE ("species", "name");



ALTER TABLE ONLY "public"."pet_medical_profiles"
    ADD CONSTRAINT "pet_medical_profiles_pet_id_key" UNIQUE ("pet_id");



ALTER TABLE ONLY "public"."pet_medical_profiles"
    ADD CONSTRAINT "pet_medical_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pet_profiles"
    ADD CONSTRAINT "pet_profiles_pet_id_key" UNIQUE ("pet_id");



ALTER TABLE ONLY "public"."pet_profiles"
    ADD CONSTRAINT "pet_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pet_tags"
    ADD CONSTRAINT "pet_tags_pet_id_tag_id_key" UNIQUE ("pet_id", "tag_id");



ALTER TABLE ONLY "public"."pet_tags"
    ADD CONSTRAINT "pet_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pet_vaccinations"
    ADD CONSTRAINT "pet_vaccinations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pets"
    ADD CONSTRAINT "pets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scan_events"
    ADD CONSTRAINT "scan_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tag_activations"
    ADD CONSTRAINT "tag_activations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "uq_user_roles" UNIQUE ("user_id", "role_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vaccine_types"
    ADD CONSTRAINT "vaccine_types_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."vaccine_types"
    ADD CONSTRAINT "vaccine_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vaccine_types"
    ADD CONSTRAINT "vaccine_types_species_name_key" UNIQUE ("species", "name");



CREATE INDEX "idx_countries_name" ON "public"."countries" USING "btree" ("name");



CREATE INDEX "idx_found_reports_pet" ON "public"."found_reports" USING "btree" ("pet_id");



CREATE INDEX "idx_found_reports_pet_created_at" ON "public"."found_reports" USING "btree" ("pet_id", "created_at" DESC);



CREATE INDEX "idx_found_reports_scan_event_id" ON "public"."found_reports" USING "btree" ("scan_event_id");



CREATE INDEX "idx_found_reports_status" ON "public"."found_reports" USING "btree" ("status");



CREATE INDEX "idx_found_reports_status_created_at" ON "public"."found_reports" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_found_reports_tag" ON "public"."found_reports" USING "btree" ("tag_id");



CREATE INDEX "idx_geo_divisions_country_id" ON "public"."geo_divisions" USING "btree" ("country_id");



CREATE INDEX "idx_geo_divisions_country_level" ON "public"."geo_divisions" USING "btree" ("country_id", "level");



CREATE INDEX "idx_geo_divisions_country_level_name" ON "public"."geo_divisions" USING "btree" ("country_id", "level", "name");



CREATE INDEX "idx_geo_divisions_name" ON "public"."geo_divisions" USING "btree" ("name");



CREATE INDEX "idx_geo_divisions_parent_id" ON "public"."geo_divisions" USING "btree" ("parent_id");



CREATE INDEX "idx_geo_divisions_parent_name" ON "public"."geo_divisions" USING "btree" ("parent_id", "name");



CREATE INDEX "idx_order_items_order" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_tag" ON "public"."order_items" USING "btree" ("assigned_tag_id");



CREATE INDEX "idx_orders_channel" ON "public"."orders" USING "btree" ("sales_channel");



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_orders_customer" ON "public"."orders" USING "btree" ("customer_user_id");



CREATE INDEX "idx_orders_customer_created_at" ON "public"."orders" USING "btree" ("customer_user_id", "created_at" DESC);



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_partner_leads_status" ON "public"."partner_leads" USING "btree" ("status");



CREATE INDEX "idx_partner_users_partner" ON "public"."partner_users" USING "btree" ("partner_id");



CREATE INDEX "idx_partner_users_user" ON "public"."partner_users" USING "btree" ("user_id");



CREATE INDEX "idx_partners_active" ON "public"."partners" USING "btree" ("is_active");



CREATE INDEX "idx_partners_country" ON "public"."partners" USING "btree" ("country_id");



CREATE INDEX "idx_partners_type" ON "public"."partners" USING "btree" ("partner_type");



CREATE INDEX "idx_payments_order" ON "public"."payments" USING "btree" ("order_id");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "idx_pet_breeds_name" ON "public"."pet_breeds" USING "btree" ("name");



CREATE INDEX "idx_pet_breeds_popular" ON "public"."pet_breeds" USING "btree" ("species", "is_active", "is_popular", "sort_order", "name");



CREATE INDEX "idx_pet_breeds_search" ON "public"."pet_breeds" USING "btree" ("species", "is_active", "normalized_name", "name_es");



CREATE INDEX "idx_pet_breeds_species" ON "public"."pet_breeds" USING "btree" ("species");



CREATE INDEX "idx_pet_breeds_species_active_name" ON "public"."pet_breeds" USING "btree" ("species", "is_active", "name");



CREATE INDEX "idx_pet_breeds_species_active_popular_name" ON "public"."pet_breeds" USING "btree" ("species", "is_active", "is_popular" DESC, "sort_order", "name");



CREATE INDEX "idx_pet_profiles_visibility" ON "public"."pet_profiles" USING "btree" ("visibility_status");



CREATE INDEX "idx_pet_tags_pet" ON "public"."pet_tags" USING "btree" ("pet_id");



CREATE INDEX "idx_pet_tags_pet_status" ON "public"."pet_tags" USING "btree" ("pet_id", "status");



CREATE INDEX "idx_pet_tags_tag" ON "public"."pet_tags" USING "btree" ("tag_id");



CREATE INDEX "idx_pet_tags_tag_status" ON "public"."pet_tags" USING "btree" ("tag_id", "status");



CREATE INDEX "idx_pet_vaccinations_expires" ON "public"."pet_vaccinations" USING "btree" ("expires_on");



CREATE INDEX "idx_pet_vaccinations_pet" ON "public"."pet_vaccinations" USING "btree" ("pet_id");



CREATE INDEX "idx_pet_vaccinations_pet_id" ON "public"."pet_vaccinations" USING "btree" ("pet_id");



CREATE INDEX "idx_pet_vaccinations_vaccine_type_id" ON "public"."pet_vaccinations" USING "btree" ("vaccine_type_id");



CREATE INDEX "idx_pets_birthdate" ON "public"."pets" USING "btree" ("birthdate");



CREATE INDEX "idx_pets_breed_id" ON "public"."pets" USING "btree" ("breed_id");



CREATE INDEX "idx_pets_owner_user_id" ON "public"."pets" USING "btree" ("owner_user_id");



CREATE INDEX "idx_pets_species" ON "public"."pets" USING "btree" ("species");



CREATE INDEX "idx_pets_species_active" ON "public"."pets" USING "btree" ("species", "is_active");



CREATE INDEX "idx_profiles_country_id" ON "public"."profiles" USING "btree" ("country_id");



CREATE INDEX "idx_profiles_division_level_1_id" ON "public"."profiles" USING "btree" ("division_level_1_id");



CREATE INDEX "idx_profiles_division_level_2_id" ON "public"."profiles" USING "btree" ("division_level_2_id");



CREATE INDEX "idx_profiles_division_level_3_id" ON "public"."profiles" USING "btree" ("division_level_3_id");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_phone" ON "public"."profiles" USING "btree" ("phone");



CREATE INDEX "idx_referral_codes_partner" ON "public"."referral_codes" USING "btree" ("partner_id");



CREATE INDEX "idx_scan_events_created_at" ON "public"."scan_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_scan_events_pet" ON "public"."scan_events" USING "btree" ("pet_id");



CREATE INDEX "idx_scan_events_pet_created_at" ON "public"."scan_events" USING "btree" ("pet_id", "created_at" DESC);



CREATE INDEX "idx_scan_events_tag" ON "public"."scan_events" USING "btree" ("tag_id");



CREATE INDEX "idx_scan_events_tag_created_at" ON "public"."scan_events" USING "btree" ("tag_id", "created_at" DESC);



CREATE INDEX "idx_tag_activations_tag" ON "public"."tag_activations" USING "btree" ("tag_id");



CREATE INDEX "idx_tag_activations_user" ON "public"."tag_activations" USING "btree" ("activated_by_user_id");



CREATE INDEX "idx_tags_batch" ON "public"."tags" USING "btree" ("batch_code");



CREATE INDEX "idx_tags_is_fabricated" ON "public"."tags" USING "btree" ("is_fabricated");



CREATE INDEX "idx_tags_partner" ON "public"."tags" USING "btree" ("partner_id");



CREATE INDEX "idx_tags_sold_plan_type_is_fabricated" ON "public"."tags" USING "btree" ("sold_plan_type", "is_fabricated");



CREATE INDEX "idx_tags_status" ON "public"."tags" USING "btree" ("status");



CREATE INDEX "idx_tags_status_is_fabricated" ON "public"."tags" USING "btree" ("status", "is_fabricated");



CREATE INDEX "idx_user_roles_role" ON "public"."user_roles" USING "btree" ("role_id");



CREATE INDEX "idx_user_roles_user" ON "public"."user_roles" USING "btree" ("user_id");



CREATE UNIQUE INDEX "uq_partner_users_one_primary" ON "public"."partner_users" USING "btree" ("partner_id") WHERE ("is_primary" = true);



CREATE UNIQUE INDEX "uq_pet_breeds_species_normalized_name" ON "public"."pet_breeds" USING "btree" ("species", "normalized_name");



CREATE UNIQUE INDEX "uq_pet_tags_one_active_tag" ON "public"."pet_tags" USING "btree" ("tag_id") WHERE ("status" = 'active'::"public"."pet_tag_status");



CREATE UNIQUE INDEX "uq_pet_tags_one_primary_active_per_pet" ON "public"."pet_tags" USING "btree" ("pet_id") WHERE (("is_primary" = true) AND ("status" = 'active'::"public"."pet_tag_status"));



CREATE UNIQUE INDEX "uq_pet_tags_one_primary_per_pet" ON "public"."pet_tags" USING "btree" ("pet_id") WHERE (("is_primary" = true) AND ("status" = 'active'::"public"."pet_tag_status"));



CREATE UNIQUE INDEX "ux_pet_tags_one_active_per_tag" ON "public"."pet_tags" USING "btree" ("tag_id") WHERE ("status" = 'active'::"public"."pet_tag_status");



CREATE UNIQUE INDEX "ux_pet_tags_one_primary_active_per_pet" ON "public"."pet_tags" USING "btree" ("pet_id") WHERE (("status" = 'active'::"public"."pet_tag_status") AND (COALESCE("is_primary", false) = true));



CREATE OR REPLACE TRIGGER "notify_new_report_email" AFTER INSERT ON "public"."found_reports" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://sgpbsjgxfotrhionedog.supabase.co/functions/v1/notify-new-report', 'POST', '{"Content-type":"application/json"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "trg_app_config_updated_at" BEFORE UPDATE ON "public"."app_config" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_order_items_recalculate_order" AFTER INSERT OR DELETE OR UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."trg_recalculate_order_totals"();



CREATE OR REPLACE TRIGGER "trg_order_items_set_subtotal" BEFORE INSERT OR UPDATE OF "quantity", "unit_price" ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_order_item_subtotal"();



CREATE OR REPLACE TRIGGER "trg_order_items_updated_at" BEFORE UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_orders_set_number" BEFORE INSERT ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_order_number_if_null"();



CREATE OR REPLACE TRIGGER "trg_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_partner_leads_updated_at" BEFORE UPDATE ON "public"."partner_leads" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_partners_updated_at" BEFORE UPDATE ON "public"."partners" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_pet_medical_profiles_updated_at" BEFORE UPDATE ON "public"."pet_medical_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_pet_profiles_set_lost_mode_activated_at" BEFORE INSERT OR UPDATE OF "visibility_status" ON "public"."pet_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_lost_mode_activated_at"();



CREATE OR REPLACE TRIGGER "trg_pet_profiles_updated_at" BEFORE UPDATE ON "public"."pet_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_pet_tags_refresh_medical" AFTER INSERT OR DELETE OR UPDATE ON "public"."pet_tags" FOR EACH ROW EXECUTE FUNCTION "public"."trg_refresh_pet_medical_profile_enabled"();



CREATE OR REPLACE TRIGGER "trg_pet_tags_sync_sold_plan_type_from_tags" BEFORE INSERT OR UPDATE ON "public"."pet_tags" FOR EACH ROW EXECUTE FUNCTION "public"."sync_pet_tags_sold_plan_type_from_tags"();



CREATE OR REPLACE TRIGGER "trg_pet_tags_updated_at" BEFORE UPDATE ON "public"."pet_tags" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_pet_vaccinations_updated_at" BEFORE UPDATE ON "public"."pet_vaccinations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_pets_updated_at" BEFORE UPDATE ON "public"."pets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_referral_codes_updated_at" BEFORE UPDATE ON "public"."referral_codes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_tags_updated_at" BEFORE UPDATE ON "public"."tags" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."app_config"
    ADD CONSTRAINT "app_config_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."found_reports"
    ADD CONSTRAINT "found_reports_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."found_reports"
    ADD CONSTRAINT "found_reports_scan_event_id_fkey" FOREIGN KEY ("scan_event_id") REFERENCES "public"."scan_events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."found_reports"
    ADD CONSTRAINT "found_reports_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."geo_divisions"
    ADD CONSTRAINT "geo_divisions_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."geo_divisions"
    ADD CONSTRAINT "geo_divisions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."geo_divisions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_assigned_tag_id_fkey" FOREIGN KEY ("assigned_tag_id") REFERENCES "public"."tags"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_fulfillment_partner_id_fkey" FOREIGN KEY ("fulfillment_partner_id") REFERENCES "public"."partners"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_created_by_admin_user_id_fkey" FOREIGN KEY ("created_by_admin_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_customer_user_id_fkey" FOREIGN KEY ("customer_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_referral_code_id_fkey" FOREIGN KEY ("referral_code_id") REFERENCES "public"."referral_codes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."partner_leads"
    ADD CONSTRAINT "partner_leads_contacted_by_user_id_fkey" FOREIGN KEY ("contacted_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."partner_leads"
    ADD CONSTRAINT "partner_leads_converted_partner_id_fkey" FOREIGN KEY ("converted_partner_id") REFERENCES "public"."partners"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."partner_users"
    ADD CONSTRAINT "partner_users_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partner_users"
    ADD CONSTRAINT "partner_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pet_medical_profiles"
    ADD CONSTRAINT "pet_medical_profiles_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_profiles"
    ADD CONSTRAINT "pet_profiles_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_tags"
    ADD CONSTRAINT "pet_tags_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_tags"
    ADD CONSTRAINT "pet_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_vaccinations"
    ADD CONSTRAINT "pet_vaccinations_applied_by_partner_id_fkey" FOREIGN KEY ("applied_by_partner_id") REFERENCES "public"."partners"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pet_vaccinations"
    ADD CONSTRAINT "pet_vaccinations_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pet_vaccinations"
    ADD CONSTRAINT "pet_vaccinations_vaccine_type_id_fkey" FOREIGN KEY ("vaccine_type_id") REFERENCES "public"."vaccine_types"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."pets"
    ADD CONSTRAINT "pets_breed_id_fkey" FOREIGN KEY ("breed_id") REFERENCES "public"."pet_breeds"("id");



ALTER TABLE ONLY "public"."pets"
    ADD CONSTRAINT "pets_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_division_level_1_id_fkey" FOREIGN KEY ("division_level_1_id") REFERENCES "public"."geo_divisions"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_division_level_2_id_fkey" FOREIGN KEY ("division_level_2_id") REFERENCES "public"."geo_divisions"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_division_level_3_id_fkey" FOREIGN KEY ("division_level_3_id") REFERENCES "public"."geo_divisions"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scan_events"
    ADD CONSTRAINT "scan_events_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scan_events"
    ADD CONSTRAINT "scan_events_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tag_activations"
    ADD CONSTRAINT "tag_activations_activated_by_user_id_fkey" FOREIGN KEY ("activated_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tag_activations"
    ADD CONSTRAINT "tag_activations_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tag_activations"
    ADD CONSTRAINT "tag_activations_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tag_activations"
    ADD CONSTRAINT "tag_activations_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_activated_by_user_id_fkey" FOREIGN KEY ("activated_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "admins read tag_activations" ON "public"."tag_activations" FOR SELECT TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));



ALTER TABLE "public"."app_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_config_admin_manage_v1" ON "public"."app_config" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



ALTER TABLE "public"."countries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "countries_admin_manage_v1" ON "public"."countries" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "countries_public_read_v1" ON "public"."countries" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."found_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "found_reports_owner_select_v1" ON "public"."found_reports" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "found_reports"."pet_id") AND (("p"."owner_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))))));



CREATE POLICY "found_reports_owner_update_v1" ON "public"."found_reports" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "found_reports"."pet_id") AND (("p"."owner_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "found_reports"."pet_id") AND (("p"."owner_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))))));



CREATE POLICY "found_reports_public_insert_v1" ON "public"."found_reports" FOR INSERT TO "authenticated", "anon" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."pet_tags" "pt"
     JOIN "public"."pet_profiles" "pp" ON (("pp"."pet_id" = "pt"."pet_id")))
  WHERE (("pt"."tag_id" = "found_reports"."tag_id") AND ("pt"."pet_id" = "found_reports"."pet_id") AND ("pt"."status" = 'active'::"public"."pet_tag_status") AND ("pp"."allow_found_reports" = true) AND ("pp"."visibility_status" = ANY (ARRAY['public'::"public"."profile_visibility_status", 'lost_mode'::"public"."profile_visibility_status"]))))));



ALTER TABLE "public"."geo_divisions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "geo_divisions_admin_manage_v1" ON "public"."geo_divisions" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "geo_divisions_public_read_v1" ON "public"."geo_divisions" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_items_admin_manage_v1" ON "public"."order_items" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "order_items_owner_delete_v1" ON "public"."order_items" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ((("o"."customer_user_id" = "auth"."uid"()) AND ("o"."status" = ANY (ARRAY['draft'::"public"."order_status", 'pending_payment'::"public"."order_status"]))) OR "public"."is_admin"("auth"."uid"()))))));



CREATE POLICY "order_items_owner_insert_v1" ON "public"."order_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ((("o"."customer_user_id" = "auth"."uid"()) AND ("o"."status" = ANY (ARRAY['draft'::"public"."order_status", 'pending_payment'::"public"."order_status"]))) OR "public"."is_admin"("auth"."uid"()))))));



CREATE POLICY "order_items_owner_select_v1" ON "public"."order_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND (("o"."customer_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))))));



CREATE POLICY "order_items_owner_update_v1" ON "public"."order_items" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ((("o"."customer_user_id" = "auth"."uid"()) AND ("o"."status" = ANY (ARRAY['draft'::"public"."order_status", 'pending_payment'::"public"."order_status"]))) OR "public"."is_admin"("auth"."uid"())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ((("o"."customer_user_id" = "auth"."uid"()) AND ("o"."status" = ANY (ARRAY['draft'::"public"."order_status", 'pending_payment'::"public"."order_status"]))) OR "public"."is_admin"("auth"."uid"()))))));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_admin_manage_v1" ON "public"."orders" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "orders_owner_delete_v1" ON "public"."orders" FOR DELETE TO "authenticated" USING (((("customer_user_id" = "auth"."uid"()) AND ("status" = ANY (ARRAY['draft'::"public"."order_status", 'pending_payment'::"public"."order_status", 'cancelled'::"public"."order_status"]))) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "orders_owner_insert_v1" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK ((("customer_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "orders_owner_select_v1" ON "public"."orders" FOR SELECT TO "authenticated" USING ((("customer_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "orders_owner_update_v1" ON "public"."orders" FOR UPDATE TO "authenticated" USING ((("customer_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))) WITH CHECK ((("customer_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



ALTER TABLE "public"."partner_leads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "partner_leads_admin_delete_v1" ON "public"."partner_leads" FOR DELETE TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "partner_leads_admin_read_v1" ON "public"."partner_leads" FOR SELECT TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "partner_leads_admin_update_v1" ON "public"."partner_leads" FOR UPDATE TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "partner_leads_public_insert_v1" ON "public"."partner_leads" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



ALTER TABLE "public"."partner_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "partner_users_admin_manage_v1" ON "public"."partner_users" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



ALTER TABLE "public"."partners" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "partners_admin_manage_v1" ON "public"."partners" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_admin_manage_v1" ON "public"."payments" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "payments_owner_insert_v1" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "payments"."order_id") AND (("o"."customer_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))))) AND (("submitted_by_user_id" IS NULL) OR ("submitted_by_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))));



CREATE POLICY "payments_owner_select_v1" ON "public"."payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "payments"."order_id") AND (("o"."customer_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))))));



CREATE POLICY "payments_owner_update_v1" ON "public"."payments" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "payments"."order_id") AND (("o"."customer_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "payments"."order_id") AND (("o"."customer_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))))) AND (("submitted_by_user_id" IS NULL) OR ("submitted_by_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))));



ALTER TABLE "public"."pet_breeds" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pet_breeds_admin_manage_v1" ON "public"."pet_breeds" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "pet_breeds_public_read_v1" ON "public"."pet_breeds" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."pet_medical_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pet_medical_profiles_owner_insert_v1" ON "public"."pet_medical_profiles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_medical_profiles"."pet_id") AND (("p"."owner_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))))));



CREATE POLICY "pet_medical_profiles_owner_select_v1" ON "public"."pet_medical_profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_medical_profiles"."pet_id") AND (("p"."owner_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))))));



CREATE POLICY "pet_medical_profiles_owner_update_v1" ON "public"."pet_medical_profiles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_medical_profiles"."pet_id") AND (("p"."owner_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_medical_profiles"."pet_id") AND (("p"."owner_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))))));



ALTER TABLE "public"."pet_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pet_profiles_owner_insert_v1" ON "public"."pet_profiles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_profiles"."pet_id") AND (("p"."owner_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))))));



CREATE POLICY "pet_profiles_owner_select_v1" ON "public"."pet_profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_profiles"."pet_id") AND (("p"."owner_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))))));



CREATE POLICY "pet_profiles_owner_update_v1" ON "public"."pet_profiles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_profiles"."pet_id") AND (("p"."owner_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_profiles"."pet_id") AND (("p"."owner_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))))));



ALTER TABLE "public"."pet_tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pet_tags_admin_manage_v1" ON "public"."pet_tags" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "pet_tags_owner_select_v1" ON "public"."pet_tags" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_tags"."pet_id") AND (("p"."owner_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))))));



ALTER TABLE "public"."pet_vaccinations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pet_vaccinations_delete_admin" ON "public"."pet_vaccinations" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_roles" "ur"
     JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."code" = 'admin'::"public"."role_code")))));



CREATE POLICY "pet_vaccinations_delete_owner" ON "public"."pet_vaccinations" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."pets" "p"
     JOIN "public"."pet_profiles" "pp" ON (("pp"."pet_id" = "p"."id")))
  WHERE (("p"."id" = "pet_vaccinations"."pet_id") AND ("p"."owner_user_id" = "auth"."uid"()) AND (COALESCE("pp"."medical_profile_enabled", false) = true)))));



CREATE POLICY "pet_vaccinations_insert_admin" ON "public"."pet_vaccinations" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_roles" "ur"
     JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."code" = 'admin'::"public"."role_code")))));



CREATE POLICY "pet_vaccinations_insert_owner" ON "public"."pet_vaccinations" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."pets" "p"
     JOIN "public"."pet_profiles" "pp" ON (("pp"."pet_id" = "p"."id")))
  WHERE (("p"."id" = "pet_vaccinations"."pet_id") AND ("p"."owner_user_id" = "auth"."uid"()) AND (COALESCE("pp"."medical_profile_enabled", false) = true)))));



CREATE POLICY "pet_vaccinations_select_admin" ON "public"."pet_vaccinations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_roles" "ur"
     JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."code" = 'admin'::"public"."role_code")))));



CREATE POLICY "pet_vaccinations_select_owner" ON "public"."pet_vaccinations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."pets" "p"
     JOIN "public"."pet_profiles" "pp" ON (("pp"."pet_id" = "p"."id")))
  WHERE (("p"."id" = "pet_vaccinations"."pet_id") AND ("p"."owner_user_id" = "auth"."uid"()) AND (COALESCE("pp"."medical_profile_enabled", false) = true)))));



CREATE POLICY "pet_vaccinations_update_admin" ON "public"."pet_vaccinations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_roles" "ur"
     JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."code" = 'admin'::"public"."role_code"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_roles" "ur"
     JOIN "public"."roles" "r" ON (("r"."id" = "ur"."role_id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."code" = 'admin'::"public"."role_code")))));



CREATE POLICY "pet_vaccinations_update_owner" ON "public"."pet_vaccinations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."pets" "p"
     JOIN "public"."pet_profiles" "pp" ON (("pp"."pet_id" = "p"."id")))
  WHERE (("p"."id" = "pet_vaccinations"."pet_id") AND ("p"."owner_user_id" = "auth"."uid"()) AND (COALESCE("pp"."medical_profile_enabled", false) = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."pets" "p"
     JOIN "public"."pet_profiles" "pp" ON (("pp"."pet_id" = "p"."id")))
  WHERE (("p"."id" = "pet_vaccinations"."pet_id") AND ("p"."owner_user_id" = "auth"."uid"()) AND (COALESCE("pp"."medical_profile_enabled", false) = true)))));



ALTER TABLE "public"."pets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pets_owner_delete_v1" ON "public"."pets" FOR DELETE TO "authenticated" USING ((("owner_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "pets_owner_insert_v1" ON "public"."pets" FOR INSERT TO "authenticated" WITH CHECK ((("owner_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "pets_owner_select_v1" ON "public"."pets" FOR SELECT TO "authenticated" USING ((("owner_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "pets_owner_update_v1" ON "public"."pets" FOR UPDATE TO "authenticated" USING ((("owner_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))) WITH CHECK ((("owner_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_self_insert_v1" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((("id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "profiles_self_select_v1" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "profiles_self_update_v1" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))) WITH CHECK ((("id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



ALTER TABLE "public"."referral_codes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "referral_codes_admin_manage_v1" ON "public"."referral_codes" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "roles_authenticated_read_v1" ON "public"."roles" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."scan_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scan_events_public_insert_v1" ON "public"."scan_events" FOR INSERT TO "authenticated", "anon" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pet_tags" "pt"
  WHERE (("pt"."tag_id" = "scan_events"."tag_id") AND ("pt"."pet_id" = "scan_events"."pet_id") AND ("pt"."status" = 'active'::"public"."pet_tag_status")))));



CREATE POLICY "scan_events_public_select_v1" ON "public"."scan_events" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."pet_tags" "pt"
  WHERE (("pt"."tag_id" = "scan_events"."tag_id") AND ("pt"."pet_id" = "scan_events"."pet_id") AND ("pt"."status" = 'active'::"public"."pet_tag_status")))));



ALTER TABLE "public"."tag_activations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tags_admin_manage_v1" ON "public"."tags" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "tags_owner_select_v1" ON "public"."tags" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."pet_tags" "pt"
     JOIN "public"."pets" "p" ON (("p"."id" = "pt"."pet_id")))
  WHERE (("pt"."tag_id" = "tags"."id") AND (("p"."owner_user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"()))))));



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_admin_manage_v1" ON "public"."user_roles" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "user_roles_self_select_v1" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



ALTER TABLE "public"."vaccine_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vaccine_types_admin_manage_v1" ON "public"."vaccine_types" TO "authenticated" USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "vaccine_types_public_read_v1" ON "public"."vaccine_types" FOR SELECT TO "authenticated", "anon" USING (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO "anon";
GRANT ALL ON SCHEMA "public" TO "authenticated";
GRANT ALL ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."activate_tag_for_pet"("p_tag_code" "text", "p_pet_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."activate_tag_for_pet"("p_tag_code" "text", "p_pet_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."check_tag_code"("p_tag_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_tag_code"("p_tag_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_tag_code"("p_tag_code" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."claim_guest_orders_for_current_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."claim_guest_orders_for_current_user"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."create_order_with_items"("p_items" "jsonb", "p_guest_name" "text", "p_guest_email" "text", "p_guest_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_order_with_items"("p_items" "jsonb", "p_guest_name" "text", "p_guest_email" "text", "p_guest_phone" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "anon";



GRANT ALL ON FUNCTION "public"."generate_tag_batch"("p_count" integer, "p_batch_code" "text", "p_sold_plan_type" "public"."sold_plan_type", "p_source_type" "public"."source_type") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_tag_batch"("p_count" integer, "p_batch_code" "text", "p_sold_plan_type" "public"."sold_plan_type", "p_source_type" "public"."source_type") TO "authenticated";



GRANT ALL ON FUNCTION "public"."generate_tag_code"("code_length" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_tag_code"("code_length" integer) TO "anon";



GRANT ALL ON FUNCTION "public"."get_geo_divisions"("p_country_id" "uuid", "p_parent_id" "uuid", "p_level" smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_geo_divisions"("p_country_id" "uuid", "p_parent_id" "uuid", "p_level" smallint) TO "anon";



GRANT ALL ON FUNCTION "public"."get_pet_breeds"("p_species" "public"."species_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pet_breeds"("p_species" "public"."species_type") TO "anon";



GRANT ALL ON FUNCTION "public"."get_pet_extended"("p_pet_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pet_extended"("p_pet_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."get_profile_location"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_profile_location"("p_user_id" "uuid") TO "anon";



REVOKE ALL ON FUNCTION "public"."get_public_app_config"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_app_config"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_app_config"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_public_pet_profile_by_tag_code"("p_tag_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_pet_profile_by_tag_code"("p_tag_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_pet_profile_by_tag_code"("p_tag_code" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."is_admin"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"("p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."mark_tag_as_lost"("p_tag_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."mark_tag_as_suspended"("p_tag_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."recalculate_order_totals"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."recalculate_order_totals"("p_order_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."refresh_pet_medical_profile_enabled"("p_pet_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."retire_tag"("p_tag_id" "uuid", "p_reason" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."set_lost_mode_activated_at"() FROM PUBLIC;



GRANT ALL ON FUNCTION "public"."set_my_primary_pet_tag"("p_pet_tag_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_my_primary_pet_tag"("p_pet_tag_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_order_item_subtotal"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_order_item_subtotal"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."set_order_number_if_null"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_order_number_if_null"() TO "anon";



REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;



GRANT ALL ON FUNCTION "public"."sync_pet_tags_sold_plan_type_from_tags"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_pet_tags_sold_plan_type_from_tags"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."trg_recalculate_order_totals"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."trg_recalculate_order_totals"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."trg_refresh_pet_medical_profile_enabled"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."unassign_tag_from_pet"("p_tag_id" "uuid") FROM PUBLIC;



GRANT ALL ON FUNCTION "public"."update_my_tag_status"("p_pet_tag_id" "uuid", "p_new_status" "public"."tag_status", "p_lost_message" "text", "p_retired_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_my_tag_status"("p_pet_tag_id" "uuid", "p_new_status" "public"."tag_status", "p_lost_message" "text", "p_retired_reason" "text") TO "authenticated";


















GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."app_config" TO "authenticated";
GRANT SELECT ON TABLE "public"."app_config" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."countries" TO "authenticated";
GRANT SELECT ON TABLE "public"."countries" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."found_reports" TO "authenticated";
GRANT SELECT,INSERT ON TABLE "public"."found_reports" TO "anon";
GRANT SELECT ON TABLE "public"."found_reports" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."geo_divisions" TO "authenticated";
GRANT SELECT ON TABLE "public"."geo_divisions" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."order_items" TO "authenticated";
GRANT SELECT ON TABLE "public"."order_items" TO "anon";



GRANT SELECT,USAGE ON SEQUENCE "public"."order_number_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."order_number_seq" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."orders" TO "authenticated";
GRANT SELECT ON TABLE "public"."orders" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."partner_leads" TO "authenticated";
GRANT SELECT ON TABLE "public"."partner_leads" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."partner_users" TO "authenticated";
GRANT SELECT ON TABLE "public"."partner_users" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."partners" TO "authenticated";
GRANT SELECT ON TABLE "public"."partners" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."payments" TO "authenticated";
GRANT SELECT ON TABLE "public"."payments" TO "anon";



GRANT SELECT ON TABLE "public"."pet_breeds" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."pet_breeds" TO "authenticated";



GRANT SELECT ON TABLE "public"."pet_medical_profiles" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."pet_medical_profiles" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."pet_profiles" TO "authenticated";
GRANT SELECT ON TABLE "public"."pet_profiles" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."pet_tags" TO "authenticated";
GRANT SELECT ON TABLE "public"."pet_tags" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."pet_vaccinations" TO "authenticated";
GRANT SELECT ON TABLE "public"."pet_vaccinations" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."pets" TO "authenticated";
GRANT SELECT ON TABLE "public"."pets" TO "anon";
GRANT SELECT ON TABLE "public"."pets" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT ON TABLE "public"."profiles" TO "anon";
GRANT SELECT ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."referral_codes" TO "authenticated";
GRANT SELECT ON TABLE "public"."referral_codes" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."roles" TO "authenticated";
GRANT SELECT ON TABLE "public"."roles" TO "anon";



GRANT SELECT,INSERT ON TABLE "public"."scan_events" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."scan_events" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tag_activations" TO "authenticated";
GRANT SELECT ON TABLE "public"."tag_activations" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tags" TO "authenticated";
GRANT SELECT ON TABLE "public"."tags" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_roles" TO "authenticated";
GRANT SELECT ON TABLE "public"."user_roles" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."v_countries_active" TO "authenticated";
GRANT SELECT ON TABLE "public"."v_countries_active" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."v_pet_breeds_active" TO "authenticated";
GRANT SELECT ON TABLE "public"."v_pet_breeds_active" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."vaccine_types" TO "authenticated";
GRANT SELECT ON TABLE "public"."vaccine_types" TO "anon";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,USAGE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,USAGE ON SEQUENCES TO "authenticated";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "authenticated";




























