import {
  Database,
  Globe2,
  HardDriveDownload,
  Server,
  ShieldCheck,
} from 'lucide-react';

export const NODE_KINDS = {
  CLIENT: 'client',
  LOAD_BALANCER: 'loadBalancer',
  WEB_SERVER: 'webServer',
  DATABASE: 'database',
  CACHE: 'cache',
};

export const TRAFFIC_PATTERN_OPTIONS = [
  { value: 'constant', label: 'Constant' },
  { value: 'spike', label: 'Spike' },
  { value: 'sinusoidal', label: 'Sinusoidal' },
];

export const COMPONENT_REGISTRY = {
  [NODE_KINDS.CLIENT]: {
    label: 'Client / Ingress',
    shortLabel: 'Ingress',
    description: 'Generates incoming traffic for the topology.',
    icon: Globe2,
    accent: 'from-sky-400 via-cyan-300 to-emerald-300',
    defaults: {
      trafficPattern: 'constant',
    },
    fields: [
      {
        key: 'trafficPattern',
        label: 'Traffic Pattern',
        type: 'select',
        options: TRAFFIC_PATTERN_OPTIONS,
      },
    ],
  },
  [NODE_KINDS.LOAD_BALANCER]: {
    label: 'Load Balancer',
    shortLabel: 'LB',
    description: 'Routes requests across downstream services using round robin.',
    icon: ShieldCheck,
    accent: 'from-amber-400 via-orange-300 to-rose-300',
    defaults: {
      algorithm: 'Round Robin',
    },
    fields: [
      {
        key: 'algorithm',
        label: 'Algorithm',
        type: 'select',
        options: [{ value: 'Round Robin', label: 'Round Robin' }],
      },
    ],
  },
  [NODE_KINDS.WEB_SERVER]: {
    label: 'Web Server',
    shortLabel: 'Server',
    description: 'Processes traffic with latency, throughput, and failure settings.',
    icon: Server,
    accent: 'from-lime-300 via-emerald-300 to-cyan-300',
    defaults: {
      latencyMs: 42,
      capacityRps: 140,
      failureRate: 2,
    },
    fields: [
      { key: 'latencyMs', label: 'Latency', type: 'number', unit: 'ms', min: 5, max: 400, step: 1 },
      { key: 'capacityRps', label: 'Capacity', type: 'number', unit: 'req/s', min: 10, max: 900, step: 5 },
      { key: 'failureRate', label: 'Failure Rate', type: 'number', unit: '%', min: 0, max: 60, step: 1 },
    ],
  },
  [NODE_KINDS.DATABASE]: {
    label: 'Database',
    shortLabel: 'DB',
    description: 'Persistent storage with separate read and write latency profiles.',
    icon: Database,
    accent: 'from-fuchsia-300 via-rose-300 to-orange-300',
    defaults: {
      readLatencyMs: 18,
      writeLatencyMs: 34,
      connectionLimit: 90,
    },
    fields: [
      { key: 'readLatencyMs', label: 'Read Latency', type: 'number', unit: 'ms', min: 1, max: 250, step: 1 },
      { key: 'writeLatencyMs', label: 'Write Latency', type: 'number', unit: 'ms', min: 1, max: 250, step: 1 },
      { key: 'connectionLimit', label: 'Connection Limit', type: 'number', unit: 'conn', min: 10, max: 600, step: 5 },
    ],
  },
  [NODE_KINDS.CACHE]: {
    label: 'Cache',
    shortLabel: 'Cache',
    description: 'Optional low-latency layer for absorbing hot reads.',
    icon: HardDriveDownload,
    accent: 'from-cyan-300 via-teal-300 to-lime-300',
    defaults: {
      latencyMs: 8,
      capacityRps: 260,
      hitRate: 78,
    },
    fields: [
      { key: 'latencyMs', label: 'Latency', type: 'number', unit: 'ms', min: 1, max: 150, step: 1 },
      { key: 'capacityRps', label: 'Capacity', type: 'number', unit: 'req/s', min: 10, max: 1000, step: 10 },
      { key: 'hitRate', label: 'Hit Rate', type: 'number', unit: '%', min: 10, max: 99, step: 1 },
    ],
  },
};

export const SIDEBAR_COMPONENTS = [
  NODE_KINDS.CLIENT,
  NODE_KINDS.LOAD_BALANCER,
  NODE_KINDS.WEB_SERVER,
  NODE_KINDS.CACHE,
  NODE_KINDS.DATABASE,
];

export const RF_NODE_TYPE = 'architectureNode';
export const RF_EDGE_TYPE = 'trafficEdge';

export const SIMULATION_COLORS = {
  active: '#5de2e7',
  warning: '#ff7557',
  success: '#67d77a',
  muted: 'rgba(186, 219, 213, 0.2)',
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cloneConfig(kind) {
  return JSON.parse(JSON.stringify(COMPONENT_REGISTRY[kind].defaults));
}

function normalizeNumber(value, fallback, field) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clamp(parsed, field.min ?? parsed, field.max ?? parsed);
}

function normalizeSelect(value, fallback, field) {
  const optionValues = field.options.map((option) => option.value);
  return optionValues.includes(value) ? value : fallback;
}

export function buildNode(id, kind, position, label) {
  const registry = COMPONENT_REGISTRY[kind];

  return {
    id,
    type: RF_NODE_TYPE,
    position,
    data: {
      kind,
      label: label ?? registry.label,
      config: cloneConfig(kind),
    },
  };
}

export function createNode(kind, position) {
  const suffix = Math.random().toString(36).slice(2, 8);
  return buildNode(`${kind}-${suffix}`, kind, position);
}

export function buildEdge(id, source, target) {
  return {
    id,
    source,
    target,
    type: RF_EDGE_TYPE,
  };
}

const DEFAULT_GRAPH = {
  nodes: [
    buildNode('client-1', NODE_KINDS.CLIENT, { x: 20, y: 220 }, 'Global Clients'),
    buildNode('lb-1', NODE_KINDS.LOAD_BALANCER, { x: 280, y: 220 }, 'Ingress LB'),
    buildNode('web-1', NODE_KINDS.WEB_SERVER, { x: 560, y: 120 }, 'API Server A'),
    buildNode('web-2', NODE_KINDS.WEB_SERVER, { x: 560, y: 320 }, 'API Server B'),
    buildNode('cache-1', NODE_KINDS.CACHE, { x: 850, y: 220 }, 'Response Cache'),
    buildNode('db-1', NODE_KINDS.DATABASE, { x: 1140, y: 220 }, 'Primary DB'),
  ],
  edges: [
    buildEdge('edge-client-lb', 'client-1', 'lb-1'),
    buildEdge('edge-lb-web1', 'lb-1', 'web-1'),
    buildEdge('edge-lb-web2', 'lb-1', 'web-2'),
    buildEdge('edge-web1-cache', 'web-1', 'cache-1'),
    buildEdge('edge-web2-cache', 'web-2', 'cache-1'),
    buildEdge('edge-cache-db', 'cache-1', 'db-1'),
  ],
};

const STARTER_TOPOLOGY_GRAPHS = {
  quickPair: {
    nodes: [
      buildNode('client-quick', NODE_KINDS.CLIENT, { x: 80, y: 240 }, 'Mobile Clients'),
      buildNode('web-quick', NODE_KINDS.WEB_SERVER, { x: 420, y: 240 }, 'Single Web Server'),
    ],
    edges: [
      buildEdge('edge-quick-client-web', 'client-quick', 'web-quick'),
    ],
  },
  apiChain: {
    nodes: [
      buildNode('client-api', NODE_KINDS.CLIENT, { x: 60, y: 240 }, 'External Clients'),
      buildNode('web-api', NODE_KINDS.WEB_SERVER, { x: 400, y: 240 }, 'API Service'),
      buildNode('db-api', NODE_KINDS.DATABASE, { x: 760, y: 240 }, 'Primary Database'),
    ],
    edges: [
      buildEdge('edge-api-client-web', 'client-api', 'web-api'),
      buildEdge('edge-api-web-db', 'web-api', 'db-api'),
    ],
  },
  balancedStack: {
    nodes: [
      buildNode('client-balanced', NODE_KINDS.CLIENT, { x: 40, y: 240 }, 'Public Ingress'),
      buildNode('lb-balanced', NODE_KINDS.LOAD_BALANCER, { x: 300, y: 240 }, 'Edge LB'),
      buildNode('web-balanced', NODE_KINDS.WEB_SERVER, { x: 620, y: 240 }, 'App Server'),
      buildNode('db-balanced', NODE_KINDS.DATABASE, { x: 940, y: 240 }, 'SQL Cluster'),
    ],
    edges: [
      buildEdge('edge-balanced-client-lb', 'client-balanced', 'lb-balanced'),
      buildEdge('edge-balanced-lb-web', 'lb-balanced', 'web-balanced'),
      buildEdge('edge-balanced-web-db', 'web-balanced', 'db-balanced'),
    ],
  },
  fullDemo: DEFAULT_GRAPH,
};

export const STARTER_TOPOLOGIES = [
  {
    id: 'quickPair',
    label: '2 Components',
    description: 'Client to server smoke test.',
  },
  {
    id: 'apiChain',
    label: '3 Components',
    description: 'Client, app server, and database path.',
  },
  {
    id: 'balancedStack',
    label: '4 Components',
    description: 'Ingress, load balancer, app, and database.',
  },
  {
    id: 'fullDemo',
    label: 'Full Demo',
    description: 'Multi-hop topology with scale-out and cache.',
  },
];

export function cloneGraph(graph) {
  return {
    nodes: graph.nodes.map((node) => ({
      ...node,
      position: { ...node.position },
      data: {
        ...node.data,
        config: { ...node.data.config },
      },
    })),
    edges: graph.edges.map((edge) => ({ ...edge })),
  };
}

export function getDefaultGraph() {
  return cloneGraph(DEFAULT_GRAPH);
}

export function getEmptyGraph() {
  return {
    nodes: [],
    edges: [],
  };
}

export function getStarterGraph(topologyId) {
  const graph = STARTER_TOPOLOGY_GRAPHS[topologyId] ?? DEFAULT_GRAPH;
  return cloneGraph(graph);
}

export function normalizeGraph(graph) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return getDefaultGraph();
  }

  const nodes = graph.nodes.map((node, index) => {
    const fallbackKind = NODE_KINDS.WEB_SERVER;
    const kind = Object.prototype.hasOwnProperty.call(COMPONENT_REGISTRY, node?.data?.kind)
      ? node.data.kind
      : fallbackKind;

    const baseNode = buildNode(
      typeof node?.id === 'string' && node.id.length > 0 ? node.id : `node-${index + 1}`,
      kind,
      {
        x: Number(node?.position?.x) || 0,
        y: Number(node?.position?.y) || 0,
      },
      typeof node?.data?.label === 'string' && node.data.label.trim().length > 0
        ? node.data.label.trim()
        : undefined,
    );

    const nextConfig = { ...baseNode.data.config };
    const fields = COMPONENT_REGISTRY[kind].fields;

    fields.forEach((field) => {
      const incomingValue = node?.data?.config?.[field.key];
      const fallbackValue = baseNode.data.config[field.key];

      nextConfig[field.key] = field.type === 'number'
        ? normalizeNumber(incomingValue, fallbackValue, field)
        : normalizeSelect(incomingValue, fallbackValue, field);
    });

    return {
      ...baseNode,
      data: {
        ...baseNode.data,
        config: nextConfig,
      },
    };
  });

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = graph.edges
    .filter((edge, index) => {
      const edgeId = typeof edge?.id === 'string' ? edge.id : `edge-${index + 1}`;
      return edgeId && nodeIds.has(edge?.source) && nodeIds.has(edge?.target);
    })
    .map((edge, index) => ({
      id: typeof edge.id === 'string' && edge.id.length > 0 ? edge.id : `edge-${index + 1}`,
      source: edge.source,
      target: edge.target,
      type: RF_EDGE_TYPE,
    }));

  return {
    nodes,
    edges,
  };
}

export function getNodeLatency(node) {
  const config = node.data.config;

  switch (node.data.kind) {
    case NODE_KINDS.WEB_SERVER:
      return config.latencyMs;
    case NODE_KINDS.DATABASE:
      return Math.round((config.readLatencyMs + config.writeLatencyMs) / 2);
    case NODE_KINDS.CACHE:
      return config.latencyMs;
    case NODE_KINDS.LOAD_BALANCER:
      return 10;
    default:
      return 0;
  }
}

export function getNodeCapacity(node) {
  const config = node.data.config;

  switch (node.data.kind) {
    case NODE_KINDS.WEB_SERVER:
      return config.capacityRps;
    case NODE_KINDS.DATABASE:
      return config.connectionLimit;
    case NODE_KINDS.CACHE:
      return config.capacityRps;
    case NODE_KINDS.LOAD_BALANCER:
      return 500;
    default:
      return Number.POSITIVE_INFINITY;
  }
}

export function getTrafficPatternLabel(pattern) {
  return TRAFFIC_PATTERN_OPTIONS.find((option) => option.value === pattern)?.label ?? 'Constant';
}

export function getTrafficMultiplier(pattern, elapsedSeconds) {
  switch (pattern) {
    case 'spike': {
      const pulse = Math.sin(elapsedSeconds * 1.6);
      return pulse > 0.84 ? 2.9 : 0.7 + Math.max(pulse, 0) * 0.5;
    }
    case 'sinusoidal':
      return 1 + 0.55 * Math.sin(elapsedSeconds * 0.85);
    default:
      return 1;
  }
}

export function getNodeSuccessProbability(node, loadRatio) {
  const overloadPenalty = Math.max(0, loadRatio - 1) * 0.38;

  switch (node.data.kind) {
    case NODE_KINDS.WEB_SERVER: {
      const failureRate = node.data.config.failureRate / 100;
      return clamp(1 - failureRate - overloadPenalty, 0.05, 1);
    }
    case NODE_KINDS.DATABASE:
      return clamp(0.992 - Math.max(0, loadRatio - 0.9) * 0.62, 0.08, 1);
    case NODE_KINDS.CACHE:
      return clamp(0.996 - overloadPenalty * 0.7, 0.3, 1);
    case NODE_KINDS.LOAD_BALANCER:
      return clamp(0.999 - overloadPenalty * 0.2, 0.5, 1);
    default:
      return 1;
  }
}
