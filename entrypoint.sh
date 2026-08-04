#!/bin/sh
# entrypoint.sh — genere /srv/version.json au demarrage du container
# Pattern : BUILT_AT frozen au build (fichier /built_at), SOURCE_COMMIT
# lu depuis env runtime injecte par Coolify v4 (auto via COOLIFY_BRANCH/
# COOLIFY_RESOURCE_UUID/SOURCE_COMMIT).
# VERSION derivee de /srv/package.json au demarrage (issue #811) — jamais
# saisie en dur. package.json est deja copie dans l'image par `COPY . /srv`
# du Dockerfile (non exclu par .dockerignore) : le lire au runtime evite
# d'ajouter un ARG/ENV de build et reste coherent avec SOURCE_COMMIT, deja
# resolu a l'execution plutot qu'au build.
set -e

VERSION=$(grep -E '"version"[[:space:]]*:' /srv/package.json 2>/dev/null | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || true)
VERSION="${VERSION:-unknown}"
BUILT_AT=$(cat /built_at 2>/dev/null || echo "unknown")
SHA="${SOURCE_COMMIT:-unknown}"

cat > /srv/version.json <<EOF
{"version":"${VERSION}","sha":"${SHA}","built_at":"${BUILT_AT}"}
EOF

exec "$@"
