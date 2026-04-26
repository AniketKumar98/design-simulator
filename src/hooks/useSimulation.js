import { useEffect, useRef, useState } from 'react';
import {
  getNodeCapacity,
  getNodeLatency,
  getNodeCapacityUnit,
  getNodeRoutingMode,
  getNodeSuccessProbability,
  getTrafficMultiplier,
  isBufferingNodeKind,
  NODE_KINDS,
} from '../constants';
import {
  formatPercent,
  formatRps,
  formatUtilization,
  formatValueWithUnit,
} from '../lib/format';

const SNAPSHOT_INTERVAL_MS = 260;
const HISTORY_LIMIT = 32;
const MAX_ALERTS = 6;
const MAX_PULSES_PER_FRAME = 6;

function buildIdleState(nodes, edges) {
  const nodeMetrics = {};
  const edgeMetrics = {};

  nodes.forEach((node) => {
    const capacity = getNodeCapacity(node);

    nodeMetrics[node.id] = {
      backlogRps: 0,
      capacity,
      isBottleneck: false,
      latencyMs: getNodeLatency(node),
      loadRatio: 0,
      loadRps: 0,
      outputRatio: getNodeSuccessProbability(node, 0),
      processedRps: 0,
      rejectedRps: 0,
      successProbability: getNodeSuccessProbability(node, 0),
    };
  });

  edges.forEach((edge) => {
    edgeMetrics[edge.id] = {
      avgLatencyMs: 0,
      isActive: false,
      rps: 0,
      successRate: 1,
      trafficIntensity: 0,
    };
  });

  return {
    analytics: {
      alerts: [],
      avgLatencyMs: 0,
      bottleneckCount: 0,
      failureTotal: 0,
      history: [],
      successTotal: 0,
      throughputRps: 0,
    },
    edgeMetrics,
    nodeMetrics,
    pulsesByEdge: {},
  };
}

function cloneVisited(visited, nextNodeId) {
  const nextVisited = new Set(visited);
  nextVisited.add(nextNodeId);
  return nextVisited;
}

function buildGraph(nodes, edges) {
  const adjacency = {};
  const incomingCounts = {};
  const nodeMap = {};
  const clientNodes = [];

  nodes.forEach((node) => {
    adjacency[node.id] = [];
    incomingCounts[node.id] = 0;
    nodeMap[node.id] = node;

    if (node.data.kind === NODE_KINDS.CLIENT) {
      clientNodes.push(node);
    }
  });

  edges.forEach((edge) => {
    if (!adjacency[edge.source] || !nodeMap[edge.target]) {
      return;
    }

    adjacency[edge.source].push(edge);
    incomingCounts[edge.target] = (incomingCounts[edge.target] ?? 0) + 1;
  });

  return {
    adjacency,
    clientNodes,
    incomingCounts,
    nodeMap,
  };
}

function getTrafficIntensity(flowRps, globalRps) {
  if (flowRps <= 0 || globalRps <= 0) {
    return 0;
  }

  return Math.min(1, Math.log10(flowRps + 1) / Math.max(Math.log10(globalRps + 1), 1));
}

function getPulseDuration(cumulativeLatency) {
  return Math.min(1750, Math.max(280, 1600 - cumulativeLatency * 6));
}

function getOutgoingEdgeFlow(node, flowRps, outgoingCount) {
  if (outgoingCount <= 0 || flowRps <= 0) {
    return 0;
  }

  return getNodeRoutingMode(node) === 'broadcast'
    ? flowRps
    : flowRps / outgoingCount;
}

function computeRawFlows(graph, globalRps, elapsedSeconds) {
  const nodeInputRps = {};
  const edgeRps = {};
  const clientSourceRps = {};
  const queue = [];
  const clientCount = graph.clientNodes.length || 1;

  Object.keys(graph.nodeMap).forEach((nodeId) => {
    nodeInputRps[nodeId] = 0;
  });

  Object.values(graph.adjacency).flat().forEach((edge) => {
    edgeRps[edge.id] = 0;
  });

  graph.clientNodes.forEach((client) => {
    const multiplier = getTrafficMultiplier(
      client.data.config.trafficPattern,
      elapsedSeconds,
    );
    const sourceRps = (globalRps / clientCount) * multiplier;

    clientSourceRps[client.id] = sourceRps;
    nodeInputRps[client.id] += sourceRps;
    queue.push({
      flowRps: sourceRps,
      nodeId: client.id,
      visited: new Set([client.id]),
    });
  });

  while (queue.length > 0) {
    const current = queue.shift();
    const currentNode = graph.nodeMap[current.nodeId];
    const outgoingEdges = graph.adjacency[current.nodeId] ?? [];

    if (outgoingEdges.length === 0 || current.flowRps <= 0) {
      continue;
    }

    const flowPerEdge = getOutgoingEdgeFlow(currentNode, current.flowRps, outgoingEdges.length);

    outgoingEdges.forEach((edge) => {
      if (current.visited.has(edge.target) || flowPerEdge <= 0) {
        return;
      }

      edgeRps[edge.id] = (edgeRps[edge.id] ?? 0) + flowPerEdge;
      nodeInputRps[edge.target] = (nodeInputRps[edge.target] ?? 0) + flowPerEdge;
      queue.push({
        flowRps: flowPerEdge,
        nodeId: edge.target,
        visited: cloneVisited(current.visited, edge.target),
      });
    });
  }

  return {
    clientSourceRps,
    edgeRps,
    nodeInputRps,
  };
}

function buildNodeMetrics(nodes, nodeInputRps) {
  const metrics = {};
  let bottleneckCount = 0;

  nodes.forEach((node) => {
    const capacity = getNodeCapacity(node);
    const loadRps = nodeInputRps[node.id] ?? 0;
    const finiteCapacity = Number.isFinite(capacity);
    const acceptedRps = finiteCapacity ? Math.min(loadRps, Math.max(capacity, 0)) : loadRps;
    const loadRatio = finiteCapacity ? loadRps / Math.max(capacity, 1) : 0;
    const serviceSuccessProbability = getNodeSuccessProbability(node, loadRatio);
    const processedRps = acceptedRps * serviceSuccessProbability;
    const rejectedRps = Math.max(0, loadRps - processedRps);
    const outputRatio = loadRps > 0 ? processedRps / loadRps : serviceSuccessProbability;
    const isBottleneck = finiteCapacity && loadRps > capacity;
    const backlogRps = finiteCapacity && isBufferingNodeKind(node.data.kind)
      ? Math.max(0, loadRps - acceptedRps)
      : 0;

    if (isBottleneck) {
      bottleneckCount += 1;
    }

    metrics[node.id] = {
      backlogRps,
      capacity,
      isBottleneck,
      latencyMs: getNodeLatency(node),
      loadRatio,
      loadRps,
      outputRatio,
      processedRps,
      rejectedRps,
      successProbability: outputRatio,
    };
  });

  return {
    bottleneckCount,
    metrics,
  };
}

function computeOutcomeFlows(graph, nodeMetrics, clientSourceRps) {
  const edgeLatencyTotals = {};
  const edgeSuccessOutputRps = {};
  const queue = graph.clientNodes.map((client) => ({
    cumulativeLatency: 0,
    nodeId: client.id,
    outputRps: clientSourceRps[client.id] ?? 0,
    visited: new Set([client.id]),
  }));

  let avgLatencyMs = 0;
  let failureRps = 0;
  let latencyWeighted = 0;
  let successRps = 0;
  let terminalRps = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    const currentNode = graph.nodeMap[current.nodeId];
    const outgoingEdges = graph.adjacency[current.nodeId] ?? [];

    if (outgoingEdges.length === 0) {
      if (currentNode?.data.kind !== NODE_KINDS.CLIENT) {
        successRps += current.outputRps;
        terminalRps += current.outputRps;
        latencyWeighted += current.cumulativeLatency * current.outputRps;
      }

      continue;
    }

    const flowPerEdge = getOutgoingEdgeFlow(currentNode, current.outputRps, outgoingEdges.length);

    outgoingEdges.forEach((edge) => {
      if (current.visited.has(edge.target) || flowPerEdge <= 0) {
        return;
      }

      const targetMetric = nodeMetrics[edge.target];

      if (!targetMetric) {
        return;
      }

      const successfulOutput = flowPerEdge * (targetMetric.outputRatio ?? targetMetric.successProbability);
      const failedAtTarget = flowPerEdge - successfulOutput;
      const nextLatency = current.cumulativeLatency + targetMetric.latencyMs;

      edgeSuccessOutputRps[edge.id] = (edgeSuccessOutputRps[edge.id] ?? 0) + successfulOutput;
      edgeLatencyTotals[edge.id] = (edgeLatencyTotals[edge.id] ?? 0) + nextLatency * flowPerEdge;

      if (failedAtTarget > 0) {
        failureRps += failedAtTarget;
        terminalRps += failedAtTarget;
        latencyWeighted += nextLatency * failedAtTarget;
      }

      if (successfulOutput <= 0) {
        return;
      }

      const targetOutgoingEdges = graph.adjacency[edge.target] ?? [];

      if (targetOutgoingEdges.length === 0) {
        successRps += successfulOutput;
        terminalRps += successfulOutput;
        latencyWeighted += nextLatency * successfulOutput;
        return;
      }

      queue.push({
        cumulativeLatency: nextLatency,
        nodeId: edge.target,
        outputRps: successfulOutput,
        visited: cloneVisited(current.visited, edge.target),
      });
    });
  }

  if (terminalRps > 0) {
    avgLatencyMs = latencyWeighted / terminalRps;
  }

  return {
    avgLatencyMs,
    edgeLatencyTotals,
    edgeSuccessOutputRps,
    failureRps,
    successRps,
    terminalRps,
  };
}

function buildAlerts(nodes, graph, nodeMetrics) {
  const alerts = [];

  nodes.forEach((node) => {
    const metric = nodeMetrics[node.id];

    if (!metric || node.data.kind === NODE_KINDS.CLIENT) {
      return;
    }

    const incomingCount = graph.incomingCounts[node.id] ?? 0;

    if (isBufferingNodeKind(node.data.kind) && metric.backlogRps > 0) {
      alerts.push({
        detail: `${formatValueWithUnit(metric.backlogRps, getNodeCapacityUnit(node.data.kind))} is accumulating faster than this tier can drain.${incomingCount > 1 ? ` Traffic from ${incomingCount} upstream paths is converging here.` : ''}`,
        id: `${node.id}-backlog`,
        severity: metric.loadRatio > 1.5 ? 'critical' : 'warning',
        title: `${node.data.label} is building backlog`,
      });
      return;
    }

    if (metric.isBottleneck) {
      alerts.push({
        detail: `${formatRps(metric.loadRps)} is landing on a ${formatValueWithUnit(metric.capacity, getNodeCapacityUnit(node.data.kind))} ceiling (${formatUtilization(metric.loadRatio)} utilization).${incomingCount > 1 ? ` Traffic from ${incomingCount} upstream paths is converging here.` : ''}`,
        id: `${node.id}-capacity`,
        severity: metric.loadRatio > 1.5 ? 'critical' : 'warning',
        title: `${node.data.label} is overloaded`,
      });
      return;
    }

    if (metric.rejectedRps > 0 && metric.successProbability < 0.985) {
      let reason = `Estimated success is down to ${formatPercent(metric.successProbability)}.`;

      if (node.data.kind === NODE_KINDS.WEB_SERVER && node.data.config.failureRate > 0) {
        reason += ` Intrinsic failure is set to ${node.data.config.failureRate}%.`;
      } else {
        reason += ` Current utilization is ${formatUtilization(metric.loadRatio)}.`;
      }

      alerts.push({
        detail: `${formatRps(metric.rejectedRps)} is being dropped at this hop. ${reason}`,
        id: `${node.id}-drops`,
        severity: metric.successProbability < 0.94 ? 'critical' : 'warning',
        title: `${node.data.label} is dropping requests`,
      });
    }
  });

  const severityRank = {
    critical: 0,
    warning: 1,
  };

  return alerts
    .sort((left, right) => (
      severityRank[left.severity] - severityRank[right.severity]
    ))
    .slice(0, MAX_ALERTS);
}

export function useSimulation({ nodes, edges, isRunning, globalRps }) {
  const [state, setState] = useState(() => buildIdleState(nodes, edges));
  const latestGraphRef = useRef({ edges, globalRps, isRunning, nodes });
  const animationFrameRef = useRef(null);
  const edgePulseAccumulatorRef = useRef({});
  const elapsedSecondsRef = useRef(0);
  const historyRef = useRef([]);
  const lastFrameRef = useRef(0);
  const lastSnapshotRef = useRef(0);
  const pulseCounterRef = useRef(0);
  const pulsesRef = useRef([]);
  const totalsRef = useRef({
    failure: 0,
    latency: 0,
    terminals: 0,
    success: 0,
  });

  useEffect(() => {
    latestGraphRef.current = { edges, globalRps, isRunning, nodes };

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

    edgePulseAccumulatorRef.current = {};
    elapsedSecondsRef.current = 0;
    historyRef.current = [];
    lastFrameRef.current = 0;
    lastSnapshotRef.current = 0;
    pulseCounterRef.current = 0;
    pulsesRef.current = [];
    totalsRef.current = {
      failure: 0,
      latency: 0,
      terminals: 0,
      success: 0,
    };
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
      const deltaSeconds = deltaMs / 1000;
      lastFrameRef.current = timestamp;
      elapsedSecondsRef.current += deltaSeconds;

      const graph = buildGraph(currentGraph.nodes, currentGraph.edges);
      const rawFlows = computeRawFlows(graph, currentGraph.globalRps, elapsedSecondsRef.current);
      const nodeMetricsResult = buildNodeMetrics(currentGraph.nodes, rawFlows.nodeInputRps);
      const outcomes = computeOutcomeFlows(graph, nodeMetricsResult.metrics, rawFlows.clientSourceRps);
      const alerts = buildAlerts(currentGraph.nodes, graph, nodeMetricsResult.metrics);

      totalsRef.current.success += outcomes.successRps * deltaSeconds;
      totalsRef.current.failure += outcomes.failureRps * deltaSeconds;
      totalsRef.current.latency += outcomes.avgLatencyMs * outcomes.terminalRps * deltaSeconds;
      totalsRef.current.terminals += outcomes.terminalRps * deltaSeconds;

      const edgeMetrics = {};

      currentGraph.edges.forEach((edge) => {
        const rps = rawFlows.edgeRps[edge.id] ?? 0;
        const successOutputRps = outcomes.edgeSuccessOutputRps[edge.id] ?? 0;
        const avgLatencyMs = rps > 0 ? (outcomes.edgeLatencyTotals[edge.id] ?? 0) / rps : 0;
        const trafficIntensity = getTrafficIntensity(rps, currentGraph.globalRps);
        const successRate = rps > 0 ? successOutputRps / rps : 1;

        edgeMetrics[edge.id] = {
          avgLatencyMs,
          isActive: rps > 0,
          rps,
          successRate,
          trafficIntensity,
        };

        if (rps <= 0) {
          edgePulseAccumulatorRef.current[edge.id] = 0;
          return;
        }

        const pulseRatePerSecond = 0.5 + trafficIntensity * 6;
        const nextAccumulator = (edgePulseAccumulatorRef.current[edge.id] ?? 0)
          + pulseRatePerSecond * deltaSeconds;
        const spawnCount = Math.min(MAX_PULSES_PER_FRAME, Math.floor(nextAccumulator));

        edgePulseAccumulatorRef.current[edge.id] = nextAccumulator - spawnCount;

        for (let index = 0; index < spawnCount; index += 1) {
          pulsesRef.current.push({
            accent: successRate < 0.92 ? '#ff7557' : '#5de2e7',
            durationMs: getPulseDuration(avgLatencyMs),
            edgeId: edge.id,
            id: `pulse-${pulseCounterRef.current += 1}`,
            start: timestamp,
          });
        }
      });

      const pulsesByEdge = {};
      const nextPulses = [];

      pulsesRef.current.forEach((pulse) => {
        const progress = (timestamp - pulse.start) / pulse.durationMs;

        if (progress >= 1) {
          return;
        }

        const nextPulse = { ...pulse, progress };
        nextPulses.push(nextPulse);
        pulsesByEdge[pulse.edgeId] = [...(pulsesByEdge[pulse.edgeId] ?? []), nextPulse];
      });

      pulsesRef.current = nextPulses;

      if (
        historyRef.current.length === 0
        || timestamp - lastSnapshotRef.current >= SNAPSHOT_INTERVAL_MS
      ) {
        historyRef.current = [
          ...historyRef.current.slice(-(HISTORY_LIMIT - 1)),
          {
            failure: totalsRef.current.failure,
            success: totalsRef.current.success,
            time: timestamp,
          },
        ];
        lastSnapshotRef.current = timestamp;
      }

      const terminals = totalsRef.current.terminals;
      const analytics = {
        alerts,
        avgLatencyMs: terminals > 0 ? totalsRef.current.latency / terminals : 0,
        bottleneckCount: nodeMetricsResult.bottleneckCount,
        failureTotal: totalsRef.current.failure,
        history: historyRef.current,
        successTotal: totalsRef.current.success,
        throughputRps: outcomes.terminalRps,
      };

      setState({
        analytics,
        edgeMetrics,
        nodeMetrics: nodeMetricsResult.metrics,
        pulsesByEdge,
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
