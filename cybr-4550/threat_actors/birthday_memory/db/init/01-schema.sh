#!/bin/sh
# Runs once, as the Postgres superuser, on first container start
# (/docker-entrypoint-initdb.d). It creates the schema and a LEAST-PRIVILEGE
# application role. The Node API connects as this role, NOT as the superuser.
#
# Required env (provided by docker-compose from .env):
#   POSTGRES_DB, POSTGRES_USER   - the bootstrap superuser (used only here)
#   APP_DB_USER, APP_DB_PASSWORD - the runtime least-privilege role
set -eu

: "${APP_DB_USER:?APP_DB_USER must be set}"
: "${APP_DB_PASSWORD:?APP_DB_PASSWORD must be set}"

psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" \
     --dbname "$POSTGRES_DB" \
     -v app_user="$APP_DB_USER" \
     -v app_pass="$APP_DB_PASSWORD" <<'SQL'
-- pgcrypto provides gen_random_uuid(). Created by the superuser here so the
-- app role never needs the CREATE privilege at runtime.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS birthdays (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name  text NOT NULL,
  last_name   text NOT NULL,
  birthdate   date NOT NULL,
  phone       text,
  email       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS birthdays_name_idx
  ON birthdays (lower(last_name), lower(first_name));

CREATE INDEX IF NOT EXISTS birthdays_month_day_idx
  ON birthdays ((EXTRACT(MONTH FROM birthdate)), (EXTRACT(DAY FROM birthdate)));

-- Least-privilege runtime role. This script runs once on a fresh volume, so the
-- role does not yet exist. It is NOT a superuser, cannot create roles/databases,
-- and has no DDL rights -- only row-level DML on the single table below.
CREATE ROLE :"app_user" LOGIN PASSWORD :'app_pass'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE thebirthdates TO :"app_user";
GRANT USAGE ON SCHEMA public TO :"app_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON birthdays TO :"app_user";
SQL

echo "[init] schema + least-privilege role '$APP_DB_USER' ready"
