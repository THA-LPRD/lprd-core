#!/bin/sh
set -e

# Set defaults
PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "Setting up user with PUID=${PUID} and PGID=${PGID}..."

# Get current bun user UID/GID
CURRENT_UID=$(id -u bun 2>/dev/null || echo "")
CURRENT_GID=$(id -g bun 2>/dev/null || echo "")

# Modify bun user if UID/GID doesn't match
if [ "$CURRENT_UID" != "$PUID" ] || [ "$CURRENT_GID" != "$PGID" ]; then
    echo "Updating bun user to UID=${PUID} GID=${PGID}..."
    userdel bun 2>/dev/null || true
    groupdel bun 2>/dev/null || true
    groupadd -g ${PGID} bun
    useradd -u ${PUID} -g bun -s /bin/sh -M bun
fi

# Fix ownership of application files and directories
echo "Fixing file permissions..."
chown -R bun:bun /app

echo "Starting lprd-core on port ${PORT:-3000}..."
cd /app/apps/core
exec gosu bun node server.js
