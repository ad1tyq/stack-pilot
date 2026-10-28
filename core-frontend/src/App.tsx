import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MarkerType,
  ConnectionMode,
  Handle,
  Position,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
  type OnConnect,
  type NodeProps
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  fetchRecommendations,
  fetchScaffolding,
  saveProject,
  fetchProjects
} from './services/api';
import type { RecommendationItem, ScaffoldResponse, ArchitectureProject } from './types';
import {
  Download,
  Save,
  Copy,
  Check,
  FolderOpen,
  X,
  Server,
  Database,
  Cpu,
  Activity,
  Box,
  Layers,
  Trash2,
  Folder,
  FileCode,
  Minus,
  Square,
  HelpCircle
} from 'lucide-react';

interface ComponentMeta {
  category: string;
  typeBadge: string;
  icon: React.ReactNode;
}

const COMPONENT_METADATA: Record<string, ComponentMeta> = {
  'fastapi': { category: 'service', typeBadge: 'REST Service', icon: <Server size={13} /> },
  'spring-boot': { category: 'service', typeBadge: 'Enterprise Service', icon: <Server size={13} /> },
  'express': { category: 'service', typeBadge: 'Node.js Service', icon: <Server size={13} /> },
  'django': { category: 'service', typeBadge: 'Web Framework', icon: <Server size={13} /> },
  'nestjs': { category: 'service', typeBadge: 'Modular Backend', icon: <Server size={13} /> },
  'flask': { category: 'service', typeBadge: 'Micro Service', icon: <Server size={13} /> },

  'postgresql': { category: 'datastore', typeBadge: 'Relational DB', icon: <Database size={13} /> },
  'mysql': { category: 'datastore', typeBadge: 'Relational DB', icon: <Database size={13} /> },
  'mongodb': { category: 'datastore', typeBadge: 'Document DB', icon: <Database size={13} /> },
  'elasticsearch': { category: 'datastore', typeBadge: 'Search Engine', icon: <Database size={13} /> },

  'redis': { category: 'cache/broker', typeBadge: 'In-Memory Store', icon: <Cpu size={13} /> },
  'rabbitmq': { category: 'cache/broker', typeBadge: 'AMQP Broker', icon: <Cpu size={13} /> },
  'kafka': { category: 'cache/broker', typeBadge: 'Event Stream', icon: <Cpu size={13} /> },
  'celery': { category: 'cache/broker', typeBadge: 'Task Queue', icon: <Cpu size={13} /> },
  'bullmq': { category: 'cache/broker', typeBadge: 'Redis Queue', icon: <Cpu size={13} /> },

  'docker': { category: 'infra', typeBadge: 'Container Runtime', icon: <Box size={13} /> },
  'prometheus': { category: 'observability', typeBadge: 'Metrics Engine', icon: <Activity size={13} /> },
  'grafana': { category: 'observability', typeBadge: 'Dashboard', icon: <Activity size={13} /> },
  'sentry': { category: 'observability', typeBadge: 'Error Tracking', icon: <Activity size={13} /> },

  'alembic': { category: 'tool', typeBadge: 'DB Migration', icon: <Layers size={13} /> },
  'flyway': { category: 'tool', typeBadge: 'DB Migration', icon: <Layers size={13} /> },
  'prisma': { category: 'tool', typeBadge: 'ORM Engine', icon: <Layers size={13} /> },
  'stripe': { category: 'tool', typeBadge: 'Payments API', icon: <Layers size={13} /> }
};

const CATALOG_GROUPS = [
  {
    title: 'Services & Frameworks',
    items: ['fastapi', 'spring-boot', 'express', 'django', 'nestjs', 'flask']
  },
  {
    title: 'Databases & Datastores',
    items: ['postgresql', 'mysql', 'mongodb', 'elasticsearch']
  },
  {
    title: 'Caching, Queues & Events',
    items: ['redis', 'rabbitmq', 'kafka', 'celery', 'bullmq']
  },
  {
    title: 'Infra, DevOps & Tooling',
    items: ['docker', 'prometheus', 'grafana', 'sentry', 'alembic', 'flyway', 'prisma', 'stripe']
  }
];

interface UmlNodeData {
  label: string;
  category: string;
  typeBadge: string;
  icon: React.ReactNode;
}

// UML Class Node Component (Desktop IDE Style)
const UmlNodeComponent = ({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as UmlNodeData;
  return (
    <div
      className={`bg-white border text-slate-800 font-sans text-xs select-none min-w-[180px] shadow-sm transition-all ${
        selected ? 'border-blue-600 ring-2 ring-blue-300' : 'border-slate-400 hover:border-slate-600'
      }`}
    >
      {/* 4 Handles for Easy Manual Connections */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-slate-500 !border-2 !border-white hover:!bg-blue-600 hover:!scale-125"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-slate-500 !border-2 !border-white hover:!bg-blue-600 hover:!scale-125"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-slate-500 !border-2 !border-white hover:!bg-blue-600 hover:!scale-125"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-slate-500 !border-2 !border-white hover:!bg-blue-600 hover:!scale-125"
      />

      {/* UML Class Header */}
      <div className="px-2 py-1 bg-slate-200 border-b border-slate-300 flex items-center justify-between text-[10px] text-slate-600 font-mono">
        <span className="font-semibold">{`<<${nodeData.category}>>`}</span>
        <span className="text-slate-500">{nodeData.icon}</span>
      </div>

      {/* Class Name */}
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-center">
        <span className="font-bold text-[12px] text-slate-800 tracking-wide uppercase">
          {nodeData.label}
        </span>
      </div>

      {/* Class Attributes / Specs */}
      <div className="px-2.5 py-1.5 bg-white text-[10px] text-slate-600 font-mono space-y-0.5">
        <div className="flex items-center gap-1">
          <span className="text-blue-600 font-bold">+</span>
          <span>type: {nodeData.typeBadge}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-green-600 font-bold">+</span>
          <span>status: active</span>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [selectedComponents, setSelectedComponents] = useState<string[]>(['fastapi', 'postgresql']);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [scaffold, setScaffold] = useState<ScaffoldResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'docker' | 'env'>('docker');
  const [copied, setCopied] = useState(false);
  const [isScaffoldOpen, setIsScaffoldOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [savedProjects, setSavedProjects] = useState<ArchitectureProject[]>([]);
  const [projectName, setProjectName] = useState('ProductionArchitecture');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [activeRightTab, setActiveRightTab] = useState<'copilot' | 'catalog'>('copilot');

  const [nodes, setNodes] = useState<Node[]>([]);
  // STRICTLY USER-MANAGED EDGES: Starts empty, no auto-generated connections!
  const [edges, setEdges] = useState<Edge[]>([]);

  const nodeTypes = useMemo(() => ({ uml: UmlNodeComponent }), []);

  // Update nodes positions when components list changes (NO EDGES PREDEFINED)
  const syncGraphNodes = useCallback((components: string[]) => {
    const cols = 3;
    const spacingX = 220;
    const spacingY = 140;
    const startX = 50;
    const startY = 50;

    const newNodes: Node[] = components.map((comp, idx) => {
      const meta = COMPONENT_METADATA[comp] || {
        category: 'component',
        typeBadge: 'Tool',
        icon: <Box size={13} />
      };

      const row = Math.floor(idx / cols);
      const col = idx % cols;

      return {
        id: comp,
        type: 'uml',
        data: {
          label: comp.toUpperCase(),
          category: meta.category,
          typeBadge: meta.typeBadge,
          icon: meta.icon
        },
        position: { x: startX + col * spacingX, y: startY + row * spacingY }
      };
    });

    setNodes(newNodes);

    // Prune only manual edges whose endpoints no longer exist
    setEdges((prevEdges) =>
      prevEdges.filter((e) => components.includes(e.source) && components.includes(e.target))
    );
  }, []);

  const triggerRecommendations = useCallback(async (comps: string[]) => {
    if (comps.length === 0) {
      setRecommendations([]);
      return;
    }
    try {
      const data = await fetchRecommendations(comps, 5);
      setRecommendations(data.recommendations || []);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    }
  }, []);

  useEffect(() => {
    syncGraphNodes(selectedComponents);
    triggerRecommendations(selectedComponents);
  }, [selectedComponents, syncGraphNodes, triggerRecommendations]);

  const addComponent = (comp: string) => {
    if (!selectedComponents.includes(comp)) {
      setSelectedComponents((prev) => [...prev, comp]);
    }
  };

  const removeComponent = (comp: string) => {
    setSelectedComponents((prev) => prev.filter((c) => c !== comp));
  };

  // User manually connects two nodes by dragging handle to handle
  const onConnect: OnConnect = useCallback((connection: Connection) => {
    setEdges((eds) =>
      addEdge(
        {
          ...connection,
          animated: true,
          style: { stroke: '#334155', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#334155' }
        },
        eds
      )
    );
  }, []);

  // Click an edge to delete it directly
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setEdges((eds) => eds.filter((e) => e.id !== edge.id));
  }, []);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const handleGenerateScaffold = async () => {
    try {
      const data = await fetchScaffolding(selectedComponents);
      setScaffold(data);
      setIsScaffoldOpen(true);
    } catch (err) {
      console.error('Failed to generate scaffold:', err);
    }
  };

  const handleSaveProject = async () => {
    try {
      const saved = await saveProject({
        name: projectName || 'ArchitecturePlan',
        description: `UML Architecture composed of: ${selectedComponents.join(', ')}`,
        components: selectedComponents
      });
      setSaveSuccessMsg(`Saved as "${saved.name}" to PostgreSQL`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to save project:', err);
    }
  };

  const handleOpenProjects = async () => {
    try {
      const list = await fetchProjects();
      setSavedProjects(list);
      setIsProjectsOpen(true);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const loadSavedProject = (proj: ArchitectureProject) => {
    setSelectedComponents(proj.components);
    setProjectName(proj.name);
    setEdges([]); // Let user reconnect cleanly
    setIsProjectsOpen(false);
  };

  const handleCopyCode = () => {
    if (!scaffold) return;
    const textToCopy = activeTab === 'docker' ? scaffold.dockerComposeYaml : scaffold.envExample;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#ece9d8] text-slate-800 font-sans text-xs select-none">
      {/* Top Classic Window Title Bar (UML-Class-Editor style) */}
      <div className="h-8 bg-gradient-to-r from-[#0a246a] via-[#3a6ea5] to-[#a6caf0] text-white px-3 flex items-center justify-between shadow-inner">
        <div className="flex items-center gap-2 font-bold tracking-wide text-xs">
          <Layers size={14} className="text-blue-200" />
          <span>StackPilot - Microservice Recommender</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-5 h-4 bg-[#ece9d8] hover:bg-slate-200 text-slate-800 rounded-sm flex items-center justify-center text-[10px] shadow-sm">
            <Minus size={10} />
          </button>
          <button className="w-5 h-4 bg-[#ece9d8] hover:bg-slate-200 text-slate-800 rounded-sm flex items-center justify-center text-[10px] shadow-sm">
            <Square size={8} />
          </button>
          <button className="w-5 h-4 bg-[#d9534f] hover:bg-red-600 text-white rounded-sm flex items-center justify-center text-[10px] shadow-sm">
            <X size={10} />
          </button>
        </div>
      </div>

      {/* Classic Menu & Tool Button Bar */}
      <div className="bg-[#f0f0f0] border-b border-[#a0a0a0] px-3 py-1.5 flex items-center justify-between text-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-600 mr-2">Project:</span>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="px-2 py-0.5 bg-white border border-[#7f9db9] rounded-sm text-xs font-mono w-48 shadow-inner"
          />

          <button
            onClick={handleSaveProject}
            className="px-3 py-1 bg-[#e1e1e1] hover:bg-[#d4d4d4] active:bg-[#c0c0c0] border border-[#707070] rounded-sm text-slate-800 font-medium flex items-center gap-1 shadow-sm"
          >
            <Save size={12} className="text-slate-700" /> Save
          </button>

          <button
            onClick={handleOpenProjects}
            className="px-3 py-1 bg-[#e1e1e1] hover:bg-[#d4d4d4] active:bg-[#c0c0c0] border border-[#707070] rounded-sm text-slate-800 font-medium flex items-center gap-1 shadow-sm"
          >
            <FolderOpen size={12} className="text-slate-700" /> Open...
          </button>

          <button
            onClick={handleGenerateScaffold}
            className="px-3 py-1 bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white border border-[#1e40af] rounded-sm font-semibold flex items-center gap-1 shadow-sm"
          >
            <Download size={12} /> Generate Manifests
          </button>

          <button
            onClick={() => setEdges([])}
            className="px-2.5 py-1 bg-[#e1e1e1] hover:bg-[#d4d4d4] border border-[#707070] rounded-sm text-slate-700 font-medium flex items-center gap-1 shadow-sm"
            title="Clear all drawn connections"
          >
            Reset Connections
          </button>

          <button
            onClick={() => {
              setSelectedComponents([]);
              setEdges([]);
            }}
            className="px-2.5 py-1 bg-[#e1e1e1] hover:bg-[#d4d4d4] border border-[#707070] rounded-sm text-red-700 font-medium flex items-center gap-1 shadow-sm"
          >
            <Trash2 size={12} /> Clear Stack
          </button>
        </div>

        {/* Tip Badge */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-white px-2.5 py-0.5 border border-slate-300 rounded-sm">
          <HelpCircle size={12} className="text-blue-600" />
          <span>Drag dots to connect manually • Click any line to delete it</span>
        </div>
      </div>

      {/* Success Notification Bar */}
      {saveSuccessMsg && (
        <div className="bg-[#d4edda] border-b border-[#c3e6cb] text-[#155724] px-4 py-1 text-xs font-semibold flex items-center justify-between">
          <span>✓ {saveSuccessMsg}</span>
          <span className="text-[10px] text-slate-500 font-mono">PostgreSQL: stackpilot_db</span>
        </div>
      )}

      {/* Main Workspace: 3-Column IDE Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Tree Explorer: Class & Component Hierarchy */}
        <div className="w-56 bg-white border-r border-[#a0a0a0] flex flex-col">
          <div className="bg-[#e4e4e4] px-3 py-1.5 border-b border-[#c0c0c0] font-bold text-slate-700 flex items-center gap-1.5">
            <Folder size={13} className="text-amber-600" />
            <span>Architecture Tree</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] text-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-900">
              <span>[-]</span>
              <span>{projectName}</span>
            </div>

            <div className="pl-4 space-y-1">
              <div className="text-slate-500 font-sans text-[10px] uppercase font-bold tracking-wider pt-1">
                Active Nodes ({selectedComponents.length}):
              </div>

              {selectedComponents.map((comp) => (
                <div
                  key={comp}
                  className="pl-2 flex items-center justify-between hover:bg-blue-50 py-0.5 px-1 rounded cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                    <span className="font-semibold text-slate-700">{comp}</span>
                  </div>
                  <span
                    onClick={() => removeComponent(comp)}
                    className="text-red-500 hover:text-red-700 font-bold px-1 group-hover:inline hidden"
                    title="Remove component"
                  >
                    ×
                  </span>
                </div>
              ))}

              <div className="text-slate-500 font-sans text-[10px] uppercase font-bold tracking-wider pt-2">
                Connections ({edges.length}):
              </div>

              {edges.length === 0 ? (
                <div className="pl-2 text-[10px] text-slate-400 italic">No manual links yet</div>
              ) : (
                edges.map((e) => (
                  <div
                    key={e.id}
                    onClick={() => setEdges((eds) => eds.filter((edge) => edge.id !== e.id))}
                    className="pl-2 flex items-center justify-between text-[10px] text-slate-600 hover:bg-red-50 py-0.5 px-1 rounded cursor-pointer"
                    title="Click to remove connection"
                  >
                    <span>
                      {e.source} → {e.target}
                    </span>
                    <span className="text-red-500 font-bold">×</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Center: Clean Blueprint Architecture Canvas */}
        <div className="flex-1 relative bg-[#f8fafc]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeClick={onEdgeClick}
            connectionMode={ConnectionMode.Loose}
            fitView
          >
            <Background color="#cbd5e1" gap={20} size={1} />
            <Controls className="!bg-white !border-[#a0a0a0] !shadow-sm !text-slate-700 fill-slate-700" />
          </ReactFlow>

          {/* Bottom Canvas Overlay Banner */}
          <div className="absolute bottom-2 left-2 bg-white/95 px-3 py-1 border border-slate-300 rounded shadow-sm text-[11px] text-slate-600 flex items-center gap-3">
            <span>
              <strong>Nodes:</strong> {selectedComponents.length}
            </span>
            <span>|</span>
            <span>
              <strong>Manual Connections:</strong> {edges.length}
            </span>
            <span>|</span>
            <span className="text-blue-700 font-medium">Click on any line to delete it</span>
          </div>
        </div>

        {/* Right Properties Panel: Classic UML Editor Tabs */}
        <div className="w-80 bg-[#f0f0f0] border-l border-[#a0a0a0] flex flex-col">
          {/* Classic Tabs (like Class, Attributes, Methods from user screenshot) */}
          <div className="flex border-b border-[#a0a0a0] bg-[#e1e1e1] px-2 pt-1 gap-1">
            <button
              onClick={() => setActiveRightTab('copilot')}
              className={`px-3 py-1 rounded-t border-t border-l border-r font-semibold text-xs ${
                activeRightTab === 'copilot'
                  ? 'bg-[#f0f0f0] border-[#a0a0a0] text-blue-900 border-b-transparent -mb-[1px]'
                  : 'bg-[#d8d8d8] border-[#b0b0b0] text-slate-600 hover:bg-[#e4e4e4]'
              }`}
            >
              Copilot AI
            </button>
            <button
              onClick={() => setActiveRightTab('catalog')}
              className={`px-3 py-1 rounded-t border-t border-l border-r font-semibold text-xs ${
                activeRightTab === 'catalog'
                  ? 'bg-[#f0f0f0] border-[#a0a0a0] text-blue-900 border-b-transparent -mb-[1px]'
                  : 'bg-[#d8d8d8] border-[#b0b0b0] text-slate-600 hover:bg-[#e4e4e4]'
              }`}
            >
              Component Catalog
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {activeRightTab === 'copilot' ? (
              <div className="space-y-3">

                {/* Recommendations List */}
                <fieldset className="border border-[#b0b0b0] bg-white p-2.5 rounded-sm shadow-sm space-y-2">
                  <legend className="px-1 text-[11px] font-bold text-slate-700">
                    Recommended Additions ({recommendations.length})
                  </legend>

                  {recommendations.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 italic text-[11px]">
                      Add components to see live ML suggestions.
                    </div>
                  ) : (
                    recommendations.map((rec) => {
                      const matchPct = Math.round(rec.confidence * 100);
                      return (
                        <div
                          key={rec.component}
                          className="p-2 border border-slate-300 rounded bg-[#fafafa] hover:bg-blue-50/50 hover:border-blue-400 transition"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900 font-mono uppercase text-[11px]">
                              {rec.component}
                            </span>
                            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 border border-blue-300 rounded font-bold text-[10px]">
                              {matchPct}% Match
                            </span>
                          </div>

                          <p className="text-[10px] text-slate-600 leading-normal mb-2">
                            {rec.rationale}
                          </p>

                          <div className="flex items-center justify-between border-t border-slate-200 pt-1 text-[9px]">
                            <span className="text-slate-400 font-mono">
                              {rec.engine_source || rec.engineSource}
                            </span>
                            <button
                              onClick={() => addComponent(rec.component)}
                              className="px-2 py-0.5 bg-[#e1e1e1] hover:bg-[#d4d4d4] active:bg-[#c0c0c0] border border-[#707070] rounded-sm font-semibold text-slate-800 text-[10px] shadow-sm"
                            >
                              + Add Node
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </fieldset>
              </div>
            ) : (
              /* Component Catalog Tab */
              <div className="space-y-3">
                {CATALOG_GROUPS.map((group) => (
                  <fieldset
                    key={group.title}
                    className="border border-[#b0b0b0] bg-white p-2.5 rounded-sm shadow-sm"
                  >
                    <legend className="px-1 text-[11px] font-bold text-slate-700">
                      {group.title}
                    </legend>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {group.items.map((item) => {
                        const isSelected = selectedComponents.includes(item);
                        return (
                          <button
                            key={item}
                            onClick={() =>
                              isSelected ? removeComponent(item) : addComponent(item)
                            }
                            className={`px-2 py-1 text-[11px] rounded-sm border font-medium text-left truncate transition shadow-sm ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-800 font-bold'
                                : 'bg-[#e8e8e8] hover:bg-[#dedede] text-slate-800 border-[#a0a0a0]'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scaffolding Modal (Classic Dialog Box Style) */}
      {isScaffoldOpen && scaffold && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-[#ece9d8] border-2 border-slate-600 rounded-sm w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Title Bar */}
            <div className="h-7 bg-gradient-to-r from-[#0a246a] to-[#3a6ea5] text-white px-3 flex items-center justify-between font-bold text-xs">
              <div className="flex items-center gap-1.5">
                <FileCode size={13} />
                <span>Generated Architecture Manifests (Docker & Environment)</span>
              </div>
              <button
                onClick={() => setIsScaffoldOpen(false)}
                className="w-4 h-4 bg-[#d9534f] hover:bg-red-600 text-white rounded-sm flex items-center justify-center text-[10px]"
              >
                <X size={10} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-[#a0a0a0] bg-[#f0f0f0] px-3 pt-2 justify-between items-center">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('docker')}
                  className={`px-4 py-1 rounded-t border-t border-l border-r font-bold text-xs ${
                    activeTab === 'docker'
                      ? 'bg-white border-[#a0a0a0] text-blue-900 border-b-transparent -mb-[1px]'
                      : 'bg-[#e0e0e0] border-[#b0b0b0] text-slate-600'
                  }`}
                >
                  docker-compose.yml
                </button>
                <button
                  onClick={() => setActiveTab('env')}
                  className={`px-4 py-1 rounded-t border-t border-l border-r font-bold text-xs ${
                    activeTab === 'env'
                      ? 'bg-white border-[#a0a0a0] text-blue-900 border-b-transparent -mb-[1px]'
                      : 'bg-[#e0e0e0] border-[#b0b0b0] text-slate-600'
                  }`}
                >
                  .env.example
                </button>
              </div>

              <button
                onClick={handleCopyCode}
                className="px-3 py-1 bg-[#e1e1e1] hover:bg-[#d4d4d4] border border-[#707070] rounded-sm font-semibold text-slate-800 flex items-center gap-1 text-xs mb-1 shadow-sm"
              >
                {copied ? <Check size={12} className="text-green-700" /> : <Copy size={12} />}
                <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
              </button>
            </div>

            {/* Code Body */}
            <div className="flex-1 overflow-auto p-3 bg-white font-mono text-xs text-slate-900 border border-slate-300 m-2 rounded-sm shadow-inner">
              <pre>{activeTab === 'docker' ? scaffold.dockerComposeYaml : scaffold.envExample}</pre>
            </div>

            {/* Modal Bottom Buttons */}
            <div className="p-2 bg-[#f0f0f0] border-t border-[#c0c0c0] flex justify-end gap-2">
              <button
                onClick={() => setIsScaffoldOpen(false)}
                className="px-4 py-1 bg-[#e1e1e1] hover:bg-[#d4d4d4] border border-[#707070] rounded-sm font-semibold text-slate-800 shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Projects Dialog */}
      {isProjectsOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-[#ece9d8] border-2 border-slate-600 rounded-sm w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[75vh]">
            <div className="h-7 bg-gradient-to-r from-[#0a246a] to-[#3a6ea5] text-white px-3 flex items-center justify-between font-bold text-xs">
              <div className="flex items-center gap-1.5">
                <FolderOpen size={13} />
                <span>Open Saved Architecture (PostgreSQL Repository)</span>
              </div>
              <button
                onClick={() => setIsProjectsOpen(false)}
                className="w-4 h-4 bg-[#d9534f] hover:bg-red-600 text-white rounded-sm flex items-center justify-center text-[10px]"
              >
                <X size={10} />
              </button>
            </div>

            <div className="p-3 overflow-y-auto space-y-2 flex-1 bg-white m-2 border border-slate-300 rounded-sm">
              {savedProjects.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6 italic">
                  No projects saved in PostgreSQL yet.
                </p>
              ) : (
                savedProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-2 border border-slate-300 bg-[#f9f9f9] hover:bg-blue-50 flex justify-between items-center rounded-sm"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{proj.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {proj.components.join(', ')}
                      </p>
                    </div>
                    <button
                      onClick={() => loadSavedProject(proj)}
                      className="px-3 py-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-sm font-bold text-[11px] shadow-sm"
                    >
                      Load
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-2 bg-[#f0f0f0] border-t border-[#c0c0c0] flex justify-end">
              <button
                onClick={() => setIsProjectsOpen(false)}
                className="px-4 py-1 bg-[#e1e1e1] hover:bg-[#d4d4d4] border border-[#707070] rounded-sm font-semibold text-slate-800 shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
