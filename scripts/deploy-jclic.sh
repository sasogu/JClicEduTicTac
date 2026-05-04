#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-samgua@edutictac.es}"
REMOTE_PORT="${REMOTE_PORT:-2222}"
DOMAIN="${DOMAIN:-jclic.edutictac.es}"
LOCAL_DIR="${LOCAL_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
REMOTE_BASE="${REMOTE_BASE:-/home/samgua/sites/${DOMAIN}}"
REMOTE_RELEASES="${REMOTE_BASE}/releases"
REMOTE_CURRENT="${REMOTE_BASE}/current"
NGINX_SNIPPET_NAME="jclic_static.conf"

usage() {
  cat <<EOF
Uso:
  scripts/deploy-jclic.sh setup
  scripts/deploy-jclic.sh install-nginx
  scripts/deploy-jclic.sh deploy
  scripts/deploy-jclic.sh all

Variables opcionales:
  REMOTE_HOST=samgua@edutictac.es
  REMOTE_PORT=2222
  DOMAIN=jclic.edutictac.es
  LOCAL_DIR=/ruta/local/del/proyecto
  REMOTE_BASE=/home/samgua/sites/jclic.edutictac.es
EOF
}

setup_remote_structure() {
  echo "[setup] Creando estructura remota en ${REMOTE_BASE}"
  ssh -p "${REMOTE_PORT}" "${REMOTE_HOST}" "mkdir -p '${REMOTE_RELEASES}' '${REMOTE_BASE}/shared' '${REMOTE_BASE}/nginx'"

  echo "[setup] Generando snippet Nginx remoto en ${REMOTE_BASE}/nginx/${NGINX_SNIPPET_NAME}"
  ssh -p "${REMOTE_PORT}" "${REMOTE_HOST}" "cat > '${REMOTE_BASE}/nginx/${NGINX_SNIPPET_NAME}' <<'EOF'
# Publicacion estatica de ${DOMAIN}
location / {
  # YunoHost/SSOwat bypass for this public static subdomain
  access_by_lua_block {
    ngx.req.set_header('X-Jclic-Public', '1')
  }
    root ${REMOTE_CURRENT};
    index index.html;
    try_files \$uri \$uri/ /index.html;
}

# Evita exponer ficheros ocultos
location ~ /\.(?!well-known).* {
    deny all;
}
EOF"

  echo "[setup] Generando helper de instalacion con sudo"
  ssh -p "${REMOTE_PORT}" "${REMOTE_HOST}" "cat > '${REMOTE_BASE}/nginx/install-nginx-snippet.sh' <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

DOMAIN='${DOMAIN}'
REMOTE_BASE='${REMOTE_BASE}'
SNIPPET='${NGINX_SNIPPET_NAME}'
TARGET_DIR="/etc/nginx/conf.d/${DOMAIN}.d"
TARGET_FILE="\${TARGET_DIR}/${NGINX_SNIPPET_NAME}"

sudo mkdir -p "\${TARGET_DIR}"
sudo cp "${REMOTE_BASE}/nginx/${NGINX_SNIPPET_NAME}" "\${TARGET_FILE}"
sudo nginx -t
sudo systemctl reload nginx

echo "Snippet instalado en \${TARGET_FILE}"
EOF
chmod +x '${REMOTE_BASE}/nginx/install-nginx-snippet.sh'"

  echo "[setup] Hecho. Siguiente paso: scripts/deploy-jclic.sh install-nginx"
}

install_nginx_snippet() {
  echo "[nginx] Ejecutando instalacion del snippet (pedira password sudo)"
  ssh -t -p "${REMOTE_PORT}" "${REMOTE_HOST}" "bash '${REMOTE_BASE}/nginx/install-nginx-snippet.sh'"
}

deploy_release() {
  local ts release
  ts="$(date +%Y%m%d%H%M%S)"
  release="${REMOTE_RELEASES}/${ts}"

  echo "[deploy] Creando release remoto ${release}"
  ssh -p "${REMOTE_PORT}" "${REMOTE_HOST}" "mkdir -p '${release}'"

  echo "[deploy] Subiendo archivos con rsync"
  rsync -az --delete \
    --exclude '.git' \
    --exclude '.vscode' \
    --exclude 'scripts' \
    --exclude '.DS_Store' \
    -e "ssh -p ${REMOTE_PORT}" \
    "${LOCAL_DIR}/" "${REMOTE_HOST}:${release}/"

  echo "[deploy] Activando release"
  ssh -p "${REMOTE_PORT}" "${REMOTE_HOST}" "ln -sfn '${release}' '${REMOTE_CURRENT}'"

  echo "[deploy] Limpiando releases antiguos (mantener 5)"
  ssh -p "${REMOTE_PORT}" "${REMOTE_HOST}" "cd '${REMOTE_RELEASES}' && ls -1dt */ 2>/dev/null | tail -n +6 | xargs -r rm -rf"

  echo "[deploy] OK: https://${DOMAIN}"
}

cmd="${1:-}"
case "${cmd}" in
  setup)
    setup_remote_structure
    ;;
  install-nginx)
    install_nginx_snippet
    ;;
  deploy)
    deploy_release
    ;;
  all)
    setup_remote_structure
    install_nginx_snippet
    deploy_release
    ;;
  *)
    usage
    exit 1
    ;;
esac
