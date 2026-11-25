#!/usr/bin/env bash
# Runs supabase/schema.sql twice (it must be safe to run again) on an empty Postgres,
# then checks the access rules. Needs psql and a database URL in $DATABASE_URL.
set -euo pipefail
cd "$(dirname "$0")/../.."
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f tests/db/supabase-stub.sql
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f supabase/schema.sql 2>&1 | grep -v NOTICE || true
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f supabase/schema.sql 2>&1 | grep -v NOTICE || true
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f tests/db/rules.sql
