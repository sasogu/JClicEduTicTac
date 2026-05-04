const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'data', 'activities.json');
const activitiesDirName = 'activities';
const activitiesDir = path.join(root, activitiesDirName);

function readCatalog() {
  return JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
}

function writeCatalog(catalog) {
  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
}

function decodeProject(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function encodeProject(value) {
  return value.split('/').map(encodeURIComponent).join('/');
}

function getProjectFromHref(href) {
  const match = String(href || '').match(/^play\.html\?project=([^#&]+)/);
  return match ? decodeProject(match[1]) : '';
}

function isMigratableLocalActivity(activity) {
  if (!activity || activity.source !== 'local') return false;
  if (activity.popup) return false;
  return !!getProjectFromHref(activity.href);
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

function getMoveRoot(project) {
  const clean = project.replace(/\\/g, '/').replace(/^\.\//, '');
  const first = clean.split('/').filter(Boolean)[0];
  return first || clean;
}

function prefixedProject(project) {
  const clean = project.replace(/\\/g, '/').replace(/^\.\//, '');
  return clean.startsWith(`${activitiesDirName}/`) ? clean : `${activitiesDirName}/${clean}`;
}

function updateActivity(activity) {
  if (!isMigratableLocalActivity(activity)) return;

  const project = getProjectFromHref(activity.href);
  const nextProject = prefixedProject(project);
  activity.href = `play.html?project=${encodeProject(nextProject)}`;
  activity.path = prefixedProject(activity.path || project);
}

function collectMoveRoots(catalog) {
  const roots = new Set();
  forEachActivity(catalog, (activity) => {
    if (!isMigratableLocalActivity(activity)) return;
    const project = getProjectFromHref(activity.href);
    if (project.startsWith(`${activitiesDirName}/`)) return;
    roots.add(getMoveRoot(project));
  });
  return Array.from(roots).sort((a, b) => a.localeCompare(b, 'es'));
}

function moveRoot(moveRoot) {
  const source = path.join(root, moveRoot);
  const target = path.join(activitiesDir, moveRoot);

  if (!fs.existsSync(source)) {
    if (fs.existsSync(target)) return { root: moveRoot, status: 'already-moved' };
    return { root: moveRoot, status: 'missing' };
  }

  if (fs.existsSync(target)) {
    return { root: moveRoot, status: 'target-exists' };
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.renameSync(source, target);
  return { root: moveRoot, status: 'moved' };
}

function main() {
  const catalog = readCatalog();
  const roots = collectMoveRoots(catalog);
  fs.mkdirSync(activitiesDir, { recursive: true });

  const results = roots.map(moveRoot);
  const blocked = results.filter((result) => result.status === 'missing' || result.status === 'target-exists');
  if (blocked.length) {
    console.error('No se ha actualizado el catalogo porque hay rutas con problemas:');
    blocked.forEach((result) => console.error(`- ${result.root}: ${result.status}`));
    process.exitCode = 1;
    return;
  }

  forEachActivity(catalog, updateActivity);
  catalog.localActivitiesBase = activitiesDirName;
  writeCatalog(catalog);

  const moved = results.filter((result) => result.status === 'moved').length;
  const alreadyMoved = results.filter((result) => result.status === 'already-moved').length;
  console.log(`Raices locales detectadas: ${roots.length}`);
  console.log(`Movidas a ${activitiesDirName}/: ${moved}`);
  console.log(`Ya estaban movidas: ${alreadyMoved}`);
  console.log(`Catalogo actualizado: ${path.relative(root, catalogPath)}`);
}

main();
