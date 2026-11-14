import { useState, useSyncExternalStore } from "react"
import { Background, Controls, Handle, MiniMap, Position, ReactFlow, useNodesState, type Edge, type Node, type NodeProps } from "@xyflow/react"
import { ArrowRight, FlaskConical } from "@/components/ui/icons"
import { catalogEntry, research } from "@/mocks/catalog"
import flame from "@/assets/flex-flame.webp"
import "@xyflow/react/dist/style.css"

export const studyUrl = (id: string) => `/explorer?study=${encodeURIComponent(id)}`

const groups = [
  { label: "All experiments", ids: research.map(({ id }) => id) },
  { label: "Liquid & gas", ids: ["flex-1", "acme-bre"] },
  { label: "Solid & smoke", ids: ["bass-bass-ii-bass-m", "saffire-i-iii", "sofie-mist", "same-same-r"] },
]

type FlowNode = Node<{ title: string; kind: "experiment" | "fuel" | "scale" | "preview"; compact?: boolean }, "research">

const nodes: FlowNode[] = [
  { id: "experiment", type: "research", position: { x: 50, y: 0 }, data: { title: "experiment", kind: "experiment" } },
  { id: "fuel", type: "research", position: { x: 0, y: 125 }, data: { title: "fuel type", kind: "fuel" } },
  { id: "scale", type: "research", position: { x: 40, y: 280 }, data: { title: "preview scale", kind: "scale" } },
  { id: "preview", type: "research", position: { x: 390, y: 50 }, data: { title: "research preview", kind: "preview" } },
]
const edges: Edge[] = nodes.slice(0, 3).map(({ id }) => ({ id: `${id}-preview`, source: id, target: "preview", targetHandle: id }))

const compactQuery = window.matchMedia("(max-width: 740px)")

function subscribeToCompactLayout(callback: () => void) {
  compactQuery.addEventListener("change", callback)
  return () => compactQuery.removeEventListener("change", callback)
}

const compactPositions = [
  { x: 0, y: 20 }, { x: 160, y: 0 }, { x: 320, y: 24 }, { x: 85, y: 178 },
]

type Settings = {
  group: number
  setGroup: (value: number) => void
  studyId: string
  setStudyId: (value: string) => void
  scale: number
  setScale: (value: number) => void
}

function NodeContent({ kind, settings }: { kind: FlowNode["data"]["kind"]; settings: Settings }) {
  const { group, setGroup, studyId, setStudyId, scale, setScale } = settings
  const study = research.find(({ id }) => id === studyId) ?? research[0]
  if (kind === "experiment") return <select className="nodrag nowheel" aria-label="Experiment" value={studyId} onChange={(event) => setStudyId(event.target.value)}>
    {groups[group].ids.map((id) => <option key={id} value={id}>{catalogEntry(id)?.code}</option>)}
  </select>
  if (kind === "fuel") return <div className="nodrag research-fuels" role="group" aria-label="Fuel type">
    {groups.map(({ label }, index) => <label key={label}><input type="radio" name="landing-fuel" checked={index === group} onChange={() => setGroup(index)} />{label}</label>)}
  </div>
  if (kind === "scale") return <input className="nodrag nowheel" type="range" aria-label="Preview scale" min="60" max="130" value={scale} onChange={(event) => setScale(Number(event.target.value))} />
  return <a className="nodrag research-preview" href={studyUrl(study.id)} aria-label={`Open ${study.title}`}>
    <div className="research-preview-art">
      <div style={{ transform: `scale(${scale / 100})` }}>
        {study.id === "flex-1" ? <img src={flame} alt="" /> : <FlaskConical size={82} />}
      </div>
    </div>
    <span><strong>{catalogEntry(study.id)?.code}</strong><small>{study.title}</small><ArrowRight size={15} /></span>
  </a>
}

function InteractiveNode({ data }: NodeProps<FlowNode & { data: FlowNode["data"] & { settings: Settings } }>) {
  return <div className={`research-node research-node-${data.kind}`}>
    <div className="research-node-heading">{data.title}</div>
    <div className="research-node-content"><NodeContent kind={data.kind} settings={data.settings} /></div>
    {data.kind === "preview" ? edges.map(({ source }, index) =>
      <Handle key={source} type="target" position={data.compact ? Position.Top : Position.Left} id={source} style={data.compact ? { left: 52 + index * 98 } : { top: 53 + index * 20 }} />
    ) : <Handle type="source" position={data.compact ? Position.Bottom : Position.Right} style={data.compact ? undefined : { top: "70%" }} />}
  </div>
}

const nodeTypes = { research: InteractiveNode }

export function ResearchFlow() {
  const [group, updateGroup] = useState(0)
  const [studyId, setStudyId] = useState("flex-1")
  const [scale, setScale] = useState(100)
  const compact = useSyncExternalStore(subscribeToCompactLayout, () => compactQuery.matches)
  const settings: Settings = {
    group, studyId, setStudyId, scale, setScale,
    setGroup(value) {
      updateGroup(value)
      if (!groups[value].ids.includes(studyId)) setStudyId(groups[value].ids[0])
    },
  }

  return <ResearchCanvas key={String(compact)} compact={compact} settings={settings} />
}

function ResearchCanvas({ compact, settings }: { compact: boolean; settings: Settings }) {
  const [layout, , onNodesChange] = useNodesState(compact
    ? nodes.map((node, index) => ({ ...node, position: compactPositions[index] }))
    : nodes)

  return <div className="research-flow" aria-label="Interactive experiment graph">
    <ReactFlow nodes={layout.map((node) => ({ ...node, data: { ...node.data, compact, settings } }))} edges={edges}
      nodeTypes={nodeTypes} onNodesChange={onNodesChange} fitView fitViewOptions={{ padding: 0.08, maxZoom: 1 }}
      minZoom={0.25} zoomOnScroll={false} zoomOnDoubleClick={false} nodesConnectable={false} edgesFocusable={false}
      deleteKeyCode={null} preventScrolling={false}>
      <Controls position="bottom-left" showInteractive={false} />
    </ReactFlow>
  </div>
}

const demoNodes: Node[] = [
  { id: "question", position: { x: 0, y: 0 }, data: { label: "Research question" } },
  { id: "experiment", position: { x: 150, y: 105 }, data: { label: "NASA experiment" } },
  { id: "finding", position: { x: 300, y: 0 }, data: { label: "Published findings" } },
]
const demoEdges = [
  { id: "question-experiment", source: "question", target: "experiment" },
  { id: "experiment-finding", source: "experiment", target: "finding" },
]

const connectionNodes: Node[] = [
  { id: "oxygen", position: { x: 145, y: 0 }, data: { label: "Oxygen concentration" } },
  { id: "flex", position: { x: 0, y: 100 }, data: { label: "FLEX" }, className: "workflow-study-node" },
  { id: "sofie", position: { x: 290, y: 100 }, data: { label: "SoFIE" }, className: "workflow-study-node" },
]
const connectionEdges: Edge[] = [
  { id: "oxygen-flex", source: "oxygen", target: "flex", type: "smoothstep" },
  { id: "oxygen-sofie", source: "oxygen", target: "sofie", type: "smoothstep" },
]

export function WorkflowFlow({ overview = false }: { overview?: boolean }) {
  const [layout, , onNodesChange] = useNodesState(overview ? connectionNodes : demoNodes)
  return <div className="workflow-flow" aria-label={overview ? "Diagram of experiments related by oxygen concentration" : "Research workflow diagram"}>
    <ReactFlow nodes={layout} edges={overview ? connectionEdges : demoEdges} onNodesChange={onNodesChange} fitView fitViewOptions={{ padding: 0.16, maxZoom: 1.15 }}
      minZoom={0.3} zoomOnScroll={false} nodesConnectable={false} deleteKeyCode={null} preventScrolling={false}>
      <Background gap={20} size={1} />
      <Controls showInteractive={false} />
      {overview && <MiniMap pannable zoomable />}
    </ReactFlow>
  </div>
}
