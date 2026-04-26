import {
  Archive,
  Boxes,
  Cloud,
  Cpu,
  Database,
  Globe2,
  HardDriveDownload,
  Package,
  Search,
  Server,
  Shield,
  ShieldCheck,
  Workflow,
} from 'lucide-react';

export const NODE_KINDS = {
  CLIENT: 'client',
  CDN: 'cdn',
  API_GATEWAY: 'apiGateway',
  LOAD_BALANCER: 'loadBalancer',
  WEB_SERVER: 'webServer',
  WORKER: 'worker',
  QUEUE: 'queue',
  KAFKA: 'kafka',
  DATABASE: 'database',
  NOSQL: 'noSql',
  CACHE: 'cache',
  OBJECT_STORAGE: 'objectStorage',
  SEARCH_INDEX: 'searchIndex',
};

export const TRAFFIC_PATTERN_OPTIONS = [
  { value: 'constant', label: 'Constant' },
  { value: 'spike', label: 'Spike' },
  { value: 'sinusoidal', label: 'Sinusoidal' },
];

export const ROUTING_MODE_OPTIONS = [
  { value: 'split', label: 'Split Across Paths' },
  { value: 'broadcast', label: 'Send To Every Path' },
];

export const CONSISTENCY_OPTIONS = [
  { value: 'eventual', label: 'Eventual' },
  { value: 'strong', label: 'Strong' },
];

export const STORAGE_CLASS_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'hot', label: 'Hot / Frequently Read' },
  { value: 'archive', label: 'Archive' },
];

export const LOAD_BALANCER_OPTIONS = [
  { value: 'Round Robin', label: 'Round Robin' },
  { value: 'Least Connections', label: 'Least Connections' },
];

export const TRAFFIC_LIMITS = {
  minRps: 100,
  maxRps: 5_000_000_000,
  defaultRps: 250_000,
  presets: [1_000, 100_000, 10_000_000, 1_000_000_000, 5_000_000_000],
};

function buildNumberField(key, label, unit, min, max, step) {
  return {
    key,
    label,
    type: 'number',
    unit,
    min,
    max,
    step,
  };
}

function buildSelectField(key, label, options) {
  return {
    key,
    label,
    type: 'select',
    options,
  };
}

function buildRoutingField(label = 'Downstream Flow') {
  return buildSelectField('routingMode', label, ROUTING_MODE_OPTIONS);
}

export const COMPONENT_REGISTRY = {
  [NODE_KINDS.CLIENT]: {
    label: 'Client / Ingress',
    shortLabel: 'Ingress',
    description: 'Generates external traffic and defines how demand spreads into the topology.',
    icon: Globe2,
    accent: 'from-sky-400 via-cyan-300 to-emerald-300',
    mapColor: '#5de2e7',
    capacityUnit: 'req/s',
    defaults: {
      trafficPattern: 'constant',
      routingMode: 'split',
    },
    fields: [
      buildSelectField('trafficPattern', 'Traffic Pattern', TRAFFIC_PATTERN_OPTIONS),
      buildRoutingField(),
    ],
  },
  [NODE_KINDS.CDN]: {
    label: 'CDN / Edge Cache',
    shortLabel: 'CDN',
    description: 'Absorbs global read traffic close to users before requests hit origin systems.',
    icon: Cloud,
    accent: 'from-cyan-300 via-teal-300 to-lime-300',
    mapColor: '#7ce7d2',
    capacityUnit: 'req/s',
    defaults: {
      latencyMs: 12,
      capacityRps: 600_000,
      hitRate: 84,
      routingMode: 'split',
    },
    fields: [
      buildNumberField('latencyMs', 'Latency', 'ms', 1, 180, 1),
      buildNumberField('capacityRps', 'Capacity', 'req/s', 1_000, 5_000_000_000, 1_000),
      buildNumberField('hitRate', 'Hit Rate', '%', 10, 99, 1),
      buildRoutingField(),
    ],
  },
  [NODE_KINDS.API_GATEWAY]: {
    label: 'API Gateway',
    shortLabel: 'Gateway',
    description: 'Applies auth, throttling, and request policy before traffic reaches services.',
    icon: Shield,
    accent: 'from-amber-300 via-yellow-200 to-cyan-200',
    mapColor: '#f8c86f',
    capacityUnit: 'req/s',
    defaults: {
      latencyMs: 14,
      capacityRps: 240_000,
      failureRate: 1,
      routingMode: 'split',
    },
    fields: [
      buildNumberField('latencyMs', 'Latency', 'ms', 1, 200, 1),
      buildNumberField('capacityRps', 'Capacity', 'req/s', 1_000, 5_000_000_000, 1_000),
      buildNumberField('failureRate', 'Failure Rate', '%', 0, 25, 1),
      buildRoutingField(),
    ],
  },
  [NODE_KINDS.LOAD_BALANCER]: {
    label: 'Load Balancer',
    shortLabel: 'LB',
    description: 'Distributes traffic across horizontally scaled services.',
    icon: ShieldCheck,
    accent: 'from-amber-400 via-orange-300 to-rose-300',
    mapColor: '#ffb44f',
    capacityUnit: 'req/s',
    defaults: {
      algorithm: 'Round Robin',
    },
    fields: [
      buildSelectField('algorithm', 'Algorithm', LOAD_BALANCER_OPTIONS),
    ],
  },
  [NODE_KINDS.WEB_SERVER]: {
    label: 'App Service',
    shortLabel: 'App',
    description: 'Handles synchronous product traffic and can fan out to storage and async systems.',
    icon: Server,
    accent: 'from-lime-300 via-emerald-300 to-cyan-300',
    mapColor: '#7be495',
    capacityUnit: 'req/s',
    defaults: {
      latencyMs: 42,
      capacityRps: 180_000,
      failureRate: 2,
      routingMode: 'broadcast',
    },
    fields: [
      buildNumberField('latencyMs', 'Latency', 'ms', 5, 400, 1),
      buildNumberField('capacityRps', 'Capacity', 'req/s', 1_000, 5_000_000_000, 1_000),
      buildNumberField('failureRate', 'Failure Rate', '%', 0, 60, 1),
      buildRoutingField(),
    ],
  },
  [NODE_KINDS.WORKER]: {
    label: 'Async Worker',
    shortLabel: 'Worker',
    description: 'Consumes queued jobs or events away from the request path.',
    icon: Cpu,
    accent: 'from-emerald-300 via-lime-300 to-yellow-200',
    mapColor: '#67d77a',
    capacityUnit: 'jobs/s',
    defaults: {
      latencyMs: 95,
      capacityRps: 120_000,
      failureRate: 1,
      routingMode: 'broadcast',
    },
    fields: [
      buildNumberField('latencyMs', 'Processing Time', 'ms', 5, 2_000, 5),
      buildNumberField('capacityRps', 'Capacity', 'jobs/s', 100, 5_000_000_000, 100),
      buildNumberField('failureRate', 'Failure Rate', '%', 0, 40, 1),
      buildRoutingField(),
    ],
  },
  [NODE_KINDS.QUEUE]: {
    label: 'Queue',
    shortLabel: 'Queue',
    description: 'Buffers jobs so background consumers can drain work at a controlled pace.',
    icon: Boxes,
    accent: 'from-fuchsia-300 via-rose-300 to-orange-300',
    mapColor: '#f7a8bf',
    capacityUnit: 'msg/s',
    defaults: {
      latencyMs: 12,
      capacityRps: 150_000,
      retentionHours: 24,
      routingMode: 'split',
    },
    fields: [
      buildNumberField('latencyMs', 'Enqueue Latency', 'ms', 1, 250, 1),
      buildNumberField('capacityRps', 'Throughput', 'msg/s', 100, 5_000_000_000, 100),
      buildNumberField('retentionHours', 'Retention', 'hr', 1, 720, 1),
      buildRoutingField('Consumer Delivery'),
    ],
  },
  [NODE_KINDS.KAFKA]: {
    label: 'Kafka / Event Bus',
    shortLabel: 'Kafka',
    description: 'Partitions event streams and feeds multiple downstream consumers.',
    icon: Workflow,
    accent: 'from-violet-300 via-fuchsia-300 to-rose-300',
    mapColor: '#c4b5fd',
    capacityUnit: 'events/s',
    defaults: {
      ackLatencyMs: 20,
      partitionCount: 12,
      perPartitionCapacityRps: 30_000,
      replicationFactor: 3,
      routingMode: 'broadcast',
    },
    fields: [
      buildNumberField('ackLatencyMs', 'Ack Latency', 'ms', 1, 300, 1),
      buildNumberField('partitionCount', 'Partitions', 'count', 1, 512, 1),
      buildNumberField('perPartitionCapacityRps', 'Per-Partition Capacity', 'events/s', 100, 2_000_000_000, 100),
      buildNumberField('replicationFactor', 'Replication', 'copies', 1, 7, 1),
      buildRoutingField('Consumer Groups'),
    ],
  },
  [NODE_KINDS.DATABASE]: {
    label: 'SQL Database',
    shortLabel: 'SQL',
    description: 'Durable relational storage for transactional workloads.',
    icon: Database,
    accent: 'from-fuchsia-300 via-rose-300 to-orange-300',
    mapColor: '#ff8f72',
    capacityUnit: 'conn',
    defaults: {
      readLatencyMs: 18,
      writeLatencyMs: 34,
      connectionLimit: 300_000,
    },
    fields: [
      buildNumberField('readLatencyMs', 'Read Latency', 'ms', 1, 250, 1),
      buildNumberField('writeLatencyMs', 'Write Latency', 'ms', 1, 400, 1),
      buildNumberField('connectionLimit', 'Connection Limit', 'conn', 1_000, 1_000_000_000, 1_000),
    ],
  },
  [NODE_KINDS.NOSQL]: {
    label: 'NoSQL Store',
    shortLabel: 'NoSQL',
    description: 'High-scale key-value or document storage for feeds, sessions, and hot writes.',
    icon: Database,
    accent: 'from-sky-300 via-blue-300 to-indigo-300',
    mapColor: '#7fb6ff',
    capacityUnit: 'ops/s',
    defaults: {
      readLatencyMs: 12,
      writeLatencyMs: 16,
      capacityRps: 450_000,
      consistency: 'eventual',
    },
    fields: [
      buildNumberField('readLatencyMs', 'Read Latency', 'ms', 1, 200, 1),
      buildNumberField('writeLatencyMs', 'Write Latency', 'ms', 1, 200, 1),
      buildNumberField('capacityRps', 'Capacity', 'ops/s', 1_000, 5_000_000_000, 1_000),
      buildSelectField('consistency', 'Consistency', CONSISTENCY_OPTIONS),
    ],
  },
  [NODE_KINDS.CACHE]: {
    label: 'Redis Cache',
    shortLabel: 'Redis',
    description: 'Low-latency memory tier for absorbing hot reads and session traffic.',
    icon: HardDriveDownload,
    accent: 'from-cyan-300 via-teal-300 to-lime-300',
    mapColor: '#7ce7d2',
    capacityUnit: 'req/s',
    defaults: {
      latencyMs: 8,
      capacityRps: 350_000,
      hitRate: 78,
    },
    fields: [
      buildNumberField('latencyMs', 'Latency', 'ms', 1, 150, 1),
      buildNumberField('capacityRps', 'Capacity', 'req/s', 1_000, 5_000_000_000, 1_000),
      buildNumberField('hitRate', 'Hit Rate', '%', 10, 99, 1),
    ],
  },
  [NODE_KINDS.OBJECT_STORAGE]: {
    label: 'Object Storage',
    shortLabel: 'Blob',
    description: 'Durable media and asset store for uploads, exports, and archived payloads.',
    icon: Archive,
    accent: 'from-slate-300 via-zinc-300 to-stone-300',
    mapColor: '#d6dee5',
    capacityUnit: 'ops/s',
    defaults: {
      latencyMs: 45,
      capacityRps: 160_000,
      storageClass: 'standard',
    },
    fields: [
      buildNumberField('latencyMs', 'Put/Get Latency', 'ms', 5, 2_000, 5),
      buildNumberField('capacityRps', 'Capacity', 'ops/s', 100, 5_000_000_000, 100),
      buildSelectField('storageClass', 'Storage Class', STORAGE_CLASS_OPTIONS),
    ],
  },
  [NODE_KINDS.SEARCH_INDEX]: {
    label: 'Search Index',
    shortLabel: 'Search',
    description: 'Secondary index for discovery, ranking, and query-heavy access patterns.',
    icon: Search,
    accent: 'from-rose-300 via-orange-300 to-amber-300',
    mapColor: '#f8aa8c',
    capacityUnit: 'queries/s',
    defaults: {
      queryLatencyMs: 28,
      indexLatencyMs: 20,
      capacityRps: 220_000,
    },
    fields: [
      buildNumberField('queryLatencyMs', 'Query Latency', 'ms', 1, 500, 1),
      buildNumberField('indexLatencyMs', 'Indexing Latency', 'ms', 1, 500, 1),
      buildNumberField('capacityRps', 'Capacity', 'queries/s', 100, 5_000_000_000, 100),
    ],
  },
};

export const COMPONENT_GROUPS = [
  {
    id: 'traffic',
    title: 'Traffic & Edge',
    subtitle: 'Ingress, delivery, and request steering.',
    kinds: [
      NODE_KINDS.CLIENT,
      NODE_KINDS.CDN,
      NODE_KINDS.API_GATEWAY,
      NODE_KINDS.LOAD_BALANCER,
    ],
  },
  {
    id: 'compute',
    title: 'Services & Workers',
    subtitle: 'Synchronous APIs and background execution tiers.',
    kinds: [
      NODE_KINDS.WEB_SERVER,
      NODE_KINDS.WORKER,
    ],
  },
  {
    id: 'async',
    title: 'Async & Streaming',
    subtitle: 'Buffered pipelines and event distribution.',
    kinds: [
      NODE_KINDS.QUEUE,
      NODE_KINDS.KAFKA,
    ],
  },
  {
    id: 'storage',
    title: 'Data & Storage',
    subtitle: 'Caches, databases, indexes, and durable blobs.',
    kinds: [
      NODE_KINDS.CACHE,
      NODE_KINDS.DATABASE,
      NODE_KINDS.NOSQL,
      NODE_KINDS.SEARCH_INDEX,
      NODE_KINDS.OBJECT_STORAGE,
    ],
  },
];

export const SIDEBAR_COMPONENTS = COMPONENT_GROUPS.flatMap((group) => group.kinds);
export const ASYNC_NODE_KINDS = [NODE_KINDS.WORKER, NODE_KINDS.QUEUE, NODE_KINDS.KAFKA];
export const STATEFUL_NODE_KINDS = [
  NODE_KINDS.QUEUE,
  NODE_KINDS.KAFKA,
  NODE_KINDS.CACHE,
  NODE_KINDS.DATABASE,
  NODE_KINDS.NOSQL,
  NODE_KINDS.SEARCH_INDEX,
  NODE_KINDS.OBJECT_STORAGE,
];
export const BUFFERING_NODE_KINDS = [NODE_KINDS.QUEUE, NODE_KINDS.KAFKA];

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
    buildNode('client-1', NODE_KINDS.CLIENT, { x: 20, y: 260 }, 'Global Clients'),
    buildNode('cdn-1', NODE_KINDS.CDN, { x: 270, y: 260 }, 'Edge CDN'),
    buildNode('gateway-1', NODE_KINDS.API_GATEWAY, { x: 530, y: 260 }, 'Public API Gateway'),
    buildNode('lb-1', NODE_KINDS.LOAD_BALANCER, { x: 790, y: 260 }, 'Ingress LB'),
    buildNode('web-1', NODE_KINDS.WEB_SERVER, { x: 1060, y: 120 }, 'Feed API A'),
    buildNode('web-2', NODE_KINDS.WEB_SERVER, { x: 1060, y: 400 }, 'Feed API B'),
    buildNode('cache-1', NODE_KINDS.CACHE, { x: 1320, y: 120 }, 'Redis Cache'),
    buildNode('db-1', NODE_KINDS.DATABASE, { x: 1600, y: 120 }, 'Primary SQL'),
    buildNode('kafka-1', NODE_KINDS.KAFKA, { x: 1320, y: 400 }, 'Kafka Backbone'),
    buildNode('worker-1', NODE_KINDS.WORKER, { x: 1600, y: 300 }, 'Indexer Worker A'),
    buildNode('worker-2', NODE_KINDS.WORKER, { x: 1600, y: 500 }, 'Indexer Worker B'),
    buildNode('search-1', NODE_KINDS.SEARCH_INDEX, { x: 1860, y: 260 }, 'Search Cluster'),
    buildNode('blob-1', NODE_KINDS.OBJECT_STORAGE, { x: 1860, y: 500 }, 'Object Storage'),
  ],
  edges: [
    buildEdge('edge-client-cdn', 'client-1', 'cdn-1'),
    buildEdge('edge-cdn-gateway', 'cdn-1', 'gateway-1'),
    buildEdge('edge-gateway-lb', 'gateway-1', 'lb-1'),
    buildEdge('edge-lb-web1', 'lb-1', 'web-1'),
    buildEdge('edge-lb-web2', 'lb-1', 'web-2'),
    buildEdge('edge-web1-cache', 'web-1', 'cache-1'),
    buildEdge('edge-web2-cache', 'web-2', 'cache-1'),
    buildEdge('edge-cache-db', 'cache-1', 'db-1'),
    buildEdge('edge-web1-kafka', 'web-1', 'kafka-1'),
    buildEdge('edge-web2-kafka', 'web-2', 'kafka-1'),
    buildEdge('edge-kafka-worker1', 'kafka-1', 'worker-1'),
    buildEdge('edge-kafka-worker2', 'kafka-1', 'worker-2'),
    buildEdge('edge-worker1-search', 'worker-1', 'search-1'),
    buildEdge('edge-worker2-search', 'worker-2', 'search-1'),
    buildEdge('edge-worker1-blob', 'worker-1', 'blob-1'),
    buildEdge('edge-worker2-blob', 'worker-2', 'blob-1'),
  ],
};

const STARTER_TOPOLOGY_GRAPHS = {
  quickPair: {
    nodes: [
      buildNode('client-quick', NODE_KINDS.CLIENT, { x: 80, y: 240 }, 'Mobile Clients'),
      buildNode('web-quick', NODE_KINDS.WEB_SERVER, { x: 420, y: 240 }, 'Single App Service'),
    ],
    edges: [
      buildEdge('edge-quick-client-web', 'client-quick', 'web-quick'),
    ],
  },
  apiChain: {
    nodes: [
      buildNode('client-api', NODE_KINDS.CLIENT, { x: 40, y: 240 }, 'External Clients'),
      buildNode('web-api', NODE_KINDS.WEB_SERVER, { x: 360, y: 240 }, 'API Service'),
      buildNode('db-api', NODE_KINDS.DATABASE, { x: 700, y: 240 }, 'Primary SQL'),
    ],
    edges: [
      buildEdge('edge-api-client-web', 'client-api', 'web-api'),
      buildEdge('edge-api-web-db', 'web-api', 'db-api'),
    ],
  },
  balancedStack: {
    nodes: [
      buildNode('client-balanced', NODE_KINDS.CLIENT, { x: 20, y: 240 }, 'Public Ingress'),
      buildNode('gateway-balanced', NODE_KINDS.API_GATEWAY, { x: 280, y: 240 }, 'API Gateway'),
      buildNode('lb-balanced', NODE_KINDS.LOAD_BALANCER, { x: 560, y: 240 }, 'Edge LB'),
      buildNode('web-balanced', NODE_KINDS.WEB_SERVER, { x: 860, y: 240 }, 'App Service'),
    ],
    edges: [
      buildEdge('edge-balanced-client-gateway', 'client-balanced', 'gateway-balanced'),
      buildEdge('edge-balanced-gateway-lb', 'gateway-balanced', 'lb-balanced'),
      buildEdge('edge-balanced-lb-web', 'lb-balanced', 'web-balanced'),
    ],
  },
  asyncPipeline: {
    nodes: [
      buildNode('client-async', NODE_KINDS.CLIENT, { x: 40, y: 240 }, 'App Clients'),
      buildNode('gateway-async', NODE_KINDS.API_GATEWAY, { x: 300, y: 240 }, 'Public Gateway'),
      buildNode('web-async', NODE_KINDS.WEB_SERVER, { x: 600, y: 240 }, 'Booking API'),
      buildNode('queue-async', NODE_KINDS.QUEUE, { x: 900, y: 240 }, 'Booking Queue'),
      buildNode('worker-async', NODE_KINDS.WORKER, { x: 1220, y: 240 }, 'Reservation Worker'),
      buildNode('nosql-async', NODE_KINDS.NOSQL, { x: 1520, y: 240 }, 'NoSQL Store'),
    ],
    edges: [
      buildEdge('edge-async-client-gateway', 'client-async', 'gateway-async'),
      buildEdge('edge-async-gateway-web', 'gateway-async', 'web-async'),
      buildEdge('edge-async-web-queue', 'web-async', 'queue-async'),
      buildEdge('edge-async-queue-worker', 'queue-async', 'worker-async'),
      buildEdge('edge-async-worker-nosql', 'worker-async', 'nosql-async'),
    ],
  },
  fullPlatform: DEFAULT_GRAPH,
};

export const STARTER_TOPOLOGIES = [
  {
    id: 'quickPair',
    label: '2 Components',
    description: 'Tiny ingress to app smoke test.',
  },
  {
    id: 'apiChain',
    label: '3 Components',
    description: 'Synchronous app path ending in SQL.',
  },
  {
    id: 'balancedStack',
    label: '4 Components',
    description: 'Ingress, gateway, load balancer, and app tier.',
  },
  {
    id: 'asyncPipeline',
    label: 'Async Pipeline',
    description: 'Request flow handing off work through a queue to background workers.',
  },
  {
    id: 'fullPlatform',
    label: 'Full Platform',
    description: 'Modern multi-hop stack with CDN, SQL, Kafka, workers, search, and blobs.',
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
    case NODE_KINDS.CDN:
    case NODE_KINDS.API_GATEWAY:
    case NODE_KINDS.WEB_SERVER:
    case NODE_KINDS.WORKER:
    case NODE_KINDS.QUEUE:
    case NODE_KINDS.CACHE:
    case NODE_KINDS.OBJECT_STORAGE:
      return config.latencyMs;
    case NODE_KINDS.KAFKA:
      return config.ackLatencyMs;
    case NODE_KINDS.DATABASE:
    case NODE_KINDS.NOSQL:
      return Math.round((config.readLatencyMs + config.writeLatencyMs) / 2);
    case NODE_KINDS.SEARCH_INDEX:
      return Math.round((config.queryLatencyMs + config.indexLatencyMs) / 2);
    case NODE_KINDS.LOAD_BALANCER:
      return 10;
    default:
      return 0;
  }
}

export function getNodeCapacity(node) {
  const config = node.data.config;

  switch (node.data.kind) {
    case NODE_KINDS.CDN:
    case NODE_KINDS.API_GATEWAY:
    case NODE_KINDS.WEB_SERVER:
    case NODE_KINDS.WORKER:
    case NODE_KINDS.QUEUE:
    case NODE_KINDS.NOSQL:
    case NODE_KINDS.CACHE:
    case NODE_KINDS.OBJECT_STORAGE:
    case NODE_KINDS.SEARCH_INDEX:
      return config.capacityRps;
    case NODE_KINDS.KAFKA:
      return config.partitionCount * config.perPartitionCapacityRps;
    case NODE_KINDS.DATABASE:
      return config.connectionLimit;
    case NODE_KINDS.LOAD_BALANCER:
      return Number.POSITIVE_INFINITY;
    default:
      return Number.POSITIVE_INFINITY;
  }
}

export function getNodeCapacityUnit(kind) {
  return COMPONENT_REGISTRY[kind]?.capacityUnit ?? 'req/s';
}

export function getNodeRoutingMode(node) {
  return node?.data?.config?.routingMode ?? 'split';
}

export function isBufferingNodeKind(kind) {
  return BUFFERING_NODE_KINDS.includes(kind);
}

export function isAsyncNodeKind(kind) {
  return ASYNC_NODE_KINDS.includes(kind);
}

export function isStatefulNodeKind(kind) {
  return STATEFUL_NODE_KINDS.includes(kind);
}

export function getTrafficPatternLabel(pattern) {
  return TRAFFIC_PATTERN_OPTIONS.find((option) => option.value === pattern)?.label ?? 'Constant';
}

export function getRoutingModeLabel(routingMode) {
  return ROUTING_MODE_OPTIONS.find((option) => option.value === routingMode)?.label ?? 'Split Across Paths';
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
  const effectiveLoad = Math.min(loadRatio, 1);

  switch (node.data.kind) {
    case NODE_KINDS.API_GATEWAY: {
      const failureRate = node.data.config.failureRate / 100;
      return clamp(1 - failureRate - Math.max(0, effectiveLoad - 0.85) * 0.18, 0.6, 1);
    }
    case NODE_KINDS.WEB_SERVER:
    case NODE_KINDS.WORKER: {
      const failureRate = node.data.config.failureRate / 100;
      return clamp(1 - failureRate - Math.max(0, effectiveLoad - 0.82) * 0.22, 0.35, 1);
    }
    case NODE_KINDS.DATABASE:
      return clamp(0.994 - Math.max(0, effectiveLoad - 0.8) * 0.28, 0.4, 1);
    case NODE_KINDS.NOSQL: {
      const consistencyPenalty = node.data.config.consistency === 'strong' ? 0.01 : 0;
      return clamp(0.996 - consistencyPenalty - Math.max(0, effectiveLoad - 0.88) * 0.16, 0.55, 1);
    }
    case NODE_KINDS.CDN:
    case NODE_KINDS.CACHE:
      return clamp(0.998 - Math.max(0, effectiveLoad - 0.92) * 0.18, 0.75, 1);
    case NODE_KINDS.QUEUE:
      return clamp(0.999 - Math.max(0, effectiveLoad - 0.9) * 0.1, 0.85, 1);
    case NODE_KINDS.KAFKA: {
      const replicationPenalty = Math.max(0, node.data.config.replicationFactor - 3) * 0.0025;
      return clamp(0.9995 - replicationPenalty - Math.max(0, effectiveLoad - 0.88) * 0.08, 0.88, 1);
    }
    case NODE_KINDS.OBJECT_STORAGE: {
      const storagePenalty = node.data.config.storageClass === 'archive' ? 0.015 : 0;
      return clamp(0.997 - storagePenalty - Math.max(0, effectiveLoad - 0.92) * 0.1, 0.7, 1);
    }
    case NODE_KINDS.SEARCH_INDEX:
      return clamp(0.993 - Math.max(0, effectiveLoad - 0.84) * 0.18, 0.55, 1);
    case NODE_KINDS.LOAD_BALANCER:
      return clamp(0.9996 - Math.max(0, effectiveLoad - 0.95) * 0.06, 0.9, 1);
    default:
      return 1;
  }
}
