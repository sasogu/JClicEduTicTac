const CATALOG_URL = 'data/activities.json';
const LOCAL_ACTIVITIES_BASE = 'activities';
const PLAYBACK_CONTEXT_KEY = 'jclic-playback-context';
const FAVORITES_STORAGE_KEY = 'jclic-favorites';

async function loadCatalog() {
  const response = await fetch(CATALOG_URL);
  if (!response.ok) throw new Error(`No se pudo cargar ${CATALOG_URL}`);
  return response.json();
}

function buildPlayerHref(activity) {
  if (!activity) return '#';
  if (activity.source === 'online' && activity.path) {
    return `play.html?project=${encodeURIComponent(activity.path)}&online=${encodeURIComponent(activity.href || '')}`;
  }
  if (activity.path) {
    return `play.html?project=${encodeURIComponent(activity.path)}`;
  }
  return activity.href || '#';
}

function getActivityKey(activity) {
  return String(activity?.path || activity?.href || '').trim();
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return new Set();
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return new Set();
    return new Set(data.filter((item) => typeof item === 'string' && item.trim()));
  } catch (error) {
    console.warn('No se pudieron cargar favoritos.', error);
    return new Set();
  }
}

function saveFavorites(favorites) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favorites)));
  } catch (error) {
    console.warn('No se pudieron guardar favoritos.', error);
  }
}

function createActivityLink(activity, mode) {
  const link = document.createElement('a');
  link.className = mode === 'card' ? 'card' : 'activity-row';
  link.href = buildPlayerHref(activity);
  link.target = '_self';
  link.dataset.activityKey = getActivityKey(activity);
  link.dataset.source = activity.source || '';
  link.dataset.search = activity.search || '';
  link.dataset.path = activity.path || '';
  if (activity.popup) link.dataset.popup = activity.popup;

  // Crear botón de copiar enlace
  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'copy-link-btn';
  copyBtn.title = 'Copiar enlace';
  copyBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

  copyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const absUrl = `${window.location.origin}/${buildPlayerHref(activity)}`;
    navigator.clipboard.writeText(absUrl).then(() => {
      showCopyMessage(copyBtn, '¡Enlace copiado!');
    });
  });

  function showCopyMessage(btn, msg) {
    let msgDiv = document.createElement('span');
    msgDiv.className = 'copy-link-msg';
    msgDiv.textContent = msg;
    btn.parentNode.appendChild(msgDiv);
    setTimeout(() => {
      msgDiv.remove();
    }, 1200);
  }

  const favoriteBtn = document.createElement('button');
  favoriteBtn.type = 'button';
  favoriteBtn.className = 'favorite-btn';
  favoriteBtn.title = 'Marcar como favorita';
  favoriteBtn.setAttribute('aria-label', 'Marcar como favorita');
  favoriteBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';

  if (mode === 'card') {
    if (activity.thumbnail) {
      const thumbnail = document.createElement('img');
      thumbnail.className = 'card-thumb';
      thumbnail.src = activity.thumbnail;
      thumbnail.alt = activity.thumbnailAlt || '';
      link.appendChild(thumbnail);
    }

    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = activity.title || '';
    link.appendChild(title);

    const category = document.createElement('div');
    category.className = 'category';
    category.textContent = activity.category || '';
    link.appendChild(category);

    const cardActions = document.createElement('div');
    cardActions.className = 'card-actions';
    cardActions.appendChild(favoriteBtn);
    cardActions.appendChild(copyBtn);
    link.appendChild(cardActions);
    return link;
  }

  const title = document.createElement('span');
  title.className = 'activity-title';
  title.textContent = activity.title || '';
  if (activity.thumbnail) {
    const thumbnail = document.createElement('img');
    thumbnail.className = 'activity-thumb';
    thumbnail.src = activity.thumbnail;
    thumbnail.alt = activity.thumbnailAlt || '';
    link.appendChild(thumbnail);
  }
  link.appendChild(title);
  const rowActions = document.createElement('div');
  rowActions.className = 'card-actions';
  rowActions.appendChild(favoriteBtn);
  rowActions.appendChild(copyBtn);
  link.appendChild(rowActions);
  return link;
}

function createSection(section) {
  const details = document.createElement('details');
  details.className = `tree-section depth-${section.depth || 1}`;
  details.dataset.title = section.title || '';
  if ((section.depth || 1) === 1) details.open = true;

  const summary = document.createElement('summary');
  if (section.icon) {
    const icon = document.createElement('img');
    icon.className = 'section-icon';
    icon.src = section.icon;
    icon.alt = '';
    summary.appendChild(icon);
  } else {
    const mark = document.createElement('span');
    mark.className = 'section-mark';
    summary.appendChild(mark);
  }

  const label = document.createElement('span');
  label.textContent = section.title || '';
  summary.appendChild(label);
  details.appendChild(summary);

  const children = document.createElement('div');
  children.className = 'tree-children';
  (section.sections || []).forEach((childSection) => {
    children.appendChild(createSection(childSection));
  });
  (section.activities || []).forEach((activity) => {
    children.appendChild(createActivityLink(activity, 'row'));
  });
  details.appendChild(children);

  return details;
}

function renderCatalog(catalog) {
  const libraryRoot = document.querySelector('#libraryView .library-tree');
  const allGrid = document.querySelector('#allView .grid');
  if (!libraryRoot || !allGrid) throw new Error('Faltan contenedores para renderizar el catalogo');

  libraryRoot.textContent = '';
  allGrid.textContent = '';

  const library = Array.isArray(catalog.library)
    ? { sections: catalog.library, activities: [] }
    : (catalog.library || { sections: [], activities: [] });

  (library.sections || []).forEach((section) => {
    libraryRoot.appendChild(createSection(section));
  });
  (library.activities || []).forEach((activity) => {
    libraryRoot.appendChild(createActivityLink(activity, 'row'));
  });
  (catalog.allActivities || []).forEach((activity) => {
    allGrid.appendChild(createActivityLink(activity, 'card'));
  });
}

async function bootstrap() {
const catalog = await loadCatalog();
renderCatalog(catalog);

const search = document.getElementById('search');
const visibleCount = document.getElementById('visibleCount');
const countLabel = document.getElementById('countLabel');
const totalUnique = document.getElementById('totalUnique');
const empty = document.getElementById('empty');
const tabs = document.querySelectorAll('.tab');
const creditsModal = document.getElementById('creditsModal');
const creditsClose = document.getElementById('creditsClose');
const libraryView = document.getElementById('libraryView');
const libraryRoot = document.querySelector('#libraryView .library-tree');
const libraryBack = document.getElementById('libraryBack');
const libraryBreadcrumb = document.getElementById('libraryBreadcrumb');
const libraryCurrent = document.getElementById('libraryCurrent');
const languageSelect = document.getElementById('languageSelect');
const allCards = Array.from(document.querySelectorAll('#allView .card'));
const favoritesGrid = document.querySelector('#favoritesView .grid');
const pageTitle = document.querySelector('title');
const headerTitle = document.querySelector('.header-inner h1');
const tabLibrary = document.querySelector('.tab[data-view="libraryView"]');
const tabAll = document.querySelector('.tab[data-view="allView"]');
const tabFavorites = document.querySelector('.tab[data-view="favoritesView"]');
const creditsTriggerTitle = document.querySelector('[data-popup="credits"] .activity-title');
const creditsKicker = document.querySelector('.credits-kicker');
const creditsSubtitle = document.querySelector('.credits-subtitle');
const creditsCopyParagraphs = Array.from(document.querySelectorAll('.credits-copy p'));
let activityIconsReady = false;
let remoteCoversReady = false;
const REMOTE_PROJECTS_BASE = 'https://clic.xtec.cat/projects';
const REMOTE_PROJECTS_INDEX = `${REMOTE_PROJECTS_BASE}/projects.json`;
const REMOTE_COVERS_CACHE_KEY = 'jclic-remote-covers-v1';
const REMOTE_COVERS_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const LOCALE_STORAGE_KEY = 'jclic-ui-locale';
const favorites = loadFavorites();
const activityIndex = new Map();

function registerActivities(node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((item) => registerActivities(item));
    return;
  }
  if (node.href || node.path) {
    const key = getActivityKey(node);
    if (key && !activityIndex.has(key)) activityIndex.set(key, node);
  }
  if (Array.isArray(node.activities)) registerActivities(node.activities);
  if (Array.isArray(node.sections)) registerActivities(node.sections);
}

registerActivities(catalog.allActivities || []);
registerActivities(catalog.library || {});
const messages = {
  es: {
    htmlLang: 'es',
    pageTitle: 'Biblioteca JClic EduTicTac',
    headerTitle: 'Biblioteca JClic EduTicTac',
    tabLibrary: 'Biblioteca',
    tabAll: 'Todas las actividades',
    tabFavorites: 'Favoritos',
    searchPlaceholder: 'Buscar actividad',
    languageLabel: 'Idioma',
    languageAuto: 'Auto',
    languageEs: 'Castellano',
    languageVa: 'Valenciano',
    back: 'Volver',
    root: 'Biblioteca',
    countInLibrary: 'en la biblioteca',
    countInFolder: 'en esta carpeta',
    visible: 'visibles',
    empty: 'No hay actividades que coincidan con la busqueda.',
    foundInLibraryOne: '1 actividad encontrada en la biblioteca',
    foundInLibraryMany: (count) => `${count} actividades encontradas en la biblioteca`,
    activityOne: '1 actividad',
    activityMany: (count) => `${count} actividades`,
    folderOne: '1 carpeta',
    folderMany: (count) => `${count} carpetas`,
    directOne: '1 acceso directo',
    directMany: (count) => `${count} accesos directos`,
    closeCredits: 'Cerrar creditos',
    creditsTitle: 'Creditos',
    creditsSubtitle: 'Comunidad EduTicTac. Un poco de historia.',
    creditsP1: 'La biblioteca Ratoli la crearon maestros del colegio Jaime Balmes en el ano 2003 en un grupo de trabajo para el CEFIRE de Elx coordinado por Alvaro Baixauli.',
    creditsP2: 'La biblioteca se ha ido actualizando gracias principalmente al trabajo de Alvaro, Samuel y otros miembros de la Comunidad Edutictac que suelen hacer correcciones y propuestas de mejora.',
    creditsP3: 'Esperamos que nuestro trabajo os sea de provecho. Si quieres hacer alguna sugerencia te esperamos en el foro de la Comunidad.'
  },
  va: {
    htmlLang: 'ca',
    pageTitle: 'Biblioteca JClic EduTicTac',
    headerTitle: 'Biblioteca JClic EduTicTac',
    tabLibrary: 'Biblioteca',
    tabAll: 'Totes les activitats',
    tabFavorites: 'Favorits',
    searchPlaceholder: 'Buscar activitat',
    languageLabel: 'Idioma',
    languageAuto: 'Automatic',
    languageEs: 'Castella',
    languageVa: 'Valencia',
    back: 'Tornar',
    root: 'Biblioteca',
    countInLibrary: 'a la biblioteca',
    countInFolder: 'en esta carpeta',
    visible: 'visibles',
    empty: 'No hi ha activitats que coincidisquen amb la busca.',
    foundInLibraryOne: '1 activitat trobada a la biblioteca',
    foundInLibraryMany: (count) => `${count} activitats trobades a la biblioteca`,
    activityOne: '1 activitat',
    activityMany: (count) => `${count} activitats`,
    folderOne: '1 carpeta',
    folderMany: (count) => `${count} carpetes`,
    directOne: '1 acces directe',
    directMany: (count) => `${count} accessos directes`,
    closeCredits: 'Tancar credits',
    creditsTitle: 'Credits',
    creditsSubtitle: 'Comunitat EduTicTac. Un poquet d\'historia.',
    creditsP1: 'La biblioteca Ratoli la van crear mestres del col.legi Jaime Balmes l\'any 2003 en grup de treball per al CEFIRE d\'Elx coordinat per Alvaro Baixauli.',
    creditsP2: 'La biblioteca ha anat actualitzant-se gracies principalment al treball d\'Alvaro, Samuel i altres membres de la Comunitat Edutictac que sovint fan rectificacions i propostes de millora.',
    creditsP3: 'Esperem que la nostra faena vos siga de profit. Si vols fer cap suggerencia t\'esperem en el forum de la Comunitat.'
  }
};
function detectLocale() {
  const browserLocale = (navigator.language || '').toLocaleLowerCase('es');
  return browserLocale.startsWith('ca') || browserLocale.startsWith('val') ? 'va' : 'es';
}
function getSavedLocaleChoice() {
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved === 'es' || saved === 'va' || saved === 'auto') return saved;
  return 'auto';
}
function resolveLocale(choice) {
  if (choice === 'es' || choice === 'va') return choice;
  return detectLocale();
}
let localeChoice = getSavedLocaleChoice();
let locale = resolveLocale(localeChoice);
let text = messages[locale];
const totals = {
  unique: allCards.length,
};
let activeView = 'libraryView';
let currentSection = null;
function normalize(value) { return value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function normalizeTitle(value) { return normalize((value || '').trim()); }
function hasActiveFilters() { return !!search.value.trim(); }
function matches(el) {
  const query = normalize(search.value.trim());
  const queryOk = !query || normalize(el.dataset.search || '').includes(query);
  return queryOk;
}
function getContainer(section) {
  return section ? section.querySelector(':scope > .tree-children') : libraryRoot;
}
function getChildSections(section) {
  const container = getContainer(section);
  return Array.from(container ? container.children : []).filter((el) => el.classList && el.classList.contains('tree-section'));
}
function getChildRows(section) {
  const container = getContainer(section);
  return Array.from(container ? container.children : []).filter((el) => el.classList && el.classList.contains('activity-row'));
}
function getParentSection(section) {
  return section ? section.parentElement.closest('.tree-section') : null;
}
function getSectionLabel(section) {
  return section ? (section.dataset.title || '') : text.root;
}
function getSectionPath(section) {
  const path = [];
  let node = section;
  while (node) {
    path.unshift(node);
    node = getParentSection(node);
  }
  return path;
}
function getSectionIndexChain(section) {
  const chain = [];
  let node = section;
  while (node) {
    const parent = getParentSection(node);
    const siblings = getChildSections(parent);
    const index = siblings.indexOf(node);
    if (index < 0) return [];
    chain.unshift(index);
    node = parent;
  }
  return chain;
}
function resolveSectionFromChain(chain) {
  if (!Array.isArray(chain) || !chain.length) return null;
  let node = null;
  for (const index of chain) {
    const siblings = getChildSections(node);
    if (!Number.isInteger(index) || index < 0 || index >= siblings.length) return null;
    node = siblings[index];
  }
  return node;
}
function savePlaybackContext() {
  try {
    const payload = {
      view: activeView,
      section: getSectionIndexChain(currentSection),
      ts: Date.now()
    };
    sessionStorage.setItem(PLAYBACK_CONTEXT_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('No se pudo guardar el contexto de reproduccion.', error);
  }
}
function applyPlaybackContextFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get('view');
  const sectionParam = params.get('section');

  if (viewParam === 'libraryView' || viewParam === 'allView') {
    activeView = viewParam;
  }

  if (activeView === 'libraryView' && sectionParam) {
    const chain = sectionParam
      .split('.')
      .map((part) => Number(part))
      .filter((value) => Number.isInteger(value) && value >= 0);
    currentSection = resolveSectionFromChain(chain);
  }

  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.view === activeView);
  });
  document.querySelectorAll('.view').forEach((view) => {
    view.hidden = view.id !== activeView;
  });
}
function countMatchesWithin(section) {
  const scope = section || document.getElementById('libraryView');
  return scope.querySelectorAll('.activity-row[data-matched="true"]').length;
}
function updateLibraryChrome(count) {
  const path = getSectionPath(currentSection);
  const filtersActive = hasActiveFilters();
  libraryBack.hidden = filtersActive || path.length === 0;
  libraryBack.disabled = path.length === 0;
  libraryBreadcrumb.textContent = '';

  const rootButton = document.createElement('button');
  rootButton.type = 'button';
  rootButton.textContent = text.root;
  rootButton.dataset.level = 'root';
  rootButton.disabled = path.length === 0;
  libraryBreadcrumb.appendChild(rootButton);

  path.forEach((section, index) => {
    const separator = document.createElement('span');
    separator.textContent = '/';
    libraryBreadcrumb.appendChild(separator);

    if (index === path.length - 1) {
      const current = document.createElement('span');
      current.className = 'breadcrumb-current';
      current.textContent = getSectionLabel(section);
      libraryBreadcrumb.appendChild(current);
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = getSectionLabel(section);
    button.dataset.pathIndex = String(index);
    libraryBreadcrumb.appendChild(button);
  });

  if (filtersActive) {
    libraryCurrent.textContent = count === 1 ? text.foundInLibraryOne : text.foundInLibraryMany(count);
    return;
  }

  const currentLabel = getSectionLabel(currentSection);
  const childSections = getChildSections(currentSection).filter((section) => section.dataset.hasMatch === 'true').length;
  const childRows = getChildRows(currentSection).filter((row) => row.dataset.matched === 'true').length;
  const parts = [];
  parts.push(currentLabel);
  parts.push(count === 1 ? text.activityOne : text.activityMany(count));
  if (childSections) parts.push(childSections === 1 ? text.folderOne : text.folderMany(childSections));
  if (childRows) parts.push(childRows === 1 ? text.directOne : text.directMany(childRows));
  libraryCurrent.textContent = parts.join(' · ');
}
function normalizePath(value) {
  return decodeURIComponent((value || '').trim()).replace(/^\.\//, '').toLocaleLowerCase('es');
}
function stripLocalActivitiesBase(value) {
  const prefix = `${LOCAL_ACTIVITIES_BASE}/`;
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}
function withLocalActivitiesBase(value) {
  if (!value || /^(?:https?:|data:|\/)/i.test(value)) return value;
  return value.startsWith(`${LOCAL_ACTIVITIES_BASE}/`) ? value : `${LOCAL_ACTIVITIES_BASE}/${value}`;
}
function getActivityIconSrc(element, icon) {
  const pathKey = normalizePath(element.dataset.path);
  if (element.dataset.source === 'local' && pathKey.startsWith(`${LOCAL_ACTIVITIES_BASE}/`)) {
    return withLocalActivitiesBase(icon);
  }
  return icon;
}
function getPathCandidates(value) {
  const clean = normalizePath(value).split(/[?#]/)[0].replace(/\\/g, '/');
  if (!clean) return [];

  const segments = clean.split('/').filter(Boolean);
  const candidates = new Set([clean]);
  const unprefixedClean = stripLocalActivitiesBase(clean);
  if (unprefixedClean !== clean) candidates.add(unprefixedClean);

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

  if (unprefixedClean !== clean) {
    const unprefixedSegments = unprefixedClean.split('/').filter(Boolean);
    if (unprefixedSegments.length) {
      candidates.add(unprefixedSegments[0]);
      const last = unprefixedSegments[unprefixedSegments.length - 1];
      candidates.add(last);
      candidates.add(last.replace(/\.(jclic\.zip|jclic|zip|html?)$/i, ''));
    }
    if (unprefixedSegments.length > 1) {
      candidates.add(unprefixedSegments.slice(0, -1).join('/'));
      candidates.add(`${unprefixedSegments[0]}/${unprefixedSegments[1]}`);
    }
  }

  return Array.from(candidates).filter(Boolean);
}
function createThumb(className, src, alt) {
  const img = document.createElement('img');
  img.className = className;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.alt = alt;
  img.src = src;
  img.addEventListener('error', () => {
    img.hidden = true;
  }, { once: true });
  return img;
}
function applyRemoteCovers(pathMap, titleMap) {
  const rows = Array.from(document.querySelectorAll('#libraryView .activity-row'));
  rows.forEach((row) => {
    if (row.querySelector('.activity-thumb')) return;
    const title = row.querySelector('.activity-title');
    if (!title) return;

    let cover = null;
    getPathCandidates(row.dataset.path).some((candidate) => {
      cover = pathMap.get(candidate);
      return !!cover;
    });
    if (!cover) cover = titleMap.get(normalizeTitle(title.textContent));
    if (!cover) return;

    const main = document.createElement('span');
    main.className = 'activity-main';
    const thumb = createThumb('activity-thumb', cover, title.textContent.trim());
    title.replaceWith(main);
    main.appendChild(thumb);
    main.appendChild(title);
  });

  const cards = Array.from(document.querySelectorAll('#allView .card'));
  cards.forEach((card) => {
    if (card.querySelector('.card-thumb')) return;
    const title = card.querySelector('.card-title');
    if (!title) return;

    let cover = null;
    getPathCandidates(card.dataset.path).some((candidate) => {
      cover = pathMap.get(candidate);
      return !!cover;
    });
    if (!cover) cover = titleMap.get(normalizeTitle(title.textContent));
    if (!cover) return;

    const thumb = createThumb('card-thumb', cover, title.textContent.trim());
    card.insertBefore(thumb, title);
  });
}
function applyActivityIcons(iconMap) {
  const rows = Array.from(document.querySelectorAll('#libraryView .activity-row'));
  rows.forEach((row) => {
    const pathKey = normalizePath(row.dataset.path);
    const icon = iconMap.get(pathKey) || iconMap.get(stripLocalActivitiesBase(pathKey));
    if (!icon || row.querySelector('.activity-thumb')) return;
    const title = row.querySelector('.activity-title');
    if (!title) return;
    const main = document.createElement('span');
    main.className = 'activity-main';
    const thumb = createThumb('activity-thumb', getActivityIconSrc(row, icon), title.textContent.trim());
    title.replaceWith(main);
    main.appendChild(thumb);
    main.appendChild(title);
  });

  const cards = Array.from(document.querySelectorAll('#allView .card'));
  cards.forEach((card) => {
    const pathKey = normalizePath(card.dataset.path);
    const icon = iconMap.get(pathKey) || iconMap.get(stripLocalActivitiesBase(pathKey));
    if (!icon || card.querySelector('.card-thumb')) return;
    const title = card.querySelector('.card-title');
    if (!title) return;
    const thumb = createThumb('card-thumb', getActivityIconSrc(card, icon), title.textContent.trim());
    card.insertBefore(thumb, title);
  });
}
async function loadOfficialCovers() {
  if (remoteCoversReady) return;
  remoteCoversReady = true;

  // Intenta leer del caché en localStorage (TTL 7 días)
  let pathEntries = null;
  let titleEntries = null;
  try {
    const raw = localStorage.getItem(REMOTE_COVERS_CACHE_KEY);
    if (raw) {
      const { ts, paths, titles } = JSON.parse(raw);
      if (Date.now() - ts < REMOTE_COVERS_CACHE_TTL) {
        pathEntries = paths;
        titleEntries = titles;
      }
    }
  } catch (_) {}

  if (pathEntries) {
    applyRemoteCovers(new Map(pathEntries), new Map(titleEntries));
    return;
  }

  try {
    const response = await fetch(REMOTE_PROJECTS_INDEX);
    if (!response.ok) return;

    const projects = await response.json();
    if (!Array.isArray(projects)) return;

    const pathMap = new Map();
    const titleMap = new Map();
    projects.forEach((project) => {
      const path = normalizePath(project.path);
      const file = project.coverWebp || project.cover || project.thumbnail;
      if (!path || !file) return;

      const absoluteUrl = `${REMOTE_PROJECTS_BASE}/${path}/${file}`;
      pathMap.set(path, absoluteUrl);

      const titleKey = normalizeTitle(project.title || '');
      if (titleKey && !titleMap.has(titleKey)) titleMap.set(titleKey, absoluteUrl);

      const firstSegment = path.split('/')[0];
      if (firstSegment && !pathMap.has(firstSegment)) pathMap.set(firstSegment, absoluteUrl);
    });

    try {
      localStorage.setItem(REMOTE_COVERS_CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        paths: Array.from(pathMap),
        titles: Array.from(titleMap),
      }));
    } catch (_) {}

    applyRemoteCovers(pathMap, titleMap);
  } catch (error) {
    console.warn('No se pudieron cargar las miniaturas oficiales del repositorio JClic', error);
  }
}
async function loadActivityIcons() {
  if (activityIconsReady) return;
  activityIconsReady = true;
  try {
    const response = await fetch('library.jclic');
    if (!response.ok) return;
    const xmlText = await response.text();
    const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
    const iconMap = new Map();
    xml.querySelectorAll('menuElement[path][icon]').forEach((element) => {
      const path = normalizePath(element.getAttribute('path'));
      const icon = element.getAttribute('icon');
      if (!path || !icon) return;
      iconMap.set(path, icon);
    });
    applyActivityIcons(iconMap);
  } catch (error) {
    console.error('No se pudieron cargar los iconos de actividades', error);
  }
}
async function initializeActivityMedia() {
  await loadOfficialCovers();
  await loadActivityIcons();
}
function filterRows(selector) {
  let count = 0;
  document.querySelectorAll(selector).forEach((el) => {
    const ok = matches(el);
    el.hidden = !ok;
    if (ok) count += 1;
  });
  return count;
}
function updateTree() {
  let totalCount = 0;
  const rows = Array.from(document.querySelectorAll('#libraryView .activity-row'));
  rows.forEach((row) => {
    const matched = matches(row);
    row.dataset.matched = matched ? 'true' : 'false';
    row.hidden = true;
    if (matched) totalCount += 1;
  });

  const sections = Array.from(document.querySelectorAll('#libraryView .tree-section')).reverse();
  sections.forEach((section) => {
    const hasMatchedRow = !!section.querySelector('.activity-row[data-matched="true"]');
    const hasMatchedSection = !!section.querySelector('.tree-section[data-has-match="true"]');
    section.dataset.hasMatch = hasMatchedRow || hasMatchedSection ? 'true' : 'false';
    section.hidden = true;
    section.open = false;
  });

  if (hasActiveFilters()) {
    rows.forEach((row) => {
      row.hidden = row.dataset.matched !== 'true';
    });
    sections.forEach((section) => {
      const hasVisibleRow = !!section.querySelector('.activity-row[data-matched="true"]');
      const hasVisibleSection = !!section.querySelector('.tree-section[data-has-match="true"]');
      section.hidden = !(hasVisibleRow || hasVisibleSection);
      if (!section.hidden) section.open = true;
    });
    updateLibraryChrome(totalCount);
    return totalCount;
  }

  getChildSections(currentSection).forEach((section) => {
    section.hidden = section.dataset.hasMatch !== 'true';
  });
  getChildRows(currentSection).forEach((row) => {
    row.hidden = row.dataset.matched !== 'true';
  });

  const currentCount = countMatchesWithin(currentSection);
  getSectionPath(currentSection).forEach((section) => {
    section.hidden = false;
    section.open = true;
  });
  updateLibraryChrome(currentCount);
  return currentCount;
}
function render() {
  const count = activeView === 'libraryView'
    ? updateTree()
    : activeView === 'favoritesView'
      ? filterRows('#favoritesView .card')
      : filterRows('#allView .card');
  visibleCount.textContent = count;
  countLabel.textContent = activeView === 'libraryView' ? (hasActiveFilters() ? text.countInLibrary : text.countInFolder) : text.visible;
  const homeMode = activeView === 'libraryView' && !hasActiveFilters() && currentSection === null;
  const sectionMode = activeView === 'libraryView' && !hasActiveFilters() && currentSection !== null;
  libraryView.classList.toggle('home-mode', homeMode);
  libraryView.classList.toggle('section-mode', sectionMode);
  document.querySelectorAll('#libraryView .tree-section.path-section').forEach((section) => {
    section.classList.remove('path-section');
  });
  if (sectionMode) {
    getSectionPath(currentSection).forEach((section) => {
      section.classList.add('path-section');
    });
  }
  empty.classList.toggle('visible', count === 0);
}
function applyInterfaceLanguage() {
  document.documentElement.lang = text.htmlLang;
  if (pageTitle) pageTitle.textContent = text.pageTitle;
  if (headerTitle) headerTitle.textContent = text.headerTitle;
  if (tabLibrary) tabLibrary.textContent = text.tabLibrary;
  if (tabAll) tabAll.textContent = text.tabAll;
  if (tabFavorites) tabFavorites.textContent = text.tabFavorites;
  search.placeholder = text.searchPlaceholder;
  libraryBack.textContent = text.back;
  empty.textContent = text.empty;

  if (creditsTriggerTitle) creditsTriggerTitle.textContent = text.creditsTitle;
  if (creditsClose) creditsClose.setAttribute('aria-label', text.closeCredits);
  if (creditsKicker) creditsKicker.textContent = text.creditsTitle;
  if (creditsSubtitle) creditsSubtitle.textContent = text.creditsSubtitle;
  if (creditsCopyParagraphs[0]) creditsCopyParagraphs[0].textContent = text.creditsP1;
  if (creditsCopyParagraphs[1]) creditsCopyParagraphs[1].textContent = text.creditsP2;
  if (creditsCopyParagraphs[2]) creditsCopyParagraphs[2].textContent = text.creditsP3;

  if (languageSelect) {
    languageSelect.setAttribute('aria-label', text.languageLabel);
    languageSelect.value = localeChoice;
    if (languageSelect.options[0]) languageSelect.options[0].textContent = text.languageAuto;
    if (languageSelect.options[1]) languageSelect.options[1].textContent = text.languageEs;
    if (languageSelect.options[2]) languageSelect.options[2].textContent = text.languageVa;
  }
}

function updateFavoriteButtonsState(key) {
  document.querySelectorAll('.favorite-btn').forEach((button) => {
    const host = button.closest('a[data-activity-key]');
    if (!host || host.dataset.activityKey !== key) return;
    const active = favorites.has(key);
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.title = active ? 'Quitar de favoritas' : 'Marcar como favorita';
    button.setAttribute('aria-label', active ? 'Quitar de favoritas' : 'Marcar como favorita');
  });
}

function applyFavoriteButtonsState() {
  if (favorites.size === 0) return;
  document.querySelectorAll('a[data-activity-key]').forEach((host) => {
    const key = host.dataset.activityKey;
    if (!key || !favorites.has(key)) return;
    const btn = host.querySelector('.favorite-btn');
    if (!btn) return;
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    btn.title = 'Quitar de favoritas';
    btn.setAttribute('aria-label', 'Quitar de favoritas');
  });
}

function renderFavoritesView() {
  if (!favoritesGrid) return;
  favoritesGrid.textContent = '';
  Array.from(favorites).forEach((key) => {
    const activity = activityIndex.get(key);
    if (!activity) return;
    const card = createActivityLink(activity, 'card');
    const btn = card.querySelector('.favorite-btn');
    if (btn) {
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      btn.title = 'Quitar de favoritas';
      btn.setAttribute('aria-label', 'Quitar de favoritas');
    }
    favoritesGrid.appendChild(card);
  });
}

function toggleFavoriteByKey(key) {
  if (!key) return;
  if (favorites.has(key)) favorites.delete(key);
  else favorites.add(key);
  saveFavorites(favorites);
  renderFavoritesView();
  updateFavoriteButtonsState(key);
  render();
}
function setLocaleChoice(nextChoice) {
  const normalized = nextChoice === 'es' || nextChoice === 'va' ? nextChoice : 'auto';
  localeChoice = normalized;
  if (normalized === 'auto') localStorage.removeItem(LOCALE_STORAGE_KEY);
  else localStorage.setItem(LOCALE_STORAGE_KEY, normalized);
  locale = resolveLocale(localeChoice);
  text = messages[locale];
  applyInterfaceLanguage();
  render();
}
function openCreditsModal() {
  creditsModal.hidden = false;
  creditsModal.setAttribute('aria-hidden', 'false');
  creditsClose.focus();
  document.body.style.overflow = 'hidden';
}
function closeCreditsModal() {
  creditsModal.hidden = true;
  creditsModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
tabs.forEach((tab) => tab.addEventListener('click', () => {
  tabs.forEach((other) => other.classList.remove('active'));
  tab.classList.add('active');
  activeView = tab.dataset.view;
  document.querySelectorAll('.view').forEach((view) => { view.hidden = view.id !== activeView; });
  render();
}));
document.addEventListener('click', (event) => {
  const favoriteButton = event.target.closest('.favorite-btn');
  if (favoriteButton) {
    event.preventDefault();
    event.stopPropagation();
    const host = favoriteButton.closest('a[data-activity-key]');
    if (host) toggleFavoriteByKey(host.dataset.activityKey);
    return;
  }

  const disabled = event.target.closest('a.disabled');
  if (disabled) event.preventDefault();

  const activityLink = event.target.closest('a.activity-row, a.card');
  if (activityLink) {
    const href = activityLink.getAttribute('href') || '';
    if (href.startsWith('play.html?')) {
      savePlaybackContext();
    }
  }

  const popupLink = event.target.closest('[data-popup="credits"]');
  if (popupLink) {
    event.preventDefault();
    openCreditsModal();
    return;
  }

  const closeModalTarget = event.target.closest('[data-close-modal="credits"]');
  if (closeModalTarget) {
    closeCreditsModal();
    return;
  }

  const summary = event.target.closest('#libraryView summary');
  if (summary && !hasActiveFilters()) {
    event.preventDefault();
    currentSection = summary.parentElement;
    render();
    return;
  }

  const breadcrumbButton = event.target.closest('#libraryBreadcrumb button');
  if (breadcrumbButton) {
    if (breadcrumbButton.dataset.level === 'root') {
      currentSection = null;
    } else if (breadcrumbButton.dataset.pathIndex) {
      currentSection = getSectionPath(currentSection)[Number(breadcrumbButton.dataset.pathIndex)] || null;
    }
    render();
  }
});
libraryBack.addEventListener('click', () => {
  currentSection = getParentSection(currentSection);
  render();
});
creditsClose.addEventListener('click', closeCreditsModal);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !creditsModal.hidden) {
    closeCreditsModal();
  }
});
search.addEventListener('input', render);
if (languageSelect) {
  languageSelect.addEventListener('change', () => {
    setLocaleChoice(languageSelect.value);
  });
}
totalUnique.textContent = totals.unique;
applyInterfaceLanguage();
initializeActivityMedia();
renderFavoritesView();
applyFavoriteButtonsState();
applyPlaybackContextFromUrl();
render();
}

bootstrap().catch((error) => {
  console.error(error);
  const empty = document.getElementById('empty');
  if (empty) {
    empty.textContent = 'No se pudo cargar el catalogo de actividades.';
    empty.classList.add('visible');
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch((error) => {
      console.error('No se pudo registrar el service worker.', error);
    });
  });
}
