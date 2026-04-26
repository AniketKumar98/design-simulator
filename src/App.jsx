import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react';
import {
  addEdge,
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import { Copy, Pause, Play, Radar } from 'lucide-react';
import AnalyticsOverlay from './components/AnalyticsOverlay';
import ComponentPalette from './components/ComponentPalette';
import ControlPanel from './components/ControlPanel';
import PropertyInspector from './components/PropertyInspector';
import TrafficEdge from './components/edges/TrafficEdge';
import ArchitectureNode from './components/nodes/ArchitectureNode';
import {
  ASYNC_NODE_KINDS,
  COMPONENT_REGISTRY,
  createNode,
  getDefaultGraph,
  getEmptyGraph,
  getStarterGraph,
  NODE_KINDS,
  RF_EDGE_TYPE,
  STATEFUL_NODE_KINDS,
  STARTER_TOPOLOGIES,
  TRAFFIC_LIMITS,
} from './constants';
import { useSimulation } from './hooks/useSimulation';
import { buildShareUrl, readGraphFromUrl } from './lib/serialization';

const nodeTypes = {
  architectureNode: ArchitectureNode,
};

const edgeTypes = {
  trafficEdge: TrafficEdge,
};

function getMiniMapColor(node) {
  return COMPONENT_REGISTRY[node.data?.kind]?.mapColor ?? '#b0ccc5';
}

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.closest('input')
    || target.closest('textarea')
    || target.closest('select')
    || target.isContentEditable
  );
}

function buildTopologyStats(nodes, edges) {
  const inbound = {};
  const outbound = {};

  nodes.forEach((node) => {
    inbound[node.id] = 0;
    outbound[node.id] = 0;
  });

  edges.forEach((edge) => {
    inbound[edge.target] = (inbound[edge.target] ?? 0) + 1;
    outbound[edge.source] = (outbound[edge.source] ?? 0) + 1;
  });

  const orphanCount = nodes.filter((node) => (inbound[node.id] ?? 0) + (outbound[node.id] ?? 0) === 0).length;
  const ingressCount = nodes.filter((node) => node.data.kind === NODE_KINDS.CLIENT).length;
  const statefulCount = nodes.filter((node) => STATEFUL_NODE_KINDS.includes(node.data.kind)).length;
  const asyncCount = nodes.filter((node) => ASYNC_NODE_KINDS.includes(node.data.kind)).length;
  const warnings = [];

  if (nodes.length === 0) {
    warnings.push('Canvas is empty. Load a starter topology or add a component to begin.');
  }

  if (nodes.length > 0 && ingressCount === 0) {
    warnings.push('No Client / Ingress node exists, so requests have no starting point.');
  }

  if (nodes.length > 1 && edges.length === 0) {
    warnings.push('Components are on the board but nothing is connected yet.');
  }

  if (orphanCount > 0) {
    warnings.push(`${orphanCount} node(s) are disconnected from the rest of the design.`);
  }

  return {
    asyncCount,
    edgeCount: edges.length,
    ingressCount,
    nodeCount: nodes.length,
    orphanCount,
    statefulCount,
    warnings,
  };
}

function EmptyCanvasState({ onAddComponent, onLoadStarter }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-6">
      <div className="pointer-events-auto w-full max-w-3xl rounded-[30px] border border-white/10 bg-slate-950/74 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-cyan-200/70">
          Empty Board
        </p>
        <h2 className="mt-2 font-display text-3xl text-white">Start with a tiny topology</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Start with a tiny flow, then grow it into a real platform with queues, Kafka, workers,
          and storage layers. You can add components one by one or load a starter layout.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {STARTER_TOPOLOGIES.map((topology) => (
            <button
              key={topology.id}
              type="button"
              onClick={() => onLoadStarter(topology.id)}
              className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/10"
            >
              <div className="font-display text-base text-white">{topology.label}</div>
              <div className="mt-1 text-xs leading-5 text-slate-400">{topology.description}</div>
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onAddComponent(NODE_KINDS.CLIENT)}
            className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/35 hover:bg-cyan-300/15"
          >
            Add Ingress
          </button>
          <button
            type="button"
            onClick={() => onAddComponent(NODE_KINDS.WEB_SERVER)}
            className="rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-200/35 hover:bg-amber-300/15"
          >
            Add App Service
          </button>
          <button
            type="button"
            onClick={() => onAddComponent(NODE_KINDS.QUEUE)}
            className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-4 py-2 text-sm font-semibold text-fuchsia-100 transition hover:border-fuchsia-200/35 hover:bg-fuchsia-300/15"
          >
            Add Queue
          </button>
        </div>
      </div>
    </div>
  );
}

function SimulatorWorkspace() {
  const initialGraph = useRef(readGraphFromUrl() ?? getDefaultGraph());
  const [flowInstance, setFlowInstance] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.current.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.current.edges);
  const [selectedNodeId, setSelectedNodeId] = useState(initialGraph.current.nodes[1]?.id ?? null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [globalRps, setGlobalRps] = useState(TRAFFIC_LIMITS.defaultRps);
  const [copyFeedback, setCopyFeedback] = useState('');

  const simulation = useSimulation({
    nodes,
    edges,
    isRunning,
    globalRps,
  });
  const deferredHistory = useDeferredValue(simulation.analytics.history);

  useEffect(() => {
    if (!copyFeedback) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setCopyFeedback(''), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [copyFeedback]);

  useEffect(() => {
    if (selectedNodeId && !nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }

    if (selectedEdgeId && !edges.some((edge) => edge.id === selectedEdgeId)) {
      setSelectedEdgeId(null);
    }
  }, [edges, nodes, selectedEdgeId, selectedNodeId]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (!selectedNodeId && !selectedEdgeId) {
          return;
        }

        event.preventDefault();
        handleDeleteSelection();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd' && selectedNodeId) {
        event.preventDefault();
        handleDuplicateNode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [edges, nodes, selectedEdgeId, selectedNodeId]);

  function queueFitView(shouldFit = true) {
    if (!flowInstance || !shouldFit) {
      return;
    }

    window.setTimeout(() => {
      flowInstance.fitView({ duration: 550, padding: 0.18 });
    }, 0);
  }

  function handleFitView() {
    if (!flowInstance) {
      return;
    }

    flowInstance.fitView({ duration: 550, padding: 0.18 });
  }

  function applyGraph(nextGraph, options = {}) {
    const nextSelectedNodeId = options.selectedNodeId ?? nextGraph.nodes[0]?.id ?? null;

    startTransition(() => {
      setNodes(nextGraph.nodes);
      setEdges(nextGraph.edges);
      setSelectedNodeId(nextSelectedNodeId);
      setSelectedEdgeId(null);
      setIsRunning(false);
    });

    queueFitView(nextGraph.nodes.length > 0);
  }

  function getPlacementPosition() {
    if (flowInstance) {
      const x = window.innerWidth * 0.52 + (nodes.length % 3) * 42;
      const y = window.innerHeight * 0.44 + Math.floor(nodes.length / 3) * 28;
      return flowInstance.screenToFlowPosition({ x, y });
    }

    return {
      x: 120 + (nodes.length % 3) * 260,
      y: 120 + Math.floor(nodes.length / 3) * 180,
    };
  }

  function handleAddComponent(kind) {
    if (!Object.prototype.hasOwnProperty.call(COMPONENT_REGISTRY, kind)) {
      return;
    }

    const node = createNode(kind, getPlacementPosition());

    startTransition(() => {
      setNodes((currentNodes) => [...currentNodes, node]);
      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);
    });
  }

  function handleLoadStarter(topologyId) {
    applyGraph(getStarterGraph(topologyId), { selectedNodeId: null });
  }

  async function handleCopyConfig() {
    try {
      const shareUrl = buildShareUrl({ nodes, edges });
      await navigator.clipboard.writeText(shareUrl);
      setCopyFeedback('Share URL copied to clipboard.');
    } catch {
      setCopyFeedback('Clipboard access was blocked in this browser context.');
    }
  }

  function handleResetGraph() {
    applyGraph(getDefaultGraph(), { selectedNodeId: 'lb-1' });
    setGlobalRps(TRAFFIC_LIMITS.defaultRps);
  }

  function handleClearBoard() {
    applyGraph(getEmptyGraph());
  }

  function handleDeleteSelection() {
    if (selectedEdgeId) {
      setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== selectedEdgeId));
      setSelectedEdgeId(null);
      return;
    }

    if (selectedNodeId) {
      setNodes((currentNodes) => currentNodes.filter((node) => node.id !== selectedNodeId));
      setEdges((currentEdges) => currentEdges.filter((edge) => (
        edge.source !== selectedNodeId && edge.target !== selectedNodeId
      )));
      setSelectedNodeId(null);
    }
  }

  function handleDuplicateNode() {
    if (!selectedNodeId) {
      return;
    }

    const originalNode = nodes.find((node) => node.id === selectedNodeId);

    if (!originalNode) {
      return;
    }

    const duplicateNode = createNode(originalNode.data.kind, {
      x: originalNode.position.x + 70,
      y: originalNode.position.y + 70,
    });

    duplicateNode.data = {
      ...duplicateNode.data,
      label: `${originalNode.data.label} Copy`,
      config: { ...originalNode.data.config },
    };

    startTransition(() => {
      setNodes((currentNodes) => [...currentNodes, duplicateNode]);
      setSelectedNodeId(duplicateNode.id);
      setSelectedEdgeId(null);
    });
  }

  function handleFieldChange(fieldKey, value) {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id !== selectedNodeId) {
          return node;
        }

        const field = COMPONENT_REGISTRY[node.data.kind].fields.find((entry) => entry.key === fieldKey);

        if (!field) {
          return node;
        }

        let nextValue = value;

        if (field.type === 'number') {
          const parsed = Number(value);

          if (!Number.isFinite(parsed)) {
            return node;
          }

          nextValue = Math.min(field.max ?? parsed, Math.max(field.min ?? parsed, parsed));
        }

        return {
          ...node,
          data: {
            ...node.data,
            config: {
              ...node.data.config,
              [fieldKey]: nextValue,
            },
          },
        };
      }),
    );
  }

  function handleLabelChange(label) {
    setNodes((currentNodes) =>
      currentNodes.map((node) => (
        node.id === selectedNodeId
          ? {
            ...node,
            data: {
              ...node.data,
              label,
            },
          }
          : node
      )),
    );
  }

  const nodeById = {};

  nodes.forEach((node) => {
    nodeById[node.id] = node;
  });

  const displayNodes = nodes.map((node) => ({
    ...node,
    selected: node.id === selectedNodeId,
    data: {
      ...node.data,
      outgoingCount: edges.filter((edge) => edge.source === node.id).length,
      simulation: simulation.nodeMetrics[node.id],
    },
  }));

  const displayEdges = edges.map((edge) => ({
    ...edge,
    selected: edge.id === selectedEdgeId,
    type: RF_EDGE_TYPE,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 18,
      height: 18,
      color: edge.id === selectedEdgeId
        ? '#ffb44f'
        : simulation.edgeMetrics[edge.id]?.isActive
          ? '#5de2e7'
          : 'rgba(186, 219, 213, 0.2)',
    },
    data: {
      pulses: simulation.pulsesByEdge[edge.id] ?? [],
      avgLatencyMs: simulation.edgeMetrics[edge.id]?.avgLatencyMs ?? 0,
      rps: simulation.edgeMetrics[edge.id]?.rps ?? 0,
      sourceLabel: nodeById[edge.source]?.data.label ?? edge.source,
      successRate: simulation.edgeMetrics[edge.id]?.successRate ?? 1,
      targetLabel: nodeById[edge.target]?.data.label ?? edge.target,
      trafficIntensity: simulation.edgeMetrics[edge.id]?.trafficIntensity ?? 0,
    },
  }));

  const selectedNode = displayNodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedEdge = displayEdges.find((edge) => edge.id === selectedEdgeId) ?? null;
  const topologyStats = buildTopologyStats(nodes, edges);
  const selectionLabel = selectedNode
    ? selectedNode.data.label
    : selectedEdge
      ? `${selectedEdge.data.sourceLabel} -> ${selectedEdge.data.targetLabel}`
      : '';

  return (
    <div className="min-h-screen px-4 py-4 lg:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1800px] grid-cols-1 gap-4 xl:items-start xl:grid-cols-[320px_minmax(0,1fr)_380px]">
        <ComponentPalette
          onAddComponent={handleAddComponent}
          onLoadStarter={handleLoadStarter}
        />

        <main className="glass-panel panel-edge relative flex flex-col overflow-hidden rounded-[32px]">
          <div className="shrink-0 border-b border-white/8 bg-slate-950/40 px-5 py-4 backdrop-blur-sm md:flex md:items-end md:justify-between md:gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-cyan-200/70">
                ArchitectSim Web
              </p>
              <h1 className="mt-2 font-display text-3xl text-white">
                Browser-native distributed system simulator
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Model real production topologies with gateways, queues, Kafka, caches, workers,
                search, and storage, then drive live traffic through the graph to expose bottlenecks.
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-0 md:justify-end">
              <button
                type="button"
                onClick={handleCopyConfig}
                className="flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/35 hover:bg-cyan-300/15"
              >
                <Copy size={16} />
                {copyFeedback ? 'Config Copied' : 'Copy Config'}
              </button>
              <button
                type="button"
                onClick={handleFitView}
                className="flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-200/35 hover:bg-amber-300/15"
              >
                <Radar size={16} />
                Fit View
              </button>
              <button
                type="button"
                onClick={() => setIsRunning((current) => !current)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
              >
                {isRunning ? <Pause size={16} /> : <Play size={16} />}
                {isRunning ? 'Stop Simulation' : 'Start Simulation'}
              </button>
            </div>
          </div>

          <div
            className="relative flex h-[72vh] min-h-[620px] w-full min-w-0 flex-col lg:min-h-[680px]"
            onDrop={(event) => {
              event.preventDefault();

              if (!flowInstance) {
                return;
              }

              const kind = event.dataTransfer.getData('application/architectsim-node');

              if (!kind || !Object.prototype.hasOwnProperty.call(COMPONENT_REGISTRY, kind)) {
                return;
              }

              const position = flowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
              });
              const node = createNode(kind, position);

              startTransition(() => {
                setNodes((currentNodes) => [...currentNodes, node]);
                setSelectedNodeId(node.id);
                setSelectedEdgeId(null);
              });
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
          >
            <div className="relative min-h-0 flex-1">
              {nodes.length === 0 ? (
                <EmptyCanvasState
                  onAddComponent={handleAddComponent}
                  onLoadStarter={handleLoadStarter}
                />
              ) : null}

              <ReactFlow
                fitView
                nodes={displayNodes}
                edges={displayEdges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onInit={setFlowInstance}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={(_, node) => {
                  setSelectedNodeId(node.id);
                  setSelectedEdgeId(null);
                }}
                onEdgeClick={(_, edge) => {
                  setSelectedEdgeId(edge.id);
                  setSelectedNodeId(null);
                }}
                onPaneClick={() => {
                  setSelectedNodeId(null);
                  setSelectedEdgeId(null);
                }}
                onConnect={(connection) => {
                  if (!connection.source || !connection.target || connection.source === connection.target) {
                    return;
                  }

                  setEdges((currentEdges) => {
                    if (currentEdges.some((edge) => (
                      edge.source === connection.source && edge.target === connection.target
                    ))) {
                      return currentEdges;
                    }

                    return addEdge(
                      {
                        ...connection,
                        id: `edge-${connection.source}-${connection.target}-${Math.random().toString(36).slice(2, 7)}`,
                        type: RF_EDGE_TYPE,
                        markerEnd: {
                          type: MarkerType.ArrowClosed,
                          width: 18,
                          height: 18,
                          color: '#5de2e7',
                        },
                      },
                      currentEdges,
                    );
                  });
                }}
                defaultEdgeOptions={{
                  type: RF_EDGE_TYPE,
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 18,
                    height: 18,
                    color: '#5de2e7',
                  },
                }}
                className=""
              >
                <MiniMap
                  pannable
                  zoomable
                  className="!bottom-4 !left-4 !h-[140px] !w-[220px]"
                  nodeColor={getMiniMapColor}
                  maskColor="rgba(6, 14, 18, 0.62)"
                />
                <Controls position="bottom-right" />
                <Background gap={24} size={1.2} color="rgba(186, 219, 213, 0.12)" />
              </ReactFlow>
            </div>

            <div
              className={`px-4 transition-all duration-300 ${
                isRunning
                  ? 'border-t border-white/8 py-4'
                  : 'max-h-0 overflow-hidden border-transparent py-0'
              }`}
            >
              <AnalyticsOverlay
                analytics={simulation.analytics}
                history={deferredHistory}
                isRunning={isRunning}
              />
            </div>
          </div>
        </main>

        <div className="soft-scrollbar grid gap-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
          <ControlPanel
            analytics={simulation.analytics}
            canDeleteSelection={Boolean(selectedNode || selectedEdge)}
            canDuplicateNode={Boolean(selectedNode)}
            copyFeedback={copyFeedback}
            globalRps={globalRps}
            isRunning={isRunning}
            onClearBoard={handleClearBoard}
            onCopyConfig={handleCopyConfig}
            onDeleteSelection={handleDeleteSelection}
            onDuplicateNode={handleDuplicateNode}
            onResetGraph={handleResetGraph}
            onToggleRunning={() => setIsRunning((current) => !current)}
            selectionLabel={selectionLabel}
            setGlobalRps={setGlobalRps}
            topologyStats={topologyStats}
          />
          <PropertyInspector
            edge={selectedEdge}
            edges={displayEdges}
            node={selectedNode}
            nodes={displayNodes}
            onDeleteSelection={handleDeleteSelection}
            onDuplicateNode={handleDuplicateNode}
            onFieldChange={handleFieldChange}
            onLabelChange={handleLabelChange}
            onSelectEdge={(edgeId) => {
              setSelectedEdgeId(edgeId);
              setSelectedNodeId(null);
            }}
            onSelectNode={(nodeId) => {
              setSelectedNodeId(nodeId);
              setSelectedEdgeId(null);
            }}
            selectedEdgeId={selectedEdgeId}
            selectedNodeId={selectedNodeId}
          />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <SimulatorWorkspace />
    </ReactFlowProvider>
  );
}
