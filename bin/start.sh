#!/bin/sh
set -e

echo "Validating environment variables..."
node dist/utils/env.js

echo "Waiting for dependencies to become ready..."
WAITDEPS_CMD="waitdeps wait --timeout 30s --tcp-connect $DB_URI --tcp-connect $MAINNET_RPC_URL --tcp-connect $SNAPSHOT_GRAPHQL_URL"
if [ -n "$SLACK_WEBHOOK" ]; then
	WAITDEPS_CMD="$WAITDEPS_CMD --tcp-connect $SLACK_WEBHOOK"
fi

if [ -n "$SMTP_HOST" ]; then
	if [ -n "$SMTP_PORT" ]; then
		WAITDEPS_CMD="$WAITDEPS_CMD --tcp-connect $SMTP_HOST:$SMTP_PORT"
	else
		WAITDEPS_CMD="$WAITDEPS_CMD --tcp-connect $SMTP_HOST:465"
	fi
fi

$WAITDEPS_CMD

echo "Ensuring database schema is up to date..."
yarn drizzle:migrate

echo "Starting..."
exec "$@"
