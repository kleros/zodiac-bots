#!/bin/sh
set -e

echo "Validating environment variables..."
node dist/utils/env.js

echo "Waiting for dependencies to become ready..."
# TODO: Perform this properly
sleep 8

echo "Ensuring database schema is up to date..."
yarn drizzle:migrate

echo "Starting..."
exec "$@"
