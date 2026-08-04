# syntax=docker/dockerfile:1
# Design System msyx.fr — image statique Caddy pour Coolify M3
# Stack : caddy:2-alpine, fichiers statiques servis depuis /srv
# Pas de build Node.js : statique pur, pas de NODE_AUTH_TOKEN requis.

FROM caddy:2-alpine

# Copie des fichiers statiques (exclusions via .dockerignore)
COPY . /srv

# Freeze BUILT_AT au build (date UTC ISO 8601, immutable au runtime).
# SOURCE_COMMIT est injecte par Coolify v4 au RUNTIME via env var (pas au build).
# VERSION n'est PAS un ARG de build : entrypoint.sh la derive au demarrage de
# /srv/package.json (deja copie ci-dessus par COPY . /srv, cf. issue #811 —
# aucune version ne doit etre saisie en dur dans l'image). entrypoint.sh genere
# /srv/version.json au demarrage avec les 3 valeurs (VERSION/SHA/BUILT_AT).
RUN date -u +%Y-%m-%dT%H:%M:%SZ > /built_at

COPY Caddyfile.container /etc/caddy/Caddyfile
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health.json || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
