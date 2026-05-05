#!/usr/bin/env node
/**
 * Descarga portadas de clic.xtec.cat y actualiza data/activities.json.
 *
 * Uso:
 *   node scripts/cache-covers.js            # descarga portadas nuevas
 *   node scripts/cache-covers.js --dry-run  # solo muestra qué haría
 *   node scripts/cache-covers.js --force    # re-descarga aunque ya existan
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ACTIVITIES_JSON = path.join(ROOT, 'data', 'activities.json');
const COVERS_DIR = path.join(ROOT, 'assets', 'covers');
const PROJECTS_INDEX = 'https://clic.xtec.cat/projects/projects.json';
const PROJECTS_BASE = 'https://clic.xtec.cat/projects';
const CONCURRENCY = 8;

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

// --- Normalización (espejo de app.js) ---

function normalizePath(value) {
  return decodeURIComponent((value || '').trim())
    .replace(/^\.\//, '')
    .toLocaleLowerCase('es');
}

function stripLocalBase(value) {
  return value.startsWith('activities/') ? value.slice('activities/'.length) : value;
}

function getPathCandidates(value) {
  const clean = normalizePath(value).split(/[?#]/)[0].replace(/\\/g, '/');
  if (!clean) return [];

  const segments = clean.split('/').filter(Boolean);
  const candidates = new Set([clean]);

  const unprefixed = stripLocalBase(clean);
  if (unprefixed !== clean) candidates.add(unprefixed);

  if (segments.length) {
    candidates.add(segments[0]);
    const last = segments[segments.length - 1];
    candidates.add(last);
    candidates.add(last.replace(/\.(jclic\.zip|jclic|zip|html?)$/i, ''));
  }

  if (segments.length > 1) {
    candidates.add(segments.slice(0, -1).join('/'));
    candidates.add(`${segments[0]}/${segments[1]}`);
  }

  return Array.from(candidates);
}

// --- Descarga con cola de concurrencia ---

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, Buffer.from(buf));
}

async function runWithConcurrency(tasks, limit) {
  const queue = [...tasks];
  const active = new Set();

  function next() {
    if (!queue.length) return Promise.resolve();
    const task = queue.shift();
    const p = task().finally(() => {
      active.delete(p);
      return next();
    });
    active.add(p);
    return p;
  }

  const starters = Array.from({ length: Math.min(limit, tasks.length) }, next);
  await Promise.all(starters);
}

// --- Recorre secciones recursivamente ---

function* walkSections(sections) {
  for (const section of sections || []) {
    yield* (section.activities || []);
    yield* walkSections(section.sections);
  }
}

// --- Main ---

async function main() {
  console.log('Descargando índice de proyectos de clic.xtec.cat...');
  const indexRes = await fetch(PROJECTS_INDEX);
  if (!indexRes.ok) throw new Error(`No se pudo descargar ${PROJECTS_INDEX}: HTTP ${indexRes.status}`);
  const projects = await indexRes.json();

  // Construye mapa normalizedPath → { remoteUrl, localRelPath, rawPath }
  const pathMap = new Map();
  for (const project of projects) {
    const p = normalizePath(project.path);
    const file = project.coverWebp || project.cover || project.thumbnail;
    if (!p || !file) continue;

    const entry = {
      remoteUrl: `${PROJECTS_BASE}/${project.path}/${file}`,
      localRelPath: `assets/covers/${p}/${file}`,
      destPath: path.join(ROOT, 'assets', 'covers', p, file),
    };

    pathMap.set(p, entry);
    const first = p.split('/')[0];
    if (first && !pathMap.has(first)) pathMap.set(first, entry);
  }

  console.log(`Índice cargado: ${projects.length} proyectos, ${pathMap.size} entradas en mapa.`);

  const catalog = JSON.parse(fs.readFileSync(ACTIVITIES_JSON, 'utf8'));

  // Todas las actividades: allActivities + las de las secciones del library
  const allActivities = catalog.allActivities || [];
  const libraryActivities = Array.from(walkSections(catalog.library?.sections));

  // Construye mapa path → cover a partir de allActivities (evita buscar dos veces)
  const coverByKey = new Map();
  for (const activity of allActivities) {
    if (activity.thumbnail) continue;
    const candidates = getPathCandidates(activity.path || activity.href || '');
    for (const c of candidates) {
      const entry = pathMap.get(c);
      if (entry) {
        coverByKey.set(activity.path || activity.href, entry);
        break;
      }
    }
  }

  // Aplica a allActivities
  let matchedAll = 0;
  for (const activity of allActivities) {
    if (activity.thumbnail) continue;
    const entry = coverByKey.get(activity.path || activity.href);
    if (entry) {
      activity.thumbnail = entry.localRelPath;
      matchedAll++;
    }
  }

  // Aplica a library (misma lógica de búsqueda, independiente)
  let matchedLib = 0;
  for (const activity of libraryActivities) {
    if (activity.thumbnail) continue;
    const candidates = getPathCandidates(activity.path || activity.href || '');
    for (const c of candidates) {
      const entry = pathMap.get(c);
      if (entry) {
        activity.thumbnail = entry.localRelPath;
        matchedLib++;
        break;
      }
    }
  }

  // Imágenes únicas a descargar
  const toDownload = new Map();
  for (const entry of coverByKey.values()) {
    toDownload.set(entry.destPath, entry.remoteUrl);
  }

  console.log(`Portadas encontradas: ${matchedAll} en allActivities, ${matchedLib} en library.`);
  console.log(`Imágenes únicas a descargar: ${toDownload.size}`);

  if (DRY_RUN) {
    console.log('[dry-run] Sin cambios en disco ni en activities.json.');
    return;
  }

  // Descarga con concurrencia
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  const tasks = Array.from(toDownload.entries()).map(([destPath, remoteUrl]) => async () => {
    if (!FORCE && fs.existsSync(destPath)) {
      skipped++;
      return;
    }
    try {
      await downloadFile(remoteUrl, destPath);
      downloaded++;
      if ((downloaded + failed) % 50 === 0) {
        console.log(`  progreso: ${downloaded + skipped} / ${toDownload.size}...`);
      }
    } catch (e) {
      failed++;
      console.warn(`  FALLO ${remoteUrl}: ${e.message}`);
    }
  });

  await runWithConcurrency(tasks, CONCURRENCY);

  console.log(`Descargadas: ${downloaded}, omitidas (ya existían): ${skipped}, fallidas: ${failed}`);

  fs.writeFileSync(ACTIVITIES_JSON, JSON.stringify(catalog, null, 2) + '\n');
  console.log('activities.json actualizado con rutas locales de portadas.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
