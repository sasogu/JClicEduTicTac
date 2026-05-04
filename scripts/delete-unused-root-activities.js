const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'data', 'activities.json');

const appRoots = new Set([
  '.git',
  'activities',
  'assets',
  'data',
  'jclic-js',
  'scripts',
]);

const appFiles = new Set([
  'MEJORAS.md',
  'credits.jclic',
  'deleted-online-backed-activities.json',
  'index.html',
  'jclic.cfg',
  'library.jclic',
  'online-activities.json',
  'online-link-audit.json',
  'play.html',
]);

const imageExt = new Set(['.gif', '.ico', '.jpeg', '.jpg', '.png', '.svg', '.webp']);

function decodeProject(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getProjectFromHref(href) {
  const match = String(href || '').match(/^play\.html\?project=([^#&]+)/);
  return match ? decodeProject(match[1]) : '';
}

function forEachActivity(catalog, callback) {
  function walk(section) {
    (section.activities || []).forEach(callback);
    (section.sections || []).forEach(walk);
  }

  const library = catalog.library || {};
  (library.sections || []).forEach(walk);
  (library.activities || []).forEach(callback);
  (catalog.allActivities || []).forEach(callback);
}

function collectReferencedRoots(catalog) {
  const localRoots = new Set();
  const onlineRoots = new Set();

  forEachActivity(catalog, (activity) => {
    const catalogPathValue = String(activity.path || '').replace(/^activities\//, '');
    const catalogRoot = catalogPathValue.split('/')[0];

    if (activity.source === 'local' && !activity.popup) {
      const project = getProjectFromHref(activity.href).replace(/^activities\//, '');
      if (project) localRoots.add(project.split('/')[0]);
    }

    if (activity.source === 'online' && catalogRoot) {
      onlineRoots.add(catalogRoot);
    }
  });

  return { localRoots, onlineRoots };
}

function looksLikeActivityDir(name) {
  const entries = fs.readdirSync(path.join(root, name));
  return entries.some((entry) => (
    entry.endsWith('.jclic') ||
    entry.endsWith('.jclic.inst') ||
    entry.endsWith('.jclic.zip')
  ));
}

function looksLikeActivityFile(name) {
  return name.endsWith('.jclic') || name.endsWith('.jclic.inst') || name.endsWith('.jclic.zip');
}

function getSize(targetPath) {
  const stat = fs.lstatSync(targetPath);
  if (!stat.isDirectory()) return stat.size;

  return fs.readdirSync(targetPath).reduce((total, child) => (
    total + getSize(path.join(targetPath, child))
  ), 0);
}

function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

function findCandidates() {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const { localRoots, onlineRoots } = collectReferencedRoots(catalog);
  const candidates = [];

  fs.readdirSync(root, { withFileTypes: true }).forEach((entry) => {
    const name = entry.name;
    if (appRoots.has(name) || appFiles.has(name)) return;
    if (imageExt.has(path.extname(name).toLowerCase())) return;
    if (localRoots.has(name)) return;

    const isActivity = entry.isDirectory() ? looksLikeActivityDir(name) : looksLikeActivityFile(name);
    if (!isActivity) return;

    const targetPath = path.join(root, name);
    candidates.push({
      name,
      onlineBacked: onlineRoots.has(name),
      size: getSize(targetPath),
      targetPath,
    });
  });

  candidates.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return candidates;
}

function removeCandidate(candidate) {
  fs.rmSync(candidate.targetPath, { recursive: true, force: false });
}

function main() {
  const shouldDelete = process.argv.includes('--delete');
  const onlineBackedOnly = process.argv.includes('--online-backed-only');
  const candidates = findCandidates();
  const onlineBacked = candidates.filter((candidate) => candidate.onlineBacked);
  const other = candidates.filter((candidate) => !candidate.onlineBacked);
  const selected = onlineBackedOnly ? onlineBacked : candidates;
  const totalSize = candidates.reduce((total, candidate) => total + candidate.size, 0);
  const onlineSize = onlineBacked.reduce((total, candidate) => total + candidate.size, 0);
  const otherSize = other.reduce((total, candidate) => total + candidate.size, 0);
  const selectedSize = selected.reduce((total, candidate) => total + candidate.size, 0);

  console.log(`Candidatos no usados en raiz: ${candidates.length} (${formatSize(totalSize)})`);
  console.log(`Con respaldo online en catalogo: ${onlineBacked.length} (${formatSize(onlineSize)})`);
  console.log(`Sin respaldo online detectado: ${other.length} (${formatSize(otherSize)})`);
  console.log(`Seleccionados para borrar: ${selected.length} (${formatSize(selectedSize)})`);

  if (!shouldDelete) {
    const mode = onlineBackedOnly ? '--online-backed-only --delete' : '--delete';
    console.log(`\nModo seco. Usa ${mode} para borrar estos candidatos.`);
    console.log('\nPrimeros candidatos:');
    selected.slice(0, 80).forEach((candidate) => {
      console.log(`${formatSize(candidate.size)}\t${candidate.onlineBacked ? 'online' : 'unused'}\t${candidate.name}`);
    });
    return;
  }

  selected.forEach(removeCandidate);
  console.log(`\nBorrados: ${selected.length} (${formatSize(selectedSize)})`);
}

main();
