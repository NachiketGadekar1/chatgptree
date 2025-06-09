import React, { useState, useEffect } from 'react';
import './App.css';

const NODE_RADIUS = 25;
const VERTICAL_SPACING = 120;
const MIN_NODE_SPACING = 150; // Increased minimum spacing

// Calculate the width needed for a subtree
const calculateSubtreeWidth = (node) => {
  if (!node.children || node.children.length === 0) {
    return MIN_NODE_SPACING;
  }
  const childrenWidths = node.children.map(calculateSubtreeWidth);
  const totalWidth = childrenWidths.reduce((sum, width) => sum + width, 0);
  return Math.max(MIN_NODE_SPACING, totalWidth);
};

// Position all nodes in the tree
const positionNodes = (node, x = 0, y = 0) => {
  node.x = x;
  node.y = y;

  if (node.children && node.children.length > 0) {
    const totalWidth = node.children.reduce((sum, child) => sum + calculateSubtreeWidth(child), 0);
    let currentX = x - totalWidth / 2;
    
    node.children.forEach(child => {
      const childWidth = calculateSubtreeWidth(child);
      const childX = currentX + childWidth / 2;
      positionNodes(child, childX, y + VERTICAL_SPACING);
      currentX += childWidth;
    });
  }
  return node;
};

const TreeNode = ({ node, onAdd, onRemove, parentX, parentY }) => {
  return (
    <g>
      {/* Connection line from parent to current node */}
      {parentX !== null && parentY !== null && (
        <path
          d={`M ${parentX} ${parentY + NODE_RADIUS} 
              C ${parentX} ${parentY + VERTICAL_SPACING/2},
                ${node.x} ${node.y - VERTICAL_SPACING/2},
                ${node.x} ${node.y - NODE_RADIUS}`}
          stroke="#666"
          strokeWidth="2"
          fill="none"
        />
      )}
      
      <g className="node" onClick={() => onAdd(node)}>
        {/* Shadow effect */}
        <circle
          cx={node.x}
          cy={node.y}
          r={NODE_RADIUS}
          fill="rgba(0,0,0,0.1)"
          transform="translate(3, 3)"
        />
        
        {/* Main node circle */}
        <circle
          cx={node.x}
          cy={node.y}
          r={NODE_RADIUS}
          fill={`url(#gradient-${node.id})`}
          stroke="#4299e1"
          strokeWidth="2"
          className="node-circle"
        />
        
        {/* Gradient definition */}
        <defs>
          <radialGradient id={`gradient-${node.id}`} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" style={{ stopColor: '#ffffff' }} />
            <stop offset="100%" style={{ stopColor: '#90cdf4' }} />
          </radialGradient>
        </defs>

        {/* Node text */}
        <text
          x={node.x}
          y={node.y}
          textAnchor="middle"
          dy=".3em"
          fill="#2d3748"
          fontSize="14"
          fontWeight="500"
        >
          {node.name}
        </text>
        
        {/* Remove button */}
        {node.name !== 'Root' && (
          <g
            transform={`translate(${node.x + NODE_RADIUS - 10}, ${node.y - NODE_RADIUS + 10})`}
            onClick={(e) => { e.stopPropagation(); onRemove(node); }}
            className="remove-button"
          >
            <circle r="8" fill="#fc8181" />
            <text
              x="0"
              y="0"
              textAnchor="middle"
              dy=".3em"
              fill="white"
              fontSize="12"
            >
              ×
            </text>
          </g>
        )}
      </g>

      {/* Render child nodes */}
      {node.children?.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          onAdd={onAdd}
          onRemove={onRemove}
          parentX={node.x}
          parentY={node.y}
        />
      ))}
    </g>
  );
};

const App = () => {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [tree, setTree] = useState({
    id: 1,
    name: 'Root',
    x: 400,
    y: 50,
    children: []
  });

  useEffect(() => {
    const updateDimensions = () => {
      const width = Math.max(800, window.innerWidth - 40);
      const height = Math.max(600, window.innerHeight - 100);
      setDimensions({ width, height });
      
      // Update tree with new root position and recalculate all positions
      setTree(prevTree => positionNodes({ ...prevTree }, width / 2, 50));
    };

    window.addEventListener('resize', updateDimensions);
    updateDimensions();

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const addNode = (parent) => {
    const newNode = {
      id: Math.random(),
      name: `Node ${Math.floor(Math.random() * 100)}`,
      children: []
    };

    setTree(prevTree => {
      const addChild = (node) => {
        if (node.id === parent.id) {
          return {
            ...node,
            children: [...(node.children || []), newNode]
          };
        }
        return {
          ...node,
          children: (node.children || []).map(addChild)
        };
      };
      // Recalculate positions after adding node
      return positionNodes(addChild(prevTree), dimensions.width / 2, 50);
    });
  };

  const removeNode = (target) => {
    if (target.name === 'Root') return;
    
    setTree(prevTree => {
      const removeChild = (node) => {
        if (node.id === target.id) {
          return null;
        }
        return {
          ...node,
          children: (node.children || [])
            .map(removeChild)
            .filter(Boolean)
        };
      };
      // Recalculate positions after removing node
      return positionNodes(removeChild(prevTree), dimensions.width / 2, 50);
    });
  };

  return (
    <div className="app">
      <h1>Tree Visualization</h1>
      <div className="tree-container">
        <svg 
          width={dimensions.width} 
          height={dimensions.height} 
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        >
          <TreeNode
            node={tree}
            onAdd={addNode}
            onRemove={removeNode}
            parentX={null}
            parentY={null}
          />
        </svg>
      </div>
    </div>
  );
};

export default App;
