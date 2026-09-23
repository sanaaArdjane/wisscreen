#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) fail('Usage: node ua-tour-analyze.js <input.json> <output.json>');

let data;
try {
  data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
} catch (e) {
  fail('Failed to read/parse input: ' + e.message);
}

const nodes = Array.isArray(data.nodes) ? data.nodes : [];
const edges = Array.isArray(data.edges) ? data.edges : [];
const layers = Array.isArray(data.layers) ? data.layers : [];

const nodeById = new Map(nodes.map((n) => [n.id, n]));

// A. Fan-in / B. Fan-out
const fanIn = new Map();
const fanOut = new Map();
for (const n of nodes) {
  fanIn.set(n.id, 0);
  fanOut.set(n.id, 0);
}
for (const e of edges) {
  if (nodeById.has(e.source)) fanOut.set(e.source, (fanOut.get(e.source) || 0) + 1);
  if (nodeById.has(e.target)) fanIn.set(e.target, (fanIn.get(e.target) || 0) + 1);
}

const fanInRanking = [...fanIn.entries()]
  .map(([id, count]) => ({ id, fanIn: count, name: nodeById.get(id)?.name }))
  .sort((a, b) => b.fanIn - a.fanIn)
  .slice(0, 20);

const fanOutRanking = [...fanOut.entries()]
  .map(([id, count]) => ({ id, fanOut: count, name: nodeById.get(id)?.name }))
  .sort((a, b) => b.fanOut - a.fanOut)
  .slice(0, 20);

// C. Entry point candidates
const ENTRY_FILENAMES = new Set([
  'index.ts', 'index.js', 'main.ts', 'main.js', 'app.ts', 'app.js', 'server.ts', 'server.js',
  'mod.rs', 'main.go', 'main.py', 'main.rs', 'manage.py', 'app.py', 'wsgi.py', 'asgi.py',
  'run.py', '__main__.py', 'Application.java', 'Main.java', 'Program.cs', 'config.ru',
  'index.php', 'App.swift', 'Application.kt', 'main.cpp', 'main.c',
  // Next.js App Router conventions worth treating as entry-adjacent
  'layout.tsx', 'layout.ts',
]);

const fanOutValues = [...fanOut.values()].sort((a, b) => a - b);
const fanInValues = [...fanIn.values()].sort((a, b) => a - b);
function percentileThreshold(sortedArr, percentile) {
  if (sortedArr.length === 0) return 0;
  const idx = Math.floor(sortedArr.length * percentile);
  return sortedArr[Math.min(idx, sortedArr.length - 1)];
}
const fanOutTop10 = percentileThreshold(fanOutValues, 0.9);
const fanInBottom25 = percentileThreshold(fanInValues, 0.25);

function depthFromRoot(filePath) {
  if (!filePath) return 99;
  return filePath.split('/').filter(Boolean).length;
}

const entryScored = [];
for (const n of nodes) {
  let score = 0;
  const fp = n.filePath || '';
  const base = path.basename(fp);
  if (n.type === 'document') {
    if (base.toUpperCase() === 'README.MD' && depthFromRoot(fp) === 1) score += 5;
    else if (fp.toLowerCase().endsWith('.md') && depthFromRoot(fp) === 1) score += 2;
  } else {
    if (ENTRY_FILENAMES.has(base)) score += 3;
    if (depthFromRoot(fp) <= 2) score += 1;
    if ((fanOut.get(n.id) || 0) >= fanOutTop10 && fanOutTop10 > 0) score += 1;
    if ((fanIn.get(n.id) || 0) <= fanInBottom25) score += 1;
  }
  if (score > 0) entryScored.push({ id: n.id, score, name: n.name, summary: n.summary });
}
entryScored.sort((a, b) => b.score - a.score);
const entryPointCandidates = entryScored.slice(0, 5);

// D. BFS from top code entry point (skip document nodes)
const topCodeEntry = entryScored.find((c) => nodeById.get(c.id)?.type !== 'document');
const bfsEdgeTypes = new Set(['imports', 'calls']);
const adjacency = new Map();
for (const e of edges) {
  if (!bfsEdgeTypes.has(e.type)) continue;
  if (!adjacency.has(e.source)) adjacency.set(e.source, []);
  adjacency.get(e.source).push(e.target);
}

let bfsTraversal = { startNode: null, order: [], depthMap: {}, byDepth: {} };
if (topCodeEntry) {
  const startNode = topCodeEntry.id;
  const order = [];
  const depthMap = new Map();
  const queue = [[startNode, 0]];
  depthMap.set(startNode, 0);
  while (queue.length) {
    const [cur, depth] = queue.shift();
    order.push(cur);
    const neighbors = adjacency.get(cur) || [];
    for (const nb of neighbors) {
      if (!nodeById.has(nb)) continue;
      if (!depthMap.has(nb)) {
        depthMap.set(nb, depth + 1);
        queue.push([nb, depth + 1]);
      }
    }
  }
  const byDepth = {};
  for (const [id, depth] of depthMap.entries()) {
    if (!byDepth[depth]) byDepth[depth] = [];
    byDepth[depth].push(id);
  }
  bfsTraversal = {
    startNode,
    order,
    depthMap: Object.fromEntries(depthMap),
    byDepth,
  };
}

// E. Non-code file inventory
const nonCodeFiles = { documentation: [], infrastructure: [], data: [], config: [] };
for (const n of nodes) {
  const entry = { id: n.id, name: n.name, summary: n.summary };
  if (n.type === 'document') nonCodeFiles.documentation.push(entry);
  else if (n.type === 'service' || n.type === 'pipeline' || n.type === 'resource') nonCodeFiles.infrastructure.push({ ...entry, type: n.type });
  else if (n.type === 'table' || n.type === 'schema' || n.type === 'endpoint') nonCodeFiles.data.push({ ...entry, type: n.type });
  else if (n.type === 'config') nonCodeFiles.config.push(entry);
}

// F. Tightly coupled clusters
const edgeSet = new Set(edges.map((e) => `${e.source}|${e.target}|${e.type}`));
function hasEdge(a, b, type) {
  return edgeSet.has(`${a}|${b}|${type}`);
}
const pairEdgeCount = new Map();
for (const e of edges) {
  const key = [e.source, e.target].sort().join('|');
  pairEdgeCount.set(key, (pairEdgeCount.get(key) || 0) + 1);
}

const bidirectionalPairs = [];
const seenPairs = new Set();
for (const e of edges) {
  if (e.type !== 'imports' && e.type !== 'calls') continue;
  const reverseExists = hasEdge(e.target, e.source, e.type);
  if (reverseExists) {
    const key = [e.source, e.target].sort().join('|');
    if (!seenPairs.has(key)) {
      seenPairs.add(key);
      bidirectionalPairs.push([e.source, e.target]);
    }
  }
}

// Union-find to group bidirectional pairs into base clusters
const parent = new Map();
function find(x) {
  if (!parent.has(x)) parent.set(x, x);
  let root = x;
  while (parent.get(root) !== root) root = parent.get(root);
  let cur = x;
  while (parent.get(cur) !== cur) {
    const next = parent.get(cur);
    parent.set(cur, root);
    cur = next;
  }
  return root;
}
function union(a, b) {
  const ra = find(a);
  const rb = find(b);
  if (ra !== rb) parent.set(ra, rb);
}
for (const [a, b] of bidirectionalPairs) union(a, b);

const groups = new Map();
for (const [a, b] of bidirectionalPairs) {
  for (const x of [a, b]) {
    const root = find(x);
    if (!groups.has(root)) groups.set(root, new Set());
    groups.get(root).add(x);
  }
}

// Expand clusters: add nodes connecting to 2+ existing members, cap at 5 nodes
const clusters = [];
for (const [, memberSet] of groups.entries()) {
  let members = new Set(memberSet);
  if (members.size < 2) continue;
  // expansion pass
  let expanded = true;
  while (expanded && members.size < 5) {
    expanded = false;
    const candidateCounts = new Map();
    for (const e of edges) {
      if (members.has(e.source) && !members.has(e.target)) {
        candidateCounts.set(e.target, (candidateCounts.get(e.target) || 0) + 1);
      } else if (members.has(e.target) && !members.has(e.source)) {
        candidateCounts.set(e.source, (candidateCounts.get(e.source) || 0) + 1);
      }
    }
    let bestCandidate = null;
    let bestCount = 1;
    for (const [cand, count] of candidateCounts.entries()) {
      if (count >= 2 && count > bestCount) {
        bestCount = count;
        bestCandidate = cand;
      }
    }
    if (bestCandidate && members.size < 5) {
      members.add(bestCandidate);
      expanded = true;
    }
  }
  const memberArr = [...members].slice(0, 5);
  let edgeCount = 0;
  for (const e of edges) {
    if (memberArr.includes(e.source) && memberArr.includes(e.target)) edgeCount++;
  }
  clusters.push({ nodes: memberArr, edgeCount });
}
clusters.sort((a, b) => b.edgeCount - a.edgeCount);
const topClusters = clusters.slice(0, 10);

// G. Layer list
const layersOut = { count: layers.length, list: layers.map((l) => ({ id: l.id, name: l.name, description: l.description })) };

// H. Node summary index
const nodeSummaryIndex = {};
for (const n of nodes) {
  nodeSummaryIndex[n.id] = { name: n.name, type: n.type, summary: n.summary };
}

const result = {
  scriptCompleted: true,
  entryPointCandidates,
  fanInRanking,
  fanOutRanking,
  bfsTraversal,
  nonCodeFiles,
  clusters: topClusters,
  layers: layersOut,
  nodeSummaryIndex,
  totalNodes: nodes.length,
  totalEdges: edges.length,
};

try {
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
} catch (e) {
  fail('Failed to write output: ' + e.message);
}

console.log('Analysis complete. Wrote ' + outputPath);
process.exit(0);
