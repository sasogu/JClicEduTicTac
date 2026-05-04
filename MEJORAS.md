# Propuestas de mejora para la Biblioteca JClic EduTicTac

Este documento recoge mejoras implementables para el proyecto web cuya entrada principal es `index.html`. La idea es priorizar cambios que mejoren la experiencia de uso en aula y, despues, reducir el coste de mantenimiento tecnico.

## Prioridad alta

### 1. Extraer el catalogo a un archivo JSON

Actualmente `index.html` contiene miles de enlaces y pesa alrededor de 1.45 MB. Seria mas mantenible guardar las actividades en un archivo como `data/activities.json` y renderizarlas desde `assets/app.js`.

Beneficios:

- `index.html` quedaria mucho mas pequeno y facil de leer.
- Seria mas sencillo regenerar, corregir o filtrar actividades.
- Se podrian crear nuevas vistas sin duplicar HTML.

### 2. Anadir filtros rapidos

La pagina ya tiene datos utiles en los enlaces, como `data-source`, `data-search` y `data-path`. Se podrian anadir filtros para:

- Actividades locales.
- Actividades online.
- Idioma.
- Etapa educativa.
- Area o materia.
- Actividades con o sin miniatura.

Esto haria que la biblioteca fuese mas rapida de usar cuando hay muchas actividades.

### 3. Favoritos

Permitir marcar actividades con una estrella y guardarlas en `localStorage`.

Beneficios:

- Cada docente podria tener su seleccion habitual.
- No haria falta volver a buscar las mismas actividades cada dia.
- Se podria anadir una pestana "Favoritos".

### 4. Actividades recientes

Guardar las ultimas actividades abiertas en `localStorage` y mostrarlas en una seccion o pestana "Recientes".

Es una mejora pequena, pero muy util para el uso diario.

### 5. Indicador Local / Online

Mostrar una etiqueta visual en cada actividad:

- `Local`: se abre con `play.html`.
- `Online`: se abre desde `clic.xtec.cat`.

El proyecto ya tiene esta informacion con `data-source="local"` y `data-source="online"`, asi que solo habria que convertirlo en interfaz.

## Prioridad media

### 6. Mejorar `play.html`

El reproductor local funciona, pero podria tener una barra superior sencilla con:

- Boton para volver a la biblioteca.
- Nombre de la actividad.
- Boton de pantalla completa.
- Boton de recargar actividad.

Esto haria que el reproductor fuese mas comodo en clase.

### 7. Compartir enlace de actividad

Anadir un boton para copiar el enlace de una actividad. En las actividades locales se podria copiar una URL como:

```text
play.html?project=ruta/actividad.jclic.zip
```

Seria practico para enviar actividades concretas a otros docentes o alumnado.

### 8. Mejorar la busqueda

La busqueda actual funciona, pero se podria hacer mas potente:

- Boton para limpiar la busqueda.
- Coincidencia por varias palabras separadas.
- Contador de resultados por categoria.
- Resaltado del texto encontrado.

Ejemplo: buscar `animals valencia` deberia encontrar actividades que contengan ambas palabras aunque no aparezcan juntas.

### 9. Persistir el estado de navegacion

Ademas del idioma, se podria recordar:

- Ultima vista usada.
- Ultima carpeta abierta.
- Ultima busqueda.
- Filtros activos.

Esto haria que la biblioteca se abra tal como la dejo el usuario.

### 10. Mejoras de accesibilidad

Mejoras recomendables:

- Foco visible mas claro en botones, pestanas y tarjetas.
- Roles ARIA para las pestanas.
- Mejor navegacion por teclado.
- Confirmar que el modal de creditos devuelve el foco al elemento que lo abrio.
- Revisar textos alternativos de imagenes e iconos.

## Prioridad tecnica

### 11. Crear un generador del catalogo

Crear un script que lea datos desde `library.jclic`, archivos `.jclic.inst` o carpetas del proyecto y genere automaticamente el catalogo.

Salida posible:

```text
data/activities.json
```

Ventajas:

- Menos edicion manual.
- Menos errores en rutas.
- Posibilidad de detectar duplicados.
- Facilita actualizar la biblioteca.

### 12. Validador de enlaces y archivos

Crear un script que revise:

- Actividades locales cuyo `.jclic.zip` no exista.
- Enlaces online que ya no respondan.
- Rutas con espacios o caracteres conflictivos.
- Actividades duplicadas.

Este proyecto tiene muchos recursos, asi que una validacion automatica evitaria errores silenciosos.

### 13. Modo offline con Service Worker

Anadir un service worker para cachear:

- `index.html`.
- `assets/app.js`.
- `assets/styles.css`.
- `play.html`.
- `jclic-js/jclic.min.js`.
- Iconos e imagenes principales.

Esto permitiria usar la biblioteca mejor en aulas con conexion inestable.

### 14. Convertir la biblioteca en PWA

Anadir:

- `manifest.webmanifest`.
- Iconos de instalacion.
- Service worker.
- Nombre corto y color de tema.

Asi se podria instalar como aplicacion en tablets o equipos del aula.

### 15. Reducir dependencia de miniaturas remotas

Actualmente `assets/app.js` intenta cargar miniaturas oficiales desde `https://clic.xtec.cat/projects/projects.json`. Se podria:

- Cachear esas miniaturas.
- Generar miniaturas locales.
- Guardar una miniatura por actividad en el catalogo JSON.
- Usar un marcador visual local cuando no haya imagen.

Esto haria que la biblioteca se viese mejor aunque no haya conexion.

## Orden recomendado de implementacion

1. Anadir etiquetas `Local` / `Online`.
2. Anadir favoritos.
3. Anadir actividades recientes.
4. Mejorar `play.html` con barra superior.
5. Anadir filtros rapidos.
6. Mejorar la busqueda.
7. Extraer el catalogo a `data/activities.json`.
8. Crear generador del catalogo.
9. Crear validador de enlaces.
10. Anadir modo offline y PWA.

## Primera mejora recomendada

La mejora mas equilibrada para empezar seria implementar:

- Favoritos.
- Recientes.
- Etiquetas `Local` / `Online`.

Estas tres mejoras son visibles para el usuario, aprovechan datos que ya existen en el HTML y no obligan todavia a cambiar la arquitectura del proyecto.
