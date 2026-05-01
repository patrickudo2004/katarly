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
import { Search, Filter, Download, Maximize2, Users, Building2, MapPin } from 'lucide-react';
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

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  React.useEffect(() => {
    if (!organogram) return;

    const newNodes: any[] = [];
    const newEdges: any[] = [];
    
    // Vertical Spacing
    const LEVEL_HEIGHT = 180;
    const NODE_WIDTH = 250;

    // Helper to traverse and build
    const traverse = (item: any, level: number, xOffset: number, parentId?: string) => {
      const nodeId = item.id;
      
      // Determine Type
      let type = 'volunteer';
      if (level === 0) type = 'church';
      else if (level === 1) type = 'dept';
      else if (level === 2) type = 'subunit';

      // Create Node
      newNodes.push({
        id: nodeId,
        type,
        data: { 
          label: item.name,
          memberCount: item.children?.length || 0,
        },
        position: { x: xOffset, y: level * LEVEL_HEIGHT },
      });

      // Create Edge
      if (parentId) {
        newEdges.push({
          id: `e-${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId,
          animated: level < 3,
          style: { stroke: '#cbd5e1', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1' },
        });
      }

      // Children
      if (item.children) {
        const totalWidth = item.children.length * NODE_WIDTH;
        let currentX = xOffset - totalWidth / 2 + NODE_WIDTH / 2;
        
        item.children.forEach((child: any) => {
          traverse(child, level + 1, currentX, nodeId);
          currentX += NODE_WIDTH;
        });
      }
    };

    traverse(organogram, 0, 400);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [organogram, setNodes, setEdges]);

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
          <div className={styles.searchBar}>
            <Search size={18} />
            <input placeholder="Search departments, subunits..." />
          </div>
          <button className={styles.exportBtn}>
            <Download size={18} />
            <span>Export Map</span>
          </button>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          className={styles.flow}
        >
          <Background color="#f1f5f9" gap={20} />
          <Controls />
          <Panel position="top-right" className={styles.legend}>
            <div className={styles.legendItem}>
              <span className={styles.dot} style={{ background: '#8b5cf6' }} />
              <span>Church</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.dot} style={{ background: '#10b981' }} />
              <span>Department</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.dot} style={{ background: '#3b82f6' }} />
              <span>Subunit</span>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
};
