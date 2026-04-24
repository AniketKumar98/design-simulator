# ArchitectSim Web

ArchitectSim Web is a stateless, browser-based system design simulator for modeling request flow through an architecture diagram. It combines a node-based canvas with a lightweight traffic engine so you can sketch a topology, simulate live traffic, and visually spot bottlenecks before thinking about deeper backend infrastructure or persistence.

## Vision

The goal of the project is to make system design more interactive and easier to reason about:

- Draw architectures instead of describing them only in text.
- Test small and large topologies in the browser without any backend.
- Show traffic flow, failure behavior, and latency buildup in a visual way.
- Make sharing simple by encoding the current graph into a URL-safe Base64 config.

This project is intentionally stateless. A design lives entirely in the browser and can be exported and shared without a database.

## Current Capabilities

### Canvas and topology editing

- Drag components from the left sidebar onto the board.
- Click `Add` to place a component without dragging.
- Start from built-in starter topologies:
  - `2 Components`
  - `3 Components`
  - `4 Components`
  - `Full Demo`
- Connect nodes by dragging from the right output handle of one node to the left input handle of another.
- Select nodes and edges directly on the canvas.
- Clear the board, delete the selected node or connection, or duplicate the selected node.
- Use keyboard shortcuts:
  - `Delete` / `Backspace` removes the selected node or connection
  - `Ctrl + D` or `Cmd + D` duplicates the selected node

### Supported components

- `Client / Ingress`
  - Traffic Pattern: `Constant`, `Spike`, `Sinusoidal`
- `Load Balancer`
  - Algorithm: `Round Robin`
- `Web Server`
  - Latency
  - Capacity
  - Failure Rate
- `Database`
  - Read Latency
  - Write Latency
  - Connection Limit
- `Cache`
  - Latency
  - Capacity
  - Hit Rate

### Simulation behavior

- Uses a breadth-first traversal to move requests from `Client / Ingress` nodes through connected edges.
- Applies cumulative latency and success probability at each hop.
- Simulates load balancer fan-out with round robin routing.
- Animates request pulses along edges with `requestAnimationFrame`.
- Highlights bottlenecks when live traffic exceeds node capacity.
- Shows live analytics for:
  - successes
  - failures
  - average latency
  - throughput
  - bottleneck count

### Real-world helpers

- Live topology health warnings for:
  - empty board
  - missing ingress nodes
  - disconnected nodes
  - unconnected multi-node designs
- Inspector panel for editing node configuration and reviewing selected links.
- Topology inventory list to quickly jump to any node or edge.
- `Copy Config` generates a shareable URL containing the current graph state.

## Tech Stack

- React
- Vite
- React Flow (`@xyflow/react`)
- Tailwind CSS
- Lucide React

## How to Run

### 1. Install dependencies

```powershell
npm.cmd install
```

### 2. Start the dev server

```powershell
npm.cmd run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

Important: do not open `index.html` directly with `file://`. This is a Vite app and must be served through the dev server or preview server.

### 3. Build for production

```powershell
npm.cmd run build
```

### 4. Preview the production build

```powershell
npm.cmd run preview
```

## How to Use the Simulator

### Basic flow

1. Load a starter topology or add components from the left panel.
2. Connect components by dragging from the amber output handle to the cyan input handle.
3. Select a node to edit its limits and configuration in the inspector.
4. Set global traffic RPS from the control panel.
5. Click `Start Simulation`.
6. Watch pulses move across edges and monitor the analytics overlay.

### Editing nodes

- Click any node to edit its label and configuration.
- Change latency, capacity, failure rate, connection limit, or traffic pattern depending on node type.
- Duplicate a node to test horizontal scaling ideas quickly.
- Delete nodes to simplify the topology for smaller experiments.

### Editing links

- Click a connection to inspect its live flow and traffic intensity.
- Delete a selected connection if you want to rewire the topology.

### Testing different sizes

- Use `2 Components` for quick smoke tests.
- Use `3 Components` for a basic client -> app -> database path.
- Use `4 Components` for a more realistic ingress -> LB -> app -> DB flow.
- Use `Full Demo` for scale-out plus cache behavior.

### Sharing a design

- Click `Copy Config` to copy a URL with the serialized graph.
- Open that URL in another browser tab or share it with someone else.
- The receiving user can load the same topology without any backend storage.

## Project Structure

```text
src/
  App.jsx                       Main simulator shell and React Flow integration
  constants.js                  Component registry, starter graphs, schemas
  hooks/useSimulation.js        Stateless traffic simulation engine
  lib/serialization.js          Base64 URL import/export helpers
  components/
    ComponentPalette.jsx        Sidebar and quick-start templates
    ControlPanel.jsx            Simulation controls and topology health
    PropertyInspector.jsx       Node and edge inspector
    AnalyticsOverlay.jsx        Live success/failure chart
    nodes/ArchitectureNode.jsx  Custom node rendering
    edges/TrafficEdge.jsx       Animated edge rendering
```

## Current Scope and Limitations

- The simulator is intentionally client-side only.
- Metrics are heuristic and educational, not infrastructure-grade benchmarking.
- Sharing is URL-based rather than persisted server-side.
- The current routing model focuses on directional flow and round robin behavior rather than full protocol-level realism.

## Next Useful Directions

- Per-edge latency and packet loss configuration
- Cache hit/miss impact on downstream database traffic
- Custom node types such as queues, async workers, and message brokers
- Scenario playback and saved traffic presets
- More advanced analytics and comparison between two topologies
