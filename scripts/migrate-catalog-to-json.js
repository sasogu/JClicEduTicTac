const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const dataDir = path.join(root, 'data');
const catalogPath = path.join(dataDir, 'activities.json');

function decodeEntities(value) {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function getAttr(source, name) {
  const match = source.match(new RegExp(`${name}="([^"]*)"`, 'i'));
  return match ? decodeEntities(match[1]) : '';
}

function getText(source, tagName, className) {
  const pattern = className
    ? new RegExp(`<${tagName}[^>]*class="${className}"[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i')
    : new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = source.match(pattern);
  return match ? decodeEntities(match[1].replace(/<[^>]+>/g, '').trim()) : '';
}

function findSection(html, id) {
  const start = html.indexOf(`<section id="${id}"`);
  if (start === -1) throw new Error(`No se encontro #${id}`);
  const nextSection = html.indexOf('\n  <section id="', start + 1);
  const empty = html.indexOf('\n  <div id="empty"', start + 1);
  const end = nextSection === -1 ? empty : Math.min(nextSection, empty);
  if (end === -1) throw new Error(`No se encontro el final de #${id}`);
  return html.slice(start, end);
}

function extractAnchorBlock(lines, startIndex) {
  const parts = [];
  let index = startIndex;
  while (index < lines.length) {
    parts.push(lines[index]);
    if (lines[index].includes('</a>')) break;
    index += 1;
  }
  return { block: parts.join('\n'), nextIndex: index + 1 };
}

function parseActivityAnchor(block, titleClass) {
  return {
    title: getText(block, titleClass === 'card-title' ? 'h2' : 'span', titleClass),
    href: getAttr(block, 'href'),
    source: getAttr(block, 'data-source'),
    search: getAttr(block, 'data-search'),
    path: getAttr(block, 'data-path'),
    category: getText(block, 'div', 'category'),
  };
}

function parseLibrary(sectionHtml) {
  const treeMatch = sectionHtml.match(/<div class="library-tree">([\s\S]*)<\/div><\/section>$/);
  if (!treeMatch) throw new Error('No se encontro .library-tree');

  const lines = treeMatch[1].split('\n');
  const root = { sections: [], activities: [] };
  const stack = [];

  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();

    if (line.startsWith('<details class="tree-section')) {
      const node = {
        title: getAttr(line, 'data-title'),
        depth: Number((line.match(/depth-(\d+)/) || [0, 0])[1]),
        icon: '',
        sections: [],
        activities: [],
      };

      const summary = (lines[index + 1] || '').trim();
      node.icon = getAttr(summary, 'src');
      if (!node.title) node.title = getText(summary, 'span');

      const parent = stack[stack.length - 1];
      if (parent) parent.sections.push(node);
      else root.sections.push(node);
      stack.push(node);
      index += 3;
      continue;
    }

    if (line.startsWith('<a class="activity-row"')) {
      const { block, nextIndex } = extractAnchorBlock(lines, index);
      const parent = stack[stack.length - 1];
      const activity = parseActivityAnchor(block, 'activity-title');
      if (block.includes('data-popup="credits"')) activity.popup = 'credits';
      if (block.includes('activity-thumb')) activity.thumbnail = getAttr(block, 'src');
      if (parent) parent.activities.push(activity);
      else root.activities.push(activity);
      index = nextIndex;
      continue;
    }

    if (line.includes('</details>')) {
      const closeCount = line.match(/<\/details>/g).length;
      for (let count = 0; count < closeCount; count += 1) stack.pop();
      index += 1;
      continue;
    }

    index += 1;
  }

  if (stack.length) throw new Error('El arbol de biblioteca quedo sin cerrar');
  return root;
}

function parseAllActivities(sectionHtml) {
  const cards = [];
  const lines = sectionHtml.split('\n');

  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (line.startsWith('<section id="allView"')) {
      const anchorStart = line.indexOf('<a class="card"');
      if (anchorStart !== -1) lines[index] = line.slice(anchorStart);
    }

    if (lines[index].trim().startsWith('<a class="card"')) {
      const { block, nextIndex } = extractAnchorBlock(lines, index);
      cards.push(parseActivityAnchor(block, 'card-title'));
      index = nextIndex;
      continue;
    }

    index += 1;
  }

  return cards;
}

function replaceCatalogSections(html) {
  const librarySection = findSection(html, 'libraryView');
  const allSection = findSection(html, 'allView');
  const compactLibrary = [
    '  <section id="libraryView" class="view">',
    '    <div class="library-nav"><button id="libraryBack" class="library-back" type="button" hidden>Volver</button><div id="libraryBreadcrumb" class="breadcrumb"></div></div>',
    '    <p id="libraryCurrent" class="library-current"></p>',
    '    <div class="library-tree"></div>',
    '  </section>',
  ].join('\n');
  const compactAll = [
    '  <section id="allView" class="view" hidden>',
    '    <div class="grid"></div>',
    '  </section>',
  ].join('\n');

  return html
    .replace(librarySection, compactLibrary)
    .replace(allSection, compactAll);
}

function main() {
  const html = fs.readFileSync(indexPath, 'utf8');
  if (!html.includes('class="tree-section')) {
    console.log('index.html ya no contiene el catalogo incrustado. No se ha modificado nada.');
    return;
  }

  const librarySection = findSection(html, 'libraryView');
  const allSection = findSection(html, 'allView');
  const catalog = {
    version: 1,
    generatedFrom: 'index.html',
    library: parseLibrary(librarySection),
    allActivities: parseAllActivities(allSection),
  };

  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  fs.writeFileSync(indexPath, replaceCatalogSections(html));

  const libraryCount = JSON.stringify(catalog.library).match(/"title":/g)?.length || 0;
  console.log(`Catalogo escrito en ${path.relative(root, catalogPath)}`);
  console.log(`Actividades planas: ${catalog.allActivities.length}`);
  console.log(`Nodos del arbol: ${libraryCount}`);
}

main();
