#!/bin/sh
# entrypoint.sh — genere /srv/version.json au demarrage du container
# Pattern : BUILT_AT frozen au build (fichier /built_at), SOURCE_COMMIT
# lu depuis env runtime injecte par Coolify v4 (auto via COOLIFY_BRANCH/
# COOLIFY_RESOURCE_UUID/SOURCE_COMMIT).
set -e

VERSION="2.72.0"
BUILT_AT=$(cat /built_at 2>/dev/null || echo "unknown")
SHA="${SOURCE_COMMIT:-unknown}"

cat > /srv/version.json <<EOF
{"version":"${VERSION}","sha":"${SHA}","built_at":"${BUILT_AT}"}
EOF

exec "$@"
