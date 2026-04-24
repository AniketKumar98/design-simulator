import { useEffect, useRef, useState } from 'react';
import {
  getNodeCapacity,
  getNodeLatency,
  getNodeSuccessProbability,
  getTrafficMultiplier,
  NODE_KINDS,
} from '../constants';

const SNAPSHOT_INTERVAL_MS = 260;
const WINDOW_MS = 1000;
const HISTORY_LIMIT = 32;

function buildIdleState(nodes, edges) {
  const nodeMetrics = {};
  const edgeMetrics = {};

  nodes.forEach((node) => {
    nodeMetrics[node.id] = {
      loadRps: 0,
      capacity: getNodeCapacity(node),
      loadRatio: 0,
      successProbability: getNodeSuccessProbability(node, 0),
      latencyMs: getNodeLatency(node),
      isBottleneck: false,
    };
  });

  edges.forEach((edge) => {
    edgeMetrics[edge.id] = {
      rps: 0,
      trafficIntensity: 0,
      isActive: false,
    };
  });

  return {
    pulsesByEdge: {},
    nodeMetrics,
    edgeMetrics,
    analytics: {
      successTotal: 0,
      failureTotal: 0,
      avgLatencyMs: 0,
      throughputRps: 0,
      bottleneckCount: 0,
      history: [],
    },
  };
}

function prune(windowEntries, now) {
  if (!windowEntries) {
    return [];
  }

  while (windowEntries.length > 0 && now - windowEntries[0] > WINDOW_MS) {
    windowEntries.shift();
  }

  return windowEntries;
}

function getPulseDuration(cumulativeLatency) {
  return Math.min(1750, Math.max(280, 1600 - cumulativeLatency * 6));
}

export function useSimulation({ nodes, edges, isRunning, globalRps }) {
  const [state, setState] = useState(() => buildIdleState(nodes, edges));
  const latestGraphRef = useRef({ nodes, edges, globalRps, isRunning });
  const animationFrameRef = useRef(null);
  const lastFrameRef = useRef(0);
  const elapsedSecondsRef = useRef(0);
  const pulseCounterRef = useRef(0);
  const roundRobinRef = useRef({});
  const perClientAccumulatorRef = useRef({});
  const nodeHitsRef = useRef({});
  const edgeHitsRef = useRef({});
  const completionHitsRef = useRef([]);
  const pulsesRef = useRef([]);
  const totalsRef = useRef({
    success: 0,
    failure: 0,
    latency: 0,
    completions: 0,
  });
  const historyRef = useRef([]);
  const lastSnapshotRef = useRef(0);

  useEffect(() => {
    latestGraphRef.current = { nodes, edges, globalRps, isRunning };

    if (!isRunning) {
      setState(buildIdleState(nodes, edges));
    }
  }, [edges, globalRps, isRunning, nodes]);

  useEffect(() => {
    if (!isRunning) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      return undefined;
    }

    lastFrameRef.current = 0;
    elapsedSecondsRef.current = 0;
    pulseCounterRef.current = 0;
    roundRobinRef.current = {};
    perClientAccumulatorRef.current = {};
    nodeHitsRef.current = {};
    edgeHitsRef.current = {};
    completionHitsRef.current = [];
    pulsesRef.current = [];
    totalsRef.current = {
      success: 0,
      failure: 0,
      latency: 0,
      completions: 0,
    };
    historyRef.current = [];
    lastSnapshotRef.current = 0;
    setState(buildIdleState(nodes, edges));

    const step = (timestamp) => {
      const currentGraph = latestGraphRef.current;

      if (!currentGraph.isRunning) {
        return;
      }

      if (!lastFrameRef.current) {
        lastFrameRef.current = timestamp;
      }

      const deltaMs = Math.min(50, timestamp - lastFrameRef.current);
      lastFrameRef.current = timestamp;
      elapsedSecondsRef.current += deltaMs / 1000;

      const nodeMap = {};
      const adjacency = {};
      const clientNodes = [];

      currentGraph.nodes.forEach((node) => {
        nodeMap[node.id] = node;
        adjacency[node.id] = [];

        if (node.data.kind === NODE_KINDS.CLIENT) {
          clientNodes.push(node);
        }
      });

      currentGraph.edges.forEach((edge) => {
        if (adjacency[edge.source]) {
          adjacency[edge.source].push(edge);
        }
      });

      const perClientBaseRps = clientNodes.length > 0
        ? currentGraph.globalRps / clientNodes.length
        : 0;

      clientNodes.forEach((client) => {
        const multiplier = getTrafficMultiplier(
          client.data.config.trafficPattern,
          elapsedSecondsRef.current,
        );

        const nextAccumulator = (perClientAccumulatorRef.current[client.id] ?? 0)
          + (perClientBaseRps * multiplier * deltaMs) / 1000;

        const spawnCount = Math.min(16, Math.floor(nextAccumulator));
        perClientAccumulatorRef.current[client.id] = nextAccumulator - spawnCount;

        for (let iteration = 0; iteration < spawnCount; iteration += 1) {
          const queue = [
            {
              nodeId: client.id,
              cumulativeLatency: 0,
              cumulativeSuccess: 1,
            },
          ];

          const visited = new Set([client.id]);
          const traversedNodes = [{ nodeId: client.id, latencyMs: 0, successProbability: 1 }];
          const traversedEdges = [];
          const completions = [];

          // We use a breadth-first walk so each emitted wave explores the live graph level by level.
          while (queue.length > 0) {
            const current = queue.shift();
            const activeNode = nodeMap[current.nodeId];
            const outgoingEdges = adjacency[current.nodeId] ?? [];

            let nextEdges = outgoingEdges;

            if (activeNode?.data.kind === NODE_KINDS.LOAD_BALANCER && outgoingEdges.length > 0) {
              const rrIndex = roundRobinRef.current[activeNode.id] ?? 0;
              nextEdges = [outgoingEdges[rrIndex % outgoingEdges.length]];
              roundRobinRef.current[activeNode.id] = rrIndex + 1;
            }

            if (nextEdges.length === 0 && current.nodeId !== client.id) {
              completions.push({
                latencyMs: current.cumulativeLatency,
                successProbability: current.cumulativeSuccess,
              });
            }

            nextEdges.forEach((edge) => {
              if (visited.has(edge.target)) {
                return;
              }

              const targetNode = nodeMap[edge.target];

              if (!targetNode) {
                return;
              }

              visited.add(edge.target);
              const currentNodeHits = prune(nodeHitsRef.current[targetNode.id], timestamp);
              const loadRatio = currentNodeHits.length / Math.max(getNodeCapacity(targetNode), 1);
              const hopLatency = getNodeLatency(targetNode);
              const hopSuccess = getNodeSuccessProbability(targetNode, loadRatio);

              const nextStep = {
                nodeId: targetNode.id,
                cumulativeLatency: current.cumulativeLatency + hopLatency,
                cumulativeSuccess: current.cumulativeSuccess * hopSuccess,
              };

              traversedNodes.push({
                nodeId: targetNode.id,
                latencyMs: nextStep.cumulativeLatency,
                successProbability: nextStep.cumulativeSuccess,
              });
              traversedEdges.push({
                edgeId: edge.id,
                cumulativeLatency: nextStep.cumulativeLatency,
                successProbability: nextStep.cumulativeSuccess,
              });
              queue.push(nextStep);
            });
          }

          if (completions.length === 0 && traversedNodes.length > 1) {
            const lastNode = traversedNodes[traversedNodes.length - 1];
            completions.push({
              latencyMs: lastNode.latencyMs,
              successProbability: lastNode.successProbability,
            });
          }

          traversedNodes.forEach((visit) => {
            const hits = nodeHitsRef.current[visit.nodeId] ?? [];
            hits.push(timestamp);
            nodeHitsRef.current[visit.nodeId] = hits;
          });

          traversedEdges.forEach((visit) => {
            const hits = edgeHitsRef.current[visit.edgeId] ?? [];
            hits.push(timestamp);
            edgeHitsRef.current[visit.edgeId] = hits;
            pulsesRef.current.push({
              id: `pulse-${pulseCounterRef.current += 1}`,
              edgeId: visit.edgeId,
              start: timestamp,
              durationMs: getPulseDuration(visit.cumulativeLatency),
              accent: visit.successProbability < 0.85 ? '#ff7557' : '#5de2e7',
            });
          });

          completions.forEach((completion) => {
            completionHitsRef.current.push(timestamp);
            totalsRef.current.success += completion.successProbability;
            totalsRef.current.failure += 1 - completion.successProbability;
            totalsRef.current.latency += completion.latencyMs;
            totalsRef.current.completions += 1;
          });
        }
      });

      const pulsesByEdge = {};
      const activePulses = [];

      pulsesRef.current.forEach((pulse) => {
        const progress = (timestamp - pulse.start) / pulse.durationMs;

        if (progress >= 1) {
          return;
        }

        const nextPulse = { ...pulse, progress };
        activePulses.push(nextPulse);
        pulsesByEdge[pulse.edgeId] = [...(pulsesByEdge[pulse.edgeId] ?? []), nextPulse];
      });

      pulsesRef.current = activePulses;

      const nodeMetrics = {};
      let bottleneckCount = 0;

      currentGraph.nodes.forEach((node) => {
        const hits = prune(nodeHitsRef.current[node.id], timestamp);
        const capacity = getNodeCapacity(node);
        const loadRps = hits.length;
        const finiteCapacity = Number.isFinite(capacity);
        const loadRatio = finiteCapacity ? loadRps / Math.max(capacity, 1) : 0;
        const isBottleneck = finiteCapacity && loadRps > capacity;

        if (isBottleneck) {
          bottleneckCount += 1;
        }

        nodeMetrics[node.id] = {
          loadRps,
          capacity,
          loadRatio,
          successProbability: getNodeSuccessProbability(node, loadRatio),
          latencyMs: getNodeLatency(node),
          isBottleneck,
        };
      });

      const edgeMetrics = {};

      currentGraph.edges.forEach((edge) => {
        const hits = prune(edgeHitsRef.current[edge.id], timestamp);
        const rps = hits.length;

        edgeMetrics[edge.id] = {
          rps,
          trafficIntensity: Math.min(1, rps / Math.max(currentGraph.globalRps, 1)),
          isActive: rps > 0,
        };
      });

      if (
        historyRef.current.length === 0
        || timestamp - lastSnapshotRef.current >= SNAPSHOT_INTERVAL_MS
      ) {
        historyRef.current = [
          ...historyRef.current.slice(-(HISTORY_LIMIT - 1)),
          {
            time: timestamp,
            success: totalsRef.current.success,
            failure: totalsRef.current.failure,
          },
        ];
        lastSnapshotRef.current = timestamp;
      }

      const completed = totalsRef.current.completions;
      const completionWindow = prune(completionHitsRef.current, timestamp);
      const analytics = {
        successTotal: totalsRef.current.success,
        failureTotal: totalsRef.current.failure,
        avgLatencyMs: completed > 0 ? totalsRef.current.latency / completed : 0,
        throughputRps: completionWindow.length,
        bottleneckCount,
        history: historyRef.current,
      };

      setState({
        pulsesByEdge,
        nodeMetrics,
        edgeMetrics,
        analytics,
      });

      animationFrameRef.current = requestAnimationFrame(step);
    };

    animationFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [edges, isRunning, nodes]);

  return state;
}
