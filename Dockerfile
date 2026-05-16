# syntax=docker/dockerfile:1
# Design System msyx.fr — image statique Caddy pour Coolify M3
# Stack : caddy:2-alpine, fichiers statiques servis depuis /srv
# Pas de build Node.js : statique pur, pas de NODE_AUTH_TOKEN requis.

FROM caddy:2-alpine

ARG SOURCE_COMMIT=unknown

# Copie des fichiers statiques (exclusions via .dockerignore)
COPY . /srv

# Injection du commit + built_at (computed UTC) dans version.json au build.
# SOURCE_COMMIT auto-injecte par Coolify v4 (laserbox confirme le pattern).
# BUILT_AT computed dans le RUN (frozen au build, immutable runtime).
RUN BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)" && \
    echo "{\"version\":\"2.58.0\",\"sha\":\"${SOURCE_COMMIT}\",\"built_at\":\"${BUILT_AT}\"}" > /srv/version.json

# Config Caddy interne au container
COPY Caddyfile.container /etc/caddy/Caddyfile

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health.json || exit 1
