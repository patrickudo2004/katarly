import React, { useMemo } from 'react';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Panel,
  useNodesState,
  useEdgesState,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Search, Filter, Download, Maximize2, Users, Building2, MapPin, Shield, User } from 'lucide-react';
import styles from './NetworkPage.module.css';

import { ChurchNode, DeptNode, SubunitNode, VolunteerNode } from '../components/NetworkNodes';

const nodeTypes = {
  church: ChurchNode,
  dept: DeptNode,
  subunit: SubunitNode,
  volunteer: VolunteerNode,
};

export const NetworkPage: React.FC = () => {
  const church = useQuery(api.churches.getMyChurch);
  const organogram = useQuery(api.churches.getOrganogram);
  const todayServices = useQuery(api.attendance.getTodayServices, 
    church?._id ? { churchId: church._id } : "skip"
  );
  
  // Get live attendance for all subunits if a service is active
  const activeServiceId = todayServices?.[0]?._id;
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [collapsedNodes, setCollapsedNodes] = React.useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = React.useState<'map' | 'list'>('map');

  const toggleCollapse = (nodeId: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const exportToCSV = () => {
    if (!organogram) return;
    let rows = [["Department", "Subunit", "Name", "Role"]];
    
    organogram.children.forEach((dept: any) => {
      dept.children.forEach((sub: any) => {
        sub.children.forEach((vol: any) => {
          rows.push([dept.name, sub.name, vol.name, vol.role]);
        });
        if (sub.children.length === 0) rows.push([dept.name, sub.name, "N/A", "N/A"]);
      });
      if (dept.children.length === 0) rows.push([dept.name, "N/A", "N/A", "N/A"]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${church?.name || 'church'}_structure.csv`);
    document.body.appendChild(link);
    link.click();
  };

  React.useEffect(() => {
    if (!organogram) return;

    const newNodes: any[] = [];
    const newEdges: any[] = [];
    
    const LEVEL_HEIGHT = 200;
    const NODE_WIDTH = 260;

    const traverse = (item: any, level: number, xOffset: number, parentId?: string) => {
      const nodeId = item.id;
      const isCollapsed = collapsedNodes.has(nodeId);
      
      let type = 'volunteer';
      if (level === 0) type = 'church';
      else if (level === 1) type = 'dept';
      else if (level === 2) type = 'subunit';

      // Readiness logic (Mock/Live placeholder)
      let readiness = 'neutral';
      if (type === 'subunit') {
        const count = item.children?.length || 0;
        if (count > 5) readiness = 'optimal';
        else if (count > 0) readiness = 'warning';
        else readiness = 'critical';
      }

      newNodes.push({
        id: nodeId,
        type,
        data: { 
          label: item.name,
          memberCount: item.children?.length || 0,
          isCollapsed,
          hasChildren: item.children && item.children.length > 0,
          readiness
        },
        position: { x: xOffset, y: level * LEVEL_HEIGHT },
      });

      if (parentId) {
        newEdges.push({
          id: `e-${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId,
          animated: level < 3,
          style: { stroke: 'var(--border-color)', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1' },
        });
      }

      if (item.children && !isCollapsed) {
        const totalWidth = item.children.length * NODE_WIDTH;
        let currentX = xOffset - totalWidth / 2 + NODE_WIDTH / 2;
        
        item.children.forEach((child: any) => {
          traverse(child, level + 1, currentX, nodeId);
          currentX += NODE_WIDTH;
        });
      }
    };

    traverse(organogram, 0, 800);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [organogram, collapsedNodes, setNodes, setEdges]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.iconBox}>
            <Users size={24} />
          </div>
          <div>
            <h1>The Network</h1>
            <p>Interactive mapping of {church?.name}'s structure</p>
          </div>
        </div>
        
        <div className={styles.actions}>
          <div className={styles.viewToggle}>
            <button 
              className={viewMode === 'map' ? styles.activeToggle : ''} 
              onClick={() => setViewMode('map')}
            >
              Map View
            </button>
            <button 
              className={viewMode === 'list' ? styles.activeToggle : ''} 
              onClick={() => setViewMode('list')}
            >
              Directory
            </button>
          </div>
          <button className={styles.exportBtn} onClick={exportToCSV}>
            <Download size={18} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        {viewMode === 'map' ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, node) => {
              if (node.data.hasChildren) toggleCollapse(node.id);
            }}
            nodeTypes={nodeTypes}
            fitView
            className={styles.flow}
          >
            <Background color="var(--border-color)" gap={20} />
            <Controls />
            <Panel position="top-right" className={styles.legend}>
              <div className={styles.legendItem}>
                <span className={styles.dot} style={{ background: '#10b981' }} />
                <span>Optimal (Full Team)</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.dot} style={{ background: '#f59e0b' }} />
                <span>Warning (Short Staffed)</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.dot} style={{ background: '#ef4444' }} />
                <span>Critical (Missing)</span>
              </div>
            </Panel>
          </ReactFlow>
        ) : (
          <div className={styles.directoryView}>
            {organogram?.children.map((dept: any) => (
              <div key={dept.id} className={styles.deptGroup}>
                <div className={styles.deptHeader}>
                  <Shield size={18} />
                  <h3>{dept.name}</h3>
                </div>
                <div className={styles.subunitsList}>
                  {dept.children.map((sub: any) => (
                    <details key={sub.id} className={styles.subunitDetail}>
                      <summary>
                        <MapPin size={16} />
                        <span>{sub.name}</span>
                        <span className={styles.countBadge}>{sub.children.length} members</span>
                      </summary>
                      <ul className={styles.memberList}>
                        {sub.children.map((vol: any) => (
                          <li key={vol.id}>
                            <User size={14} />
                            <span>{vol.name}</span>
                            <small>{vol.role}</small>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
