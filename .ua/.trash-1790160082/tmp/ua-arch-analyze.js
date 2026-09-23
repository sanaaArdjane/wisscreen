#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

function main() {
  const inPath = process.argv[2];
  const outPath = process.argv[3];
  if (!inPath || !outPath) {
    console.error('usage: node ua-arch-analyze.js <input.json> <output.json>');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(inPath, 'utf8'));
  const { fileNodes, importEdges, allEdges } = data;

  const nodeById = new Map(fileNodes.map(n => [n.id, n]));

  // A. Directory grouping
  const paths = fileNodes.map(n => n.filePath || n.name || '').filter(Boolean);
  function commonPrefix(strs) {
    if (!strs.length) return '';
    let prefix = strs[0];
    for (const s of strs.slice(1)) {
      let i = 0;
      while (i < prefix.length && i < s.length && prefix[i] === s[i]) i++;
      prefix = prefix.slice(0, i);
    }
    // trim to last '/'
    const idx = prefix.lastIndexOf('/');
    return idx >= 0 ? prefix.slice(0, idx + 1) : '';
  }
  const prefix = commonPrefix(paths);

  function groupForPath(p) {
    let rest = p.startsWith(prefix) ? p.slice(prefix.length) : p;
    const parts = rest.split('/').filter(Boolean);
    if (parts.length <= 1) {
      // flat: group by extension pattern
      const base = parts[0] || p;
      if (/\.test\.|\.spec\.|^test_|_test\.go$|Test\.java$|_spec\.rb$|Test\.php$|Tests\.cs$/.test(base)) return 'test';
      if (/\.config\./.test(base)) return 'config';
      const ext = base.includes('.') ? base.slice(base.lastIndexOf('.') + 1) : 'other';
      return ext || 'root';
    }
    return parts[0];
  }

  const directoryGroups = {};
  for (const n of fileNodes) {
    const grp = groupForPath(n.filePath || n.name || '');
    (directoryGroups[grp] = directoryGroups[grp] || []).push(n.id);
  }

  // B. Node type grouping
  const nodeTypeGroups = {};
  for (const n of fileNodes) {
    (nodeTypeGroups[n.type] = nodeTypeGroups[n.type] || []).push(n.id);
  }

  // group lookup by node id
  const groupOf = {};
  for (const [grp, ids] of Object.entries(directoryGroups)) {
    for (const id of ids) groupOf[id] = grp;
  }

  // C. Import adjacency matrix + fan-in/out
  const fileFanOut = {};
  const fileFanIn = {};
  const adjacency = {}; // id -> Set(targets)
  for (const e of importEdges) {
    if (!nodeById.has(e.source) || !nodeById.has(e.target)) continue;
    fileFanOut[e.source] = (fileFanOut[e.source] || 0) + 1;
    fileFanIn[e.target] = (fileFanIn[e.target] || 0) + 1;
    (adjacency[e.source] = adjacency[e.source] || new Set()).add(e.target);
  }

  // group-level import sets
  const groupImportsFrom = {}; // grp -> Set(other grps it imports from)
  const groupImportedBy = {}; // grp -> Set(other grps that import it)
  for (const e of importEdges) {
    if (!nodeById.has(e.source) || !nodeById.has(e.target)) continue;
    const sg = groupOf[e.source], tg = groupOf[e.target];
    if (!sg || !tg) continue;
    (groupImportsFrom[sg] = groupImportsFrom[sg] || new Set()).add(tg);
    (groupImportedBy[tg] = groupImportedBy[tg] || new Set()).add(sg);
  }

  // D. Cross-category dependency analysis
  const crossCategoryMap = {};
  for (const e of allEdges) {
    const s = nodeById.get(e.source), t = nodeById.get(e.target);
    if (!s || !t) continue;
    if (s.type === t.type) continue; // same-category, not "cross"
    const key = `${s.type}|${t.type}|${e.type}`;
    crossCategoryMap[key] = (crossCategoryMap[key] || 0) + 1;
  }
  const crossCategoryEdges = Object.entries(crossCategoryMap).map(([k, count]) => {
    const [fromType, toType, edgeType] = k.split('|');
    return { fromType, toType, edgeType, count };
  }).sort((a, b) => b.count - a.count);

  // E. Inter-group import frequency
  const interGroupMap = {};
  for (const e of importEdges) {
    if (!nodeById.has(e.source) || !nodeById.has(e.target)) continue;
    const sg = groupOf[e.source], tg = groupOf[e.target];
    if (!sg || !tg || sg === tg) continue;
    const key = `${sg}|${tg}`;
    interGroupMap[key] = (interGroupMap[key] || 0) + 1;
  }
  const interGroupImports = Object.entries(interGroupMap).map(([k, count]) => {
    const [from, to] = k.split('|');
    return { from, to, count };
  }).sort((a, b) => b.count - a.count);

  // F. Intra-group import density
  const intraGroupDensity = {};
  for (const grp of Object.keys(directoryGroups)) {
    let internalEdges = 0;
    let totalEdges = 0;
    for (const e of importEdges) {
      if (!nodeById.has(e.source) || !nodeById.has(e.target)) continue;
      const sg = groupOf[e.source], tg = groupOf[e.target];
      if (sg !== grp && tg !== grp) continue;
      totalEdges++;
      if (sg === grp && tg === grp) internalEdges++;
    }
    intraGroupDensity[grp] = {
      internalEdges,
      totalEdges,
      density: totalEdges > 0 ? +(internalEdges / totalEdges).toFixed(3) : 0,
    };
  }

  // G. Directory pattern matching
  const PATTERN_MAP = [
    [['routes', 'api', 'controllers', 'endpoints', 'handlers'], 'api'],
    [['services', 'core', 'lib', 'domain', 'logic'], 'service'],
    [['models', 'db', 'data', 'persistence', 'repository', 'entities'], 'data'],
    [['components', 'views', 'pages', 'ui', 'layouts', 'screens'], 'ui'],
    [['middleware', 'plugins', 'interceptors', 'guards'], 'middleware'],
    [['utils', 'helpers', 'common', 'shared', 'tools'], 'utility'],
    [['config', 'constants', 'env', 'settings'], 'config'],
    [['__tests__', 'test', 'tests', 'spec', 'specs'], 'test'],
    [['types', 'interfaces', 'schemas', 'contracts', 'dtos'], 'types'],
    [['hooks'], 'hooks'],
    [['store', 'state', 'reducers', 'actions', 'slices'], 'state'],
    [['assets', 'static', 'public'], 'assets'],
    [['migrations'], 'data'],
    [['management', 'commands'], 'config'],
    [['templatetags'], 'utility'],
    [['signals'], 'service'],
    [['serializers'], 'api'],
    [['cmd'], 'entry'],
    [['internal'], 'service'],
    [['pkg'], 'utility'],
    [['dto', 'request', 'response'], 'types'],
    [['entity'], 'data'],
    [['controller'], 'api'],
    [['routers'], 'api'],
    [['composables'], 'service'],
    [['blueprints'], 'api'],
    [['mailers', 'jobs', 'channels'], 'service'],
    [['bin'], 'entry'],
    [['docs', 'documentation', 'wiki'], 'documentation'],
    [['deploy', 'deployment', 'infra', 'infrastructure'], 'infrastructure'],
    [['.github', '.gitlab', '.circleci'], 'ci-cd'],
    [['k8s', 'kubernetes', 'helm', 'charts'], 'infrastructure'],
    [['terraform', 'tf'], 'infrastructure'],
    [['docker'], 'infrastructure'],
    [['sql', 'database', 'schema'], 'data'],
  ];
  const dirToPattern = {};
  for (const [dirs, label] of PATTERN_MAP) for (const d of dirs) dirToPattern[d] = label;

  const patternMatches = {};
  for (const grp of Object.keys(directoryGroups)) {
    if (dirToPattern[grp]) patternMatches[grp] = dirToPattern[grp];
  }

  // H. Deployment topology
  const infraFiles = [];
  let hasDockerfile = false, hasCompose = false, hasK8s = false, hasTerraform = false, hasCI = false;
  for (const n of fileNodes) {
    const fp = n.filePath || '';
    const base = path.basename(fp);
    if (/^Dockerfile/.test(base)) { hasDockerfile = true; infraFiles.push(fp); }
    else if (/docker-compose/.test(base)) { hasCompose = true; infraFiles.push(fp); }
    else if (/\.ya?ml$/.test(base) && /k8s|kubernetes|helm/i.test(fp)) { hasK8s = true; infraFiles.push(fp); }
    else if (/\.tf$|\.tfvars$/.test(base)) { hasTerraform = true; infraFiles.push(fp); }
    else if (fp.startsWith('.github/workflows/') || /\.gitlab-ci\.yml$/.test(base) || base === 'Jenkinsfile') { hasCI = true; infraFiles.push(fp); }
    else if (base === 'Makefile') { infraFiles.push(fp); }
  }
  const deploymentTopology = {
    hasDockerfile, hasCompose, hasK8s, hasTerraform, hasCI,
    infraFiles: [...new Set(infraFiles)],
  };

  // I. Data pipeline detection
  const schemaFiles = [], migrationFiles = [], dataModelFiles = [], apiHandlerFiles = [];
  for (const n of fileNodes) {
    const fp = n.filePath || '';
    if (/\.sql$/.test(fp) && !/migrations\//.test(fp)) schemaFiles.push(fp);
    if (/\.graphql$|\.gql$|\.proto$/.test(fp)) schemaFiles.push(fp);
    if (/migrations\//.test(fp) && /\.sql$/.test(fp)) migrationFiles.push(fp);
    if (/\/(models|db)\//.test(fp) || n.type === 'table') dataModelFiles.push(fp);
    if (/\/(routes|api|controllers|endpoints|handlers)\//.test(fp) || /route\.ts$/.test(fp)) apiHandlerFiles.push(fp);
  }
  const dataPipeline = {
    schemaFiles: [...new Set(schemaFiles)],
    migrationFiles: [...new Set(migrationFiles)],
    dataModelFiles: [...new Set(dataModelFiles)],
    apiHandlerFiles: [...new Set(apiHandlerFiles)],
  };

  // J. Documentation coverage
  const docFiles = fileNodes.filter(n => n.type === 'document').map(n => n.filePath || '');
  const groupsWithDocsSet = new Set();
  for (const grp of Object.keys(directoryGroups)) {
    const hasReadme = docFiles.some(fp => fp.toLowerCase().includes(`${grp}/readme`) || fp.toLowerCase() === `${grp}/readme.md`);
    const hasRefDoc = docFiles.some(fp => fp.toLowerCase().includes(`docs/${grp}`) || fp.toLowerCase().includes(`${grp}.md`));
    if (hasReadme || hasRefDoc) groupsWithDocsSet.add(grp);
  }
  const totalGroups = Object.keys(directoryGroups).length;
  const groupsWithDocs = groupsWithDocsSet.size;
  const undocumentedGroups = Object.keys(directoryGroups).filter(g => !groupsWithDocsSet.has(g));
  const docCoverage = {
    groupsWithDocs,
    totalGroups,
    coverageRatio: totalGroups > 0 ? +(groupsWithDocs / totalGroups).toFixed(3) : 0,
    undocumentedGroups,
  };

  // K. Dependency direction
  const dependencyDirection = [];
  const seenPairs = new Set();
  for (const { from, to, count } of interGroupImports) {
    const pairKey = [from, to].sort().join('|');
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);
    const reverseCount = interGroupMap[`${to}|${from}`] || 0;
    if (count > reverseCount) {
      dependencyDirection.push({ dependent: from, dependsOn: to });
    } else if (reverseCount > count) {
      dependencyDirection.push({ dependent: to, dependsOn: from });
    }
  }

  // fileStats
  const nodeTypeCounts = {};
  for (const n of fileNodes) nodeTypeCounts[n.type] = (nodeTypeCounts[n.type] || 0) + 1;
  const filesPerGroup = {};
  for (const [grp, ids] of Object.entries(directoryGroups)) filesPerGroup[grp] = ids.length;

  const output = {
    scriptCompleted: true,
    directoryGroups,
    nodeTypeGroups,
    crossCategoryEdges,
    interGroupImports,
    intraGroupDensity,
    patternMatches,
    deploymentTopology,
    dataPipeline,
    docCoverage,
    dependencyDirection,
    fileStats: {
      totalFileNodes: fileNodes.length,
      filesPerGroup,
      nodeTypeCounts,
    },
    fileFanIn,
    fileFanOut,
  };

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.error('wrote', outPath);
}

try {
  main();
} catch (err) {
  console.error('FATAL:', err && err.stack || err);
  process.exit(1);
}
