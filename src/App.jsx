import { startTransition, useEffect, useRef, useState } from 'react';
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
import AnalyticsOverlay from './components/AnalyticsOverlay';
import ComponentPalette from './components/ComponentPalette';
import ControlPanel from './components/ControlPanel';
import PropertyInspector from './components/PropertyInspector';
import TrafficEdge from './components/edges/TrafficEdge';
import ArchitectureNode from './components/nodes/ArchitectureNode';
import {
  COMPONENT_REGISTRY,
  createNode,
  getDefaultGraph,
  getEmptyGraph,
  getStarterGraph,
  NODE_KINDS,
  RF_EDGE_TYPE,
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

function EmptyCanvasState({ onAddComponent, onLoadStarter }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
      <div className="pointer-events-auto w-full max-w-md rounded-[30px] border border-slate-700/80 bg-slate-900/76 p-5 shadow-2xl shadow-black/35 backdrop-blur-xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">
          Canvas Ready
        </p>
        <h2 className="mt-2 font-display text-2xl text-white">Drop a component to begin</h2>
        <p className="mt-2 text-sm text-slate-400">Or start from a tiny preset.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {STARTER_TOPOLOGIES.map((topology) => (
            <button
              key={topology.id}
              type="button"
              onClick={() => onLoadStarter(topology.id)}
              className="rounded-full border border-slate-700/80 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 transition hover:border-slate-500/80 hover:bg-slate-900/80"
            >
              {topology.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
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
            Add Service
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
  const [selectedNodeId, setSelectedNodeId] = useState(null);
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
  }, [selectedEdgeId, selectedNodeId, edges, nodes]);

  function queueFitView(shouldFit = true) {
    if (!flowInstance || !shouldFit) {
      return;
    }

    window.setTimeout(() => {
      flowInstance.fitView({ duration: 550, padding: 0.22 });
    }, 0);
  }

  function applyGraph(nextGraph, options = {}) {
    const nextSelectedNodeId = options.selectedNodeId ?? null;

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
      const x = window.innerWidth * 0.5 + (nodes.length % 3) * 48;
      const y = window.innerHeight * 0.45 + Math.floor(nodes.length / 3) * 36;
      return flowInstance.screenToFlowPosition({ x, y });
    }

    return {
      x: 180 + (nodes.length % 3) * 260,
      y: 180 + Math.floor(nodes.length / 3) * 180,
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
    applyGraph(getStarterGraph(topologyId));
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

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-slate-900"
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
      <ReactFlow
        fitView
        fitViewOptions={{ padding: 0.22 }}
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
        className="h-full w-full"
      >
        <MiniMap
          pannable
          zoomable
          className="!bottom-24 !right-4 !left-auto !h-[120px] !w-[190px]"
          nodeColor={getMiniMapColor}
          maskColor="rgba(6, 14, 18, 0.62)"
        />
        <Controls position="bottom-right" />
        <Background gap={24} size={1.2} color="rgba(186, 219, 213, 0.12)" />
      </ReactFlow>

      {nodes.length === 0 ? (
        <EmptyCanvasState
          onAddComponent={handleAddComponent}
          onLoadStarter={handleLoadStarter}
        />
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-30">
        <ControlPanel
          copyFeedback={copyFeedback}
          globalRps={globalRps}
          isRunning={isRunning}
          onClearBoard={handleClearBoard}
          onCopyConfig={handleCopyConfig}
          onToggleRunning={() => setIsRunning((current) => !current)}
          setGlobalRps={setGlobalRps}
        />
        <ComponentPalette
          onAddComponent={handleAddComponent}
          onLoadStarter={handleLoadStarter}
        />
        <PropertyInspector
          edge={selectedEdge}
          node={selectedNode}
          onClose={() => {
            setSelectedEdgeId(null);
            setSelectedNodeId(null);
          }}
          onDeleteSelection={handleDeleteSelection}
          onDuplicateNode={handleDuplicateNode}
          onFieldChange={handleFieldChange}
          onLabelChange={handleLabelChange}
        />
        <AnalyticsOverlay
          analytics={simulation.analytics}
          isRunning={isRunning}
        />
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
