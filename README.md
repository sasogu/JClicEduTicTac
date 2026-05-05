# Biblioteca JClic EduTicTac

## Valencià

Repositori d'activitats JClic en format web (HTML5), amb catàleg unificat en JSON i estructura preparada per a desplegament estàtic.

### Contingut principal

- activities/: paquets .jclic.zip organitzats per a execució local en play.html.
- data/activities.json: catàleg d'activitats utilitzat per la interfície.
- index.html: portada i navegació per seccions.
- play.html: reproductor per a activitats locals.
- assets/: estils, scripts i imatges de la interfície.
- scripts/: utilitats de manteniment i desplegament.

### Requisits

- Navegador modern.
- Servidor estàtic (opcional en local, recomanat per a evitar restriccions de file://).
- Bash i rsync per al desplegament remot amb el script inclòs.

### Ús local

Obri index.html en un servidor estàtic local.

Exemple amb Python:

```bash
python3 -m http.server 8080
```

Després visita:

- http://localhost:8080/index.html

### Desplegament

Script disponible:

- scripts/deploy-jclic.sh

Comandes suportades:

```bash
scripts/deploy-jclic.sh setup
scripts/deploy-jclic.sh install-nginx
scripts/deploy-jclic.sh deploy
scripts/deploy-jclic.sh deploy-fast
scripts/deploy-jclic.sh all
```

`deploy-fast` publica canvis rapidament sense sincronitzar `activities/`.

Variables configurables per entorn:

- REMOTE_HOST
- REMOTE_PORT
- DOMAIN
- LOCAL_DIR
- REMOTE_BASE

### Auditoria i manteniment

En el repositori hi ha utilitats per a migració i neteja del catàleg dins de scripts/.

També es poden executar auditories d'enllaços (locals i online) sobre data/activities.json per a verificar:

- existència de rutes locals,
- integritat de paquets .jclic.zip,
- disponibilitat HTTP d'enllaços online.

### Llicència

Este projecte es distribuïx sota llicència MIT.

Consulta el fitxer LICENSE per al text complet.

## Castellano

Repositorio de actividades JClic en formato web (HTML5), con catálogo unificado en JSON y estructura preparada para despliegue estático.

### Contenido principal

- activities/: paquetes .jclic.zip organizados para ejecución local en play.html.
- data/activities.json: catálogo de actividades usado por la interfaz.
- index.html: portada y navegación por secciones.
- play.html: reproductor para actividades locales.
- assets/: estilos, scripts e imágenes de la interfaz.
- scripts/: utilidades de mantenimiento y despliegue.

### Requisitos

- Navegador moderno.
- Servidor estático (opcional en local, recomendado para evitar restricciones de file://).
- Bash y rsync para despliegue remoto con el script incluido.

### Uso local

Abre index.html en un servidor estático local.

Ejemplo con Python:

```bash
python3 -m http.server 8080
```

Luego visita:

- http://localhost:8080/index.html

### Despliegue

Script disponible:

- scripts/deploy-jclic.sh

Comandos soportados:

```bash
scripts/deploy-jclic.sh setup
scripts/deploy-jclic.sh install-nginx
scripts/deploy-jclic.sh deploy
scripts/deploy-jclic.sh deploy-fast
scripts/deploy-jclic.sh all
```

`deploy-fast` publica cambios rapidamente sin sincronizar `activities/`.

Variables configurables por entorno:

- REMOTE_HOST
- REMOTE_PORT
- DOMAIN
- LOCAL_DIR
- REMOTE_BASE

### Auditoría y mantenimiento

En el repositorio hay utilidades para migración y limpieza del catálogo dentro de scripts/.

También se pueden ejecutar auditorías de enlaces (locales y online) sobre data/activities.json para verificar:

- existencia de rutas locales,
- integridad de paquetes .jclic.zip,
- disponibilidad HTTP de enlaces online.

### Licencia

Este proyecto se distribuye bajo licencia MIT.

Consulta el archivo LICENSE para el texto completo.
