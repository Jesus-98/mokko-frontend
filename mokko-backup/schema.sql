


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




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






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


CREATE OR REPLACE FUNCTION "public"."activate_tag_for_pet"("p_tag_code" "text", "p_pet_id" "uuid", "p_user_id" "uuid", "p_sold_plan_type" "public"."sold_plan_type" DEFAULT 'essential'::"public"."sold_plan_type") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_tag_id uuid;
  v_tag_status public.tag_status;
  v_pet_owner uuid;
  v_existing_active_pet uuid;
begin
  select id, status
  into v_tag_id, v_tag_status
  from public.tags
  where code = upper(trim(p_tag_code));

  if v_tag_id is null then
    raise exception 'Código no encontrado';
  end if;

  if v_tag_status <> 'available' then
    raise exception 'Esta placa ya no está disponible para activación';
  end if;

  select owner_user_id
  into v_pet_owner
  from public.pets
  where id = p_pet_id;

  if v_pet_owner is null then
    raise exception 'Mascota no encontrada';
  end if;

  if v_pet_owner <> p_user_id then
    raise exception 'No tienes permisos para activar esta placa en esta mascota';
  end if;

  select pet_id
  into v_existing_active_pet
  from public.pet_tags
  where tag_id = v_tag_id
    and status = 'active'
  limit 1;

  if v_existing_active_pet is not null then
    raise exception 'Esta placa ya tiene una asignación activa';
  end if;

  update public.tags
  set
    status = 'activated',
    activated_by_user_id = p_user_id,
    activated_at = now()
  where id = v_tag_id;

  insert into public.pet_tags (
    pet_id,
    tag_id,
    sold_plan_type,
    is_primary,
    status,
    assigned_at
  )
  values (
    p_pet_id,
    v_tag_id,
    p_sold_plan_type,
    false,
    'active',
    now()
  );

  insert into public.tag_activations (
    tag_id,
    activated_by_user_id,
    pet_id,
    created_at
  )
  values (
    v_tag_id,
    p_user_id,
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
    case when p_sold_plan_type = 'custom' then true else false end
  )
  on conflict (pet_id) do nothing;

  perform public.refresh_pet_medical_profile_enabled(p_pet_id);

  return jsonb_build_object(
    'success', true,
    'message', 'Placa activada correctamente',
    'tag_id', v_tag_id,
    'pet_id', p_pet_id
  );
end;
$$;


ALTER FUNCTION "public"."activate_tag_for_pet"("p_tag_code" "text", "p_pet_id" "uuid", "p_user_id" "uuid", "p_sold_plan_type" "public"."sold_plan_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_tag_code"("p_tag_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_tag_id uuid;
  v_status public.tag_status;
begin
  select id, status
  into v_tag_id, v_status
  from public.tags
  where code = upper(trim(p_tag_code));

  if v_tag_id is null then
    return jsonb_build_object(
      'valid', false,
      'message', 'Código no encontrado'
    );
  end if;

  if v_status <> 'available' then
    return jsonb_build_object(
      'valid', false,
      'message', 'La placa no está disponible para activación',
      'status', v_status
    );
  end if;

  return jsonb_build_object(
    'valid', true,
    'message', 'Código válido',
    'tag_id', v_tag_id,
    'status', v_status
  );
end;
$$;


ALTER FUNCTION "public"."check_tag_code"("p_tag_code" "text") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."generate_tag_batch"("p_count" integer, "p_batch_code" "text" DEFAULT 'INITIAL-2026-01'::"text", "p_design_type" "public"."design_type" DEFAULT 'generic'::"public"."design_type", "p_source_type" "public"."source_type" DEFAULT 'internal'::"public"."source_type") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_inserted integer := 0;
  v_code text;
begin
  while v_inserted < p_count loop
    v_code := public.generate_tag_code(6);

    insert into public.tags (
      code,
      status,
      design_type,
      batch_code,
      source_type
    )
    values (
      v_code,
      'available',
      p_design_type,
      p_batch_code,
      p_source_type
    )
    on conflict (code) do nothing;

    if found then
      v_inserted := v_inserted + 1;
    end if;
  end loop;

  return v_inserted;
end;
$$;


ALTER FUNCTION "public"."generate_tag_batch"("p_count" integer, "p_batch_code" "text", "p_design_type" "public"."design_type", "p_source_type" "public"."source_type") OWNER TO "postgres";


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
begin
  select value into v_msg_public
  from public.app_config
  where key = 'profile_message_public';

  v_msg_public := coalesce(
    v_msg_public,
    'Si encontraste a esta mascota, por favor contacta a su dueño.'
  );

  select value into v_msg_private
  from public.app_config
  where key = 'profile_message_private';

  v_msg_private := coalesce(
    v_msg_private,
    'Esta mascota tiene un perfil protegido. Si la encontraste, puedes enviar un reporte con tu ubicación para ayudar a su familia.'
  );

  select
    t.id,
    t.code,
    t.status,
    t.design_type,
    t.retired_reason
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
      'tag_code', v_tag.code,
      'tag_status', v_tag.status,
      'is_assigned', false,
      'message',
        case
          when v_tag.status = 'suspended' then 'Esta placa está suspendida temporalmente.'
          when v_tag.status = 'lost' then 'Esta placa fue reportada como perdida.'
          when v_tag.status = 'retired' then 'Esta placa fue retirada y ya no está en uso.'
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
    p.breed,
    p.sex,
    p.color,
    p.photo_url,
    p.notes
  into v_pet
  from public.pet_tags pt
  join public.pets p on p.id = pt.pet_id
  where pt.tag_id = v_tag.id
    and pt.status = 'active'
    and p.is_active = true
  limit 1;

  if v_pet.id is null then
    return jsonb_build_object(
      'success', true,
      'message', 'Placa registrada, pero aún no tiene mascota asociada.',
      'tag_code', v_tag.code,
      'tag_status', v_tag.status,
      'is_assigned', false
    );
  end if;

  select
    pp.id,
    pp.visibility_status,
    pp.allow_found_reports,
    pp.show_owner_name,
    pp.show_phone,
    pp.show_whatsapp,
    pp.show_address,
    pp.show_medical_alerts,
    pp.show_reward_note,
    pp.medical_profile_enabled,
    pp.lost_mode_message,
    pp.reward_text,
    pp.address_text,
    pp.emergency_message,
    pp.lost_mode_activated_at
  into v_profile
  from public.pet_profiles pp
  where pp.pet_id = v_pet.id;

  if v_profile.id is null then
    v_profile.visibility_status := 'public';
    v_profile.allow_found_reports := true;
    v_profile.show_owner_name := false;
    v_profile.show_phone := true;
    v_profile.show_whatsapp := true;
    v_profile.show_address := false;
    v_profile.show_medical_alerts := true;
    v_profile.show_reward_note := false;
    v_profile.medical_profile_enabled := false;
    v_profile.lost_mode_message := null;
    v_profile.reward_text := null;
    v_profile.address_text := null;
    v_profile.emergency_message := null;
    v_profile.lost_mode_activated_at := null;
  end if;

  select
    pr.full_name,
    pr.phone,
    pr.whatsapp_phone
  into v_owner
  from public.profiles pr
  where pr.id = v_pet.owner_user_id;

  select
    pm.allergies_text,
    pm.conditions_text,
    pm.medications_text,
    pm.dietary_notes,
    pm.emergency_notes
  into v_medical
  from public.pet_medical_profiles pm
  where pm.pet_id = v_pet.id;

  if v_profile.visibility_status = 'private' then
    return jsonb_build_object(
      'success', true,
      'tag_code', v_tag.code,
      'tag_status', v_tag.status,
      'is_assigned', true,
      'visibility_status', v_profile.visibility_status,

      'pet', jsonb_build_object(
        'id', v_pet.id,
        'name', v_pet.name,
        'photo_url', v_pet.photo_url,
        'species', null,
        'breed', null,
        'sex', null,
        'color', null
      ),

      'profile', jsonb_build_object(
        'message', v_msg_private,
        'lost_mode_message', null,
        'emergency_message', v_profile.emergency_message,
        'reward_text', null,
        'allow_found_reports', v_profile.allow_found_reports
      ),

      'owner', jsonb_build_object(
        'full_name', null,
        'phone', null,
        'whatsapp_phone', null,
        'address_text', null
      ),

      'medical', jsonb_build_object(
        'enabled', v_profile.medical_profile_enabled,
        'emergency_notes',
          case
            when v_profile.medical_profile_enabled and v_profile.show_medical_alerts
            then v_medical.emergency_notes
            else null
          end,
        'allergies_text', null,
        'conditions_text', null,
        'medications_text', null
      )
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'tag_code', v_tag.code,
    'tag_status', v_tag.status,
    'is_assigned', true,
    'visibility_status', v_profile.visibility_status,

    'pet', jsonb_build_object(
      'id', v_pet.id,
      'name', v_pet.name,
      'species', v_pet.species,
      'breed', v_pet.breed,
      'sex', v_pet.sex,
      'color', v_pet.color,
      'photo_url', v_pet.photo_url
    ),

    'profile', jsonb_build_object(
      'message',
        case
          when v_profile.visibility_status = 'lost_mode'
            then v_profile.lost_mode_message
          else
            v_msg_public
        end,
      'lost_mode_message',
        case
          when v_profile.visibility_status = 'lost_mode'
            then v_profile.lost_mode_message
          else
            null
        end,
      'emergency_message', v_profile.emergency_message,
      'reward_text',
        case when v_profile.show_reward_note
          then v_profile.reward_text
          else null
        end,
      'allow_found_reports', v_profile.allow_found_reports,
      'lost_mode_activated_at', v_profile.lost_mode_activated_at
    ),

    'owner', jsonb_build_object(
      'full_name',
        case when v_profile.show_owner_name then v_owner.full_name else null end,
      'phone',
        case when v_profile.show_phone then v_owner.phone else null end,
      'whatsapp_phone',
        case when v_profile.show_whatsapp then coalesce(v_owner.whatsapp_phone, v_owner.phone) else null end,
      'address_text',
        case when v_profile.show_address then v_profile.address_text else null end
    ),

    'medical', jsonb_build_object(
      'enabled', v_profile.medical_profile_enabled,
      'emergency_notes',
        case
          when v_profile.medical_profile_enabled and v_profile.show_medical_alerts
          then v_medical.emergency_notes else null
        end,
      'allergies_text',
        case
          when v_profile.medical_profile_enabled and v_profile.show_medical_alerts
          then v_medical.allergies_text else null
        end,
      'conditions_text',
        case
          when v_profile.medical_profile_enabled and v_profile.show_medical_alerts
          then v_medical.conditions_text else null
        end,
      'medications_text',
        case
          when v_profile.medical_profile_enabled and v_profile.show_medical_alerts
          then v_medical.medications_text else null
        end
    )
  );
end;
$$;


ALTER FUNCTION "public"."get_public_pet_profile_by_tag_code"("p_tag_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_public_pet_profile_by_tag_code"("p_tag_code" "text") IS 'Vista pública final del perfil por código de placa. public/private usan mensaje global; lost_mode usa mensaje personalizado obligatorio.';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (
    id,
    full_name,
    email,
    phone,
    whatsapp_phone,
    must_change_password,
    address_line,
    created_at,
    updated_at
  )
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'whatsapp_phone', '')), ''),
    false,
    nullif(trim(coalesce(new.raw_user_meta_data->>'address_line', '')), ''),
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r
      on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.code = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."refresh_pet_medical_profile_enabled"("p_pet_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_has_custom boolean;
begin
  if p_pet_id is null then
    return;
  end if;

  select exists (
    select 1
    from public.pet_tags pt
    where pt.pet_id = p_pet_id
      and pt.status = 'active'
      and pt.sold_plan_type = 'custom'
  )
  into v_has_custom;

  update public.pet_profiles
  set
    medical_profile_enabled = coalesce(v_has_custom, false),
    updated_at = now()
  where pet_id = p_pet_id;
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


CREATE OR REPLACE FUNCTION "public"."trg_refresh_pet_medical_profile_enabled"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_pet_medical_profile_enabled(new.pet_id);
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.refresh_pet_medical_profile_enabled(old.pet_id);
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.pet_id is distinct from new.pet_id then
      perform public.refresh_pet_medical_profile_enabled(old.pet_id);
      perform public.refresh_pet_medical_profile_enabled(new.pet_id);
    else
      perform public.refresh_pet_medical_profile_enabled(coalesce(new.pet_id, old.pet_id));
    end if;
    return new;
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
  select pet_id
  into v_pet_id
  from public.pet_tags
  where tag_id = p_tag_id
    and status = 'active'
  limit 1;

  update public.pet_tags
  set
    status = 'inactive',
    unassigned_at = now(),
    updated_at = now()
  where tag_id = p_tag_id
    and status = 'active';

  perform public.refresh_pet_medical_profile_enabled(v_pet_id);
end;
$$;


ALTER FUNCTION "public"."unassign_tag_from_pet"("p_tag_id" "uuid") OWNER TO "postgres";

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
    "scan_event_id" "uuid"
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
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
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
    "emergency_notes" "text",
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
    "show_reward_note" boolean DEFAULT false NOT NULL,
    "medical_profile_enabled" boolean DEFAULT false NOT NULL,
    "lost_mode_message" "text",
    "reward_text" "text",
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
    "notes" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "breed_id" "uuid",
    "breed_custom" "text",
    "sex" "public"."pet_sex_type" DEFAULT 'unknown'::"public"."pet_sex_type" NOT NULL,
    CONSTRAINT "chk_pets_breed_custom_length" CHECK ((("breed_custom" IS NULL) OR ("char_length"(TRIM(BOTH FROM "breed_custom")) >= 2)))
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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
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
    "design_type" "public"."design_type" DEFAULT 'generic'::"public"."design_type" NOT NULL,
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
    CONSTRAINT "chk_tags_code_len" CHECK (("char_length"("code") = 6))
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tags"."status" IS 'Estado operativo de la placa. lost = placa perdida. retired = fuera de uso definitivo (incluye rota/dañada).';



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



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_id_key" UNIQUE ("user_id", "role_id");



ALTER TABLE ONLY "public"."vaccine_types"
    ADD CONSTRAINT "vaccine_types_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."vaccine_types"
    ADD CONSTRAINT "vaccine_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vaccine_types"
    ADD CONSTRAINT "vaccine_types_species_name_key" UNIQUE ("species", "name");



CREATE INDEX "idx_countries_name" ON "public"."countries" USING "btree" ("name");



CREATE INDEX "idx_found_reports_pet" ON "public"."found_reports" USING "btree" ("pet_id");



CREATE INDEX "idx_found_reports_scan_event_id" ON "public"."found_reports" USING "btree" ("scan_event_id");



CREATE INDEX "idx_found_reports_status" ON "public"."found_reports" USING "btree" ("status");



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



CREATE INDEX "idx_pets_birthdate" ON "public"."pets" USING "btree" ("birthdate");



CREATE INDEX "idx_pets_breed_id" ON "public"."pets" USING "btree" ("breed_id");



CREATE INDEX "idx_pets_owner" ON "public"."pets" USING "btree" ("owner_user_id");



CREATE INDEX "idx_pets_owner_user_id" ON "public"."pets" USING "btree" ("owner_user_id");



CREATE INDEX "idx_pets_species" ON "public"."pets" USING "btree" ("species");



CREATE INDEX "idx_pets_species_active" ON "public"."pets" USING "btree" ("species", "is_active");



CREATE INDEX "idx_profiles_country" ON "public"."profiles" USING "btree" ("country_id");



CREATE INDEX "idx_profiles_country_id" ON "public"."profiles" USING "btree" ("country_id");



CREATE INDEX "idx_profiles_div1" ON "public"."profiles" USING "btree" ("division_level_1_id");



CREATE INDEX "idx_profiles_div2" ON "public"."profiles" USING "btree" ("division_level_2_id");



CREATE INDEX "idx_profiles_div3" ON "public"."profiles" USING "btree" ("division_level_3_id");



CREATE INDEX "idx_profiles_division_level_1_id" ON "public"."profiles" USING "btree" ("division_level_1_id");



CREATE INDEX "idx_profiles_division_level_2_id" ON "public"."profiles" USING "btree" ("division_level_2_id");



CREATE INDEX "idx_profiles_division_level_3_id" ON "public"."profiles" USING "btree" ("division_level_3_id");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_phone" ON "public"."profiles" USING "btree" ("phone");



CREATE INDEX "idx_referral_codes_partner" ON "public"."referral_codes" USING "btree" ("partner_id");



CREATE INDEX "idx_scan_events_created_at" ON "public"."scan_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_scan_events_pet" ON "public"."scan_events" USING "btree" ("pet_id");



CREATE INDEX "idx_scan_events_tag" ON "public"."scan_events" USING "btree" ("tag_id");



CREATE INDEX "idx_scan_events_tag_id_created_at" ON "public"."scan_events" USING "btree" ("tag_id", "created_at" DESC);



CREATE INDEX "idx_tag_activations_tag" ON "public"."tag_activations" USING "btree" ("tag_id");



CREATE INDEX "idx_tag_activations_user" ON "public"."tag_activations" USING "btree" ("activated_by_user_id");



CREATE INDEX "idx_tags_batch" ON "public"."tags" USING "btree" ("batch_code");



CREATE INDEX "idx_tags_partner" ON "public"."tags" USING "btree" ("partner_id");



CREATE INDEX "idx_tags_status" ON "public"."tags" USING "btree" ("status");



CREATE INDEX "idx_user_roles_role" ON "public"."user_roles" USING "btree" ("role_id");



CREATE INDEX "idx_user_roles_user" ON "public"."user_roles" USING "btree" ("user_id");



CREATE UNIQUE INDEX "uq_partner_users_one_primary" ON "public"."partner_users" USING "btree" ("partner_id") WHERE ("is_primary" = true);



CREATE UNIQUE INDEX "uq_pet_breeds_species_normalized_name" ON "public"."pet_breeds" USING "btree" ("species", "normalized_name");



CREATE UNIQUE INDEX "uq_pet_tags_one_active_tag" ON "public"."pet_tags" USING "btree" ("tag_id") WHERE ("status" = 'active'::"public"."pet_tag_status");



CREATE UNIQUE INDEX "uq_pet_tags_one_primary_per_pet" ON "public"."pet_tags" USING "btree" ("pet_id") WHERE (("is_primary" = true) AND ("status" = 'active'::"public"."pet_tag_status"));



CREATE OR REPLACE TRIGGER "trg_app_config_updated_at" BEFORE UPDATE ON "public"."app_config" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_order_items_updated_at" BEFORE UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_orders_set_number" BEFORE INSERT ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_order_number_if_null"();



CREATE OR REPLACE TRIGGER "trg_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_partner_leads_updated_at" BEFORE UPDATE ON "public"."partner_leads" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_partners_updated_at" BEFORE UPDATE ON "public"."partners" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_pet_medical_profiles_updated_at" BEFORE UPDATE ON "public"."pet_medical_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_pet_profiles_updated_at" BEFORE UPDATE ON "public"."pet_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_pet_tags_refresh_medical" AFTER INSERT OR DELETE OR UPDATE ON "public"."pet_tags" FOR EACH ROW EXECUTE FUNCTION "public"."trg_refresh_pet_medical_profile_enabled"();



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



CREATE POLICY "Anon can insert public found reports" ON "public"."found_reports" FOR INSERT TO "anon" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."pet_tags" "pt"
     JOIN "public"."pet_profiles" "pp" ON (("pp"."pet_id" = "pt"."pet_id")))
  WHERE (("pt"."tag_id" = "found_reports"."tag_id") AND ("pt"."pet_id" = "found_reports"."pet_id") AND ("pt"."status" = 'active'::"public"."pet_tag_status") AND ("pp"."allow_found_reports" = true) AND ("pp"."visibility_status" = ANY (ARRAY['public'::"public"."profile_visibility_status", 'lost_mode'::"public"."profile_visibility_status"]))))));



CREATE POLICY "Anon can insert public scan events" ON "public"."scan_events" FOR INSERT TO "anon" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pet_tags" "pt"
  WHERE (("pt"."tag_id" = "scan_events"."tag_id") AND ("pt"."pet_id" = "scan_events"."pet_id") AND ("pt"."status" = 'active'::"public"."pet_tag_status")))));



CREATE POLICY "Anon can view public scan events" ON "public"."scan_events" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."pet_tags" "pt"
  WHERE (("pt"."tag_id" = "scan_events"."tag_id") AND ("pt"."pet_id" = "scan_events"."pet_id") AND ("pt"."status" = 'active'::"public"."pet_tag_status")))));



CREATE POLICY "Authenticated can insert public scan events" ON "public"."scan_events" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pet_tags" "pt"
  WHERE (("pt"."tag_id" = "scan_events"."tag_id") AND ("pt"."pet_id" = "scan_events"."pet_id") AND ("pt"."status" = 'active'::"public"."pet_tag_status")))));



CREATE POLICY "Authenticated can view public scan events" ON "public"."scan_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pet_tags" "pt"
  WHERE (("pt"."tag_id" = "scan_events"."tag_id") AND ("pt"."pet_id" = "scan_events"."pet_id") AND ("pt"."status" = 'active'::"public"."pet_tag_status")))));



CREATE POLICY "Public can create found reports" ON "public"."found_reports" FOR INSERT TO "anon" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."pet_tags" "pt"
     JOIN "public"."pet_profiles" "pp" ON (("pp"."pet_id" = "pt"."pet_id")))
  WHERE (("pt"."tag_id" = "found_reports"."tag_id") AND ("pt"."pet_id" = "found_reports"."pet_id") AND ("pt"."status" = 'active'::"public"."pet_tag_status") AND ("pp"."allow_found_reports" = true) AND ("pp"."visibility_status" = ANY (ARRAY['public'::"public"."profile_visibility_status", 'lost_mode'::"public"."profile_visibility_status"]))))));



CREATE POLICY "Users can insert pet_profiles of their own pets" ON "public"."pet_profiles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_profiles"."pet_id") AND ("p"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update found_reports of their own pets" ON "public"."found_reports" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "found_reports"."pet_id") AND ("p"."owner_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "found_reports"."pet_id") AND ("p"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update pet_profiles of their own pets" ON "public"."pet_profiles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_profiles"."pet_id") AND ("p"."owner_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_profiles"."pet_id") AND ("p"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view found_reports of their own pets" ON "public"."found_reports" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "found_reports"."pet_id") AND ("p"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view pet_profiles of their own pets" ON "public"."pet_profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_profiles"."pet_id") AND ("p"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view pet_tags of their own pets" ON "public"."pet_tags" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pets" "p"
  WHERE (("p"."id" = "pet_tags"."pet_id") AND ("p"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view tags linked to their own pets" ON "public"."tags" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."pet_tags" "pt"
     JOIN "public"."pets" "p" ON (("p"."id" = "pt"."pet_id")))
  WHERE (("pt"."tag_id" = "tags"."id") AND ("p"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "admins delete order_items" ON "public"."order_items" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins delete orders" ON "public"."orders" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins delete payments" ON "public"."payments" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins insert order_items" ON "public"."order_items" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "admins insert orders" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "admins insert payments" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "admins manage app_config" ON "public"."app_config" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admins manage pet_medical_profiles" ON "public"."pet_medical_profiles" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admins manage pet_profiles" ON "public"."pet_profiles" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admins manage pet_tags" ON "public"."pet_tags" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admins manage tags" ON "public"."tags" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admins manage user_roles" ON "public"."user_roles" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admins read app_config" ON "public"."app_config" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins read found_reports" ON "public"."found_reports" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins read order_items" ON "public"."order_items" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins read orders" ON "public"."orders" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins read payments" ON "public"."payments" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins read pet_medical_profiles" ON "public"."pet_medical_profiles" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins read pet_profiles" ON "public"."pet_profiles" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins read pet_tags" ON "public"."pet_tags" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins read pets" ON "public"."pets" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins read profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins read roles" ON "public"."roles" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins read scan_events" ON "public"."scan_events" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins read tag_activations" ON "public"."tag_activations" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins read tags" ON "public"."tags" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins read user_roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins update found_reports" ON "public"."found_reports" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admins update order_items" ON "public"."order_items" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admins update orders" ON "public"."orders" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admins update payments" ON "public"."payments" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admins update pets" ON "public"."pets" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admins update profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."app_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."found_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pet_breeds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pet_medical_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pet_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pet_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public can insert found_reports" ON "public"."found_reports" FOR INSERT TO "authenticated", "anon" WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."tags" "t"
     LEFT JOIN "public"."pet_tags" "pt" ON ((("pt"."tag_id" = "t"."id") AND ("pt"."status" = 'active'::"public"."pet_tag_status"))))
     LEFT JOIN "public"."pet_profiles" "pp" ON (("pp"."pet_id" = "pt"."pet_id")))
  WHERE (("t"."id" = "found_reports"."tag_id") AND (("found_reports"."pet_id" IS NULL) OR ("pt"."pet_id" = "found_reports"."pet_id")) AND (COALESCE("pp"."allow_found_reports", true) = true)))));



CREATE POLICY "read pet breeds" ON "public"."pet_breeds" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scan_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tag_activations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users can insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "users can read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO "anon";
GRANT ALL ON SCHEMA "public" TO "authenticated";
GRANT ALL ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."activate_tag_for_pet"("p_tag_code" "text", "p_pet_id" "uuid", "p_user_id" "uuid", "p_sold_plan_type" "public"."sold_plan_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."activate_tag_for_pet"("p_tag_code" "text", "p_pet_id" "uuid", "p_user_id" "uuid", "p_sold_plan_type" "public"."sold_plan_type") TO "anon";



GRANT ALL ON FUNCTION "public"."check_tag_code"("p_tag_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_tag_code"("p_tag_code" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "anon";



GRANT ALL ON FUNCTION "public"."generate_tag_batch"("p_count" integer, "p_batch_code" "text", "p_design_type" "public"."design_type", "p_source_type" "public"."source_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_tag_batch"("p_count" integer, "p_batch_code" "text", "p_design_type" "public"."design_type", "p_source_type" "public"."source_type") TO "anon";



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



GRANT ALL ON FUNCTION "public"."get_public_pet_profile_by_tag_code"("p_tag_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_pet_profile_by_tag_code"("p_tag_code" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."mark_tag_as_lost"("p_tag_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_tag_as_lost"("p_tag_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."mark_tag_as_suspended"("p_tag_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_tag_as_suspended"("p_tag_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."refresh_pet_medical_profile_enabled"("p_pet_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_pet_medical_profile_enabled"("p_pet_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."retire_tag"("p_tag_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."retire_tag"("p_tag_id" "uuid", "p_reason" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."set_order_number_if_null"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_order_number_if_null"() TO "anon";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";



GRANT ALL ON FUNCTION "public"."trg_refresh_pet_medical_profile_enabled"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_refresh_pet_medical_profile_enabled"() TO "anon";



GRANT ALL ON FUNCTION "public"."unassign_tag_from_pet"("p_tag_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unassign_tag_from_pet"("p_tag_id" "uuid") TO "anon";


















GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."app_config" TO "authenticated";
GRANT SELECT ON TABLE "public"."app_config" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."countries" TO "authenticated";
GRANT SELECT ON TABLE "public"."countries" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."found_reports" TO "authenticated";
GRANT SELECT,INSERT ON TABLE "public"."found_reports" TO "anon";



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



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT ON TABLE "public"."profiles" TO "anon";



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




























