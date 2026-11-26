#!/bin/sh
set -e

if [ "${RUN_DB_PUSH:-true}" = "true" ]; then
  echo "[entrypoint] Syncing database schema with Prisma..."
  node ./node_modules/prisma/build/index.js db push --skip-generate
  echo "[entrypoint] Ensuring base SaaS plans exist..."
  node ./prisma/seed-plans.mjs
fi

echo "[entrypoint] Starting Next.js standalone server..."
exec node server.js
