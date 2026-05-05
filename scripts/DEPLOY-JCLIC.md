# Despliegue por SSH de jclic.edutictac.es

Este proyecto incluye un script para configurar hosting y desplegar nuevas versiones.

## 1) Preparar estructura remota

Desde la raiz del proyecto:

```bash
bash scripts/deploy-jclic.sh setup
```

Esto crea:

- `/home/samgua/sites/jclic.edutictac.es/releases`
- `/home/samgua/sites/jclic.edutictac.es/current` (se crea al primer deploy)
- snippet Nginx en `/home/samgua/sites/jclic.edutictac.es/nginx/jclic_static.conf`
- helper remoto con sudo en `/home/samgua/sites/jclic.edutictac.es/nginx/install-nginx-snippet.sh`

## 2) Instalar configuración Nginx

```bash
bash scripts/deploy-jclic.sh install-nginx
```

Pedira password sudo en el servidor. Este paso copia el snippet a:

- `/etc/nginx/conf.d/jclic.edutictac.es.d/jclic_static.conf`

Luego valida y recarga Nginx.

## 3) Publicar versión

```bash
bash scripts/deploy-jclic.sh deploy
```

Hace deploy atómico por releases:

- Sube todo a un release timestamped
- Actualiza `current` al release nuevo
- Mantiene solo los 5 releases más recientes

### Variante rápida (sin activities)

```bash
bash scripts/deploy-jclic.sh deploy-fast
```

Ideal para cambios de interfaz o scripts cuando no se ha modificado `activities/`.
El script intenta reutilizar automáticamente `activities/` desde la release activa anterior.

## 4) Actualizar portadas locales (opcional)

Descarga las portadas de `clic.xtec.cat` y las guarda en `assets/covers/`.
También actualiza `data/activities.json` con las rutas locales.

```bash
node scripts/cache-covers.js            # descarga portadas nuevas
node scripts/cache-covers.js --dry-run  # solo muestra qué haría
node scripts/cache-covers.js --force    # re-descarga aunque ya existan
```

Ejecutar antes de `deploy` cuando haya actividades nuevas o se quiera refrescar las imágenes.
Las portadas descargadas se incluyen en el siguiente `rsync`.

## 5) Todo en una orden

```bash
bash scripts/deploy-jclic.sh all
```

## Variables opcionales

Puedes sobrescribir parámetros sin editar el script:

```bash
REMOTE_HOST=samgua@edutictac.es REMOTE_PORT=2222 DOMAIN=jclic.edutictac.es bash scripts/deploy-jclic.sh deploy
```
