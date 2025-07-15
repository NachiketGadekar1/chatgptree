// ============================================================================
// TREE DATA MANAGEMENT
// ============================================================================

/**
 * Finds a node by its messageId and returns the node data along with the
 * full path of messageIds from the root to the target. Uses Depth-First Search.
 * @param {object} treeDataObject - The live treeData object.
 * @param {string} targetMessageId - The messageId of the node to find.
 * @returns {{node: object, path: string}|null} The found node and path, or null.
 */
function findNodeAndPathDfs(treeDataObject, targetMessageId) {
  if (!treeDataObject || !treeDataObject.nodes) return null;
  const nodesMap = treeDataObject.nodes;
  const findPath = (currentId) => {
    const currentNode = nodesMap.get(currentId);
    if (!currentNode) return null;
    if (currentNode.messageId === targetMessageId) return [currentNode.messageId];
    for (const childId of currentNode.children) {
      const subPath = findPath(childId);
      if (subPath) return [currentNode.messageId, ...subPath];
    }
    return null;
  };
  const rootIds = [...nodesMap.values()].filter(n => n.parentId === null).map(n => n.messageId);
  for (const rootId of rootIds) {
    const pathArray = findPath(rootId);
    if (pathArray) {
      return { node: nodesMap.get(targetMessageId), path: pathArray.join('->') };
    }
  }
  return null;
}

/**
 * Updates the in-memory treeData object based on the prompts found in the DOM.
 */
function updateTreeData(prompts) {
  prompts.forEach((prompt, i) => {
    const messageId = prompt.dataset.messageId;
    if (!treeData.nodes.has(messageId)) {
      //Get the full, untruncated text content for data storage.
      // The most reliable element containing the text is often a div with specific child structure.
      const textContent = prompt.querySelector('div.text-token-text-primary')?.textContent || 
                          prompt.textContent || 
                          '';

      const node = {
        messageId,
        text: textContent.trim(), // Store the full, clean text.
        parentId: null,
        children: [],
        x: 0,
        y: 0
      };

      if (treeData.branchStartId) {
        node.parentId = treeData.branchStartId;
        const parentNode = treeData.nodes.get(treeData.branchStartId);
        if (parentNode) parentNode.children.push(messageId);
        treeData.branchStartId = null;
      } else if (i > 0) {
        const parentId = prompts[i - 1].dataset.messageId;
        node.parentId = parentId;
        const parentNode = treeData.nodes.get(parentId);
        if (parentNode) parentNode.children.push(messageId);
      }
      treeData.nodes.set(messageId, node);
    }
  });
}
// ============================================================================
// SVG TREE VISUALIZATION
// ============================================================================

/**
 * Calculates and sets the x/y positions for all nodes in the tree.
 */
function calculateNodePositions() {
    const LEVEL_HEIGHT = 160, NODE_WIDTH = 200, SIBLING_GAP = 50;
    const START_Y = 150, START_X = 2000;
    const rootNodeId = [...treeData.nodes.values()].find(n => n.parentId === null)?.messageId;
    if (!rootNodeId) return;

    function calculateSubtreeWidths(nodeId) {
      const node = treeData.nodes.get(nodeId);
      if (!node) return;
      if (node.children.length === 0) {
        node.subtreeWidth = NODE_WIDTH;
        return;
      }
      node.children.forEach(calculateSubtreeWidths);
      let totalChildrenWidth = node.children.reduce((sum, childId) => sum + treeData.nodes.get(childId).subtreeWidth, 0);
      totalChildrenWidth += (node.children.length - 1) * SIBLING_GAP;
      node.subtreeWidth = Math.max(NODE_WIDTH, totalChildrenWidth);
    }

    function positionNodes(nodeId, x, y) {
        const node = treeData.nodes.get(nodeId);
        if (!node) return;
        node.x = x;
        node.y = y;
        if (node.children.length === 0) return;
        let totalChildrenWidth = node.children.reduce((sum, childId) => sum + treeData.nodes.get(childId).subtreeWidth, 0);
        totalChildrenWidth += (node.children.length - 1) * SIBLING_GAP;
        let currentX = x - totalChildrenWidth / 2;
        const childY = y + LEVEL_HEIGHT;
        node.children.forEach(childId => {
            const childNode = treeData.nodes.get(childId);
            if(childNode) {
                const childX = currentX + childNode.subtreeWidth / 2;
                positionNodes(childId, childX, childY);
                currentX += childNode.subtreeWidth + SIBLING_GAP;
            }
        });
    }
    calculateSubtreeWidths(rootNodeId);
    positionNodes(rootNodeId, START_X, START_Y);
}

/**
 * Creates an SVG group element representing a single node in the tree.
 * @param {object} prompt - The node data object from treeData.
 * @param {number} x - The x-coordinate.
 * @param {number} y - The y-coordinate.
 * @returns {SVGElement} The SVG group element for the node.
 */
function createTreeNode(prompt, x, y) {
    const NODE_WIDTH = 160;
    const NODE_HEIGHT = 60;
    const NODE_RX = 15; // Corner radius

    const node = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    node.classList.add('chatgptree-node');
    node.setAttribute('transform', `translate(${x}, ${y})`);
    node.style.cursor = 'pointer';
    node.onclick = () => handleNodeClick(prompt);

    // Add a <title> element. SVG uses this to create a native browser tooltip on hover.
    const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    tooltip.textContent = prompt.text; // Use the full, non-truncated text for the tooltip
    node.appendChild(tooltip);

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(-NODE_WIDTH / 2));
    rect.setAttribute('y', String(-NODE_HEIGHT / 2));
    rect.setAttribute('width', String(NODE_WIDTH));
    rect.setAttribute('height', String(NODE_HEIGHT));
    rect.setAttribute('rx', String(NODE_RX));
    rect.setAttribute('ry', String(NODE_RX));
    
    // Style to match jump buttons (dark background, green border/text)
    rect.setAttribute('fill', 'rgb(35, 39, 47)');
    rect.setAttribute('stroke', '#6ee7b7');
    rect.setAttribute('stroke-width', '2.5');

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    // Display truncated text on the node itself for visual clarity
    text.textContent = prompt.text.length > 18 ? prompt.text.substring(0, 18) + '...' : prompt.text;
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dy', '0.35em');
    text.setAttribute('fill', '#6ee7b7');
    text.setAttribute('font-size', '14px');
    text.style.pointerEvents = 'none';

    node.appendChild(rect);
    node.appendChild(text);

    return node;
}

/**
 * Creates an SVG path element to connect two nodes.
 * @param {number} x1 - Parent node x-coordinate.
 * @param {number} y1 - Parent node y-coordinate.
 * @param {number} x2 - Child node x-coordinate.
 * @param {number} y2 - Child node y-coordinate.
 * @returns {SVGPathElement} The connecting path element.
 */
function createConnection(x1, y1, x2, y2) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('chatgptree-node-connection');
    const NODE_HALF_HEIGHT = 30; // Matches half the height of the new rectangle node
    const VERTICAL_OFFSET = 50;
    const d = `M ${x1} ${y1 + NODE_HALF_HEIGHT} C ${x1} ${y1 + NODE_HALF_HEIGHT + VERTICAL_OFFSET}, ${x2} ${y2 - NODE_HALF_HEIGHT - VERTICAL_OFFSET}, ${x2} ${y2 - NODE_HALF_HEIGHT}`;
    path.setAttribute('d', d);
    path.setAttribute('stroke', '#a0aec0');
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('fill', 'none');
    return path;
}

/**
 * Main function to render the entire SVG tree visualization.
 */
function updateTreeVisualization() {
    const treeRoot = document.querySelector('.chatgptree-tree');
    if (!treeRoot) return;
    treeRoot.innerHTML = '';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 4000 3000');

    const viewportGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    viewportGroup.classList.add('chatgptree-viewport');

    calculateNodePositions();

    treeData.nodes.forEach(node => {
      if (node.parentId) {
        const parent = treeData.nodes.get(node.parentId);
        if (parent) {
          viewportGroup.appendChild(createConnection(parent.x, parent.y, node.x, node.y));
        }
      }
    });

    treeData.nodes.forEach(node => {
      viewportGroup.appendChild(createTreeNode(node, node.x, node.y));
    });

    svg.appendChild(viewportGroup);
    treeRoot.appendChild(svg);

    const treeContainer = document.querySelector('.chatgptree-tree-container');
    if (treeContainer) {
        initializePanningEvents(treeContainer, viewportGroup);
    }
}

/**
 * Initializes panning and zooming controls for the SVG canvas.
 * @param {HTMLElement} container - The container element for the SVG.
 * @param {SVGElement} viewportGroup - The <g> element to transform.
 */
function initializePanningEvents(container, viewportGroup) {
    function updateTransform() {
      const matrix = `matrix(${viewState.scale}, 0, 0, ${viewState.scale}, ${viewState.x}, ${viewState.y})`;
      viewportGroup.setAttribute('transform', matrix);
    }

    if (!viewState.isInitialized) {
      // Applying your preferred default view state
      viewState.x = -6010.084020079088;
      viewState.y = -237.82964696926035;
      viewState.scale = 4.027897042213525;
      viewState.isInitialized = true;
    }

    updateTransform();

    let isPanning = false;
    let panTicking = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    const panSpeed = 1.8; // Adjust this value to change panning speed

    function startPan(evt) {
      if (evt.button !== 0) return;
      evt.preventDefault();
      container.classList.add('grabbing');
      isPanning = true;
      lastMouseX = evt.clientX;
      lastMouseY = evt.clientY;
      document.addEventListener('mousemove', pan);
      document.addEventListener('mouseup', endPan);
    }

    function pan(evt) {
      if (!isPanning) return;
      evt.preventDefault();
      const deltaX = (evt.clientX - lastMouseX) * panSpeed;
      const deltaY = (evt.clientY - lastMouseY) * panSpeed;
      lastMouseX = evt.clientX;
      lastMouseY = evt.clientY;
      viewState.x += deltaX;
      viewState.y += deltaY;
      if (!panTicking) {
        window.requestAnimationFrame(() => {
          updateTransform();
          panTicking = false;
        });
        panTicking = true;
      }
    }

    function endPan() {
      if (!isPanning) return;
      container.classList.remove('grabbing');
      isPanning = false;
      document.removeEventListener('mousemove', pan);
      document.removeEventListener('mouseup', endPan);
    }

    container.addEventListener('wheel', (evt) => {
      evt.preventDefault();
      const scaleChange = evt.deltaY > 0 ? 0.9 : 1.1;
      const newScale = viewState.scale * scaleChange;
      if (newScale >= 0.1 && newScale <= 10) {
        const rect = container.getBoundingClientRect();
        const mouseX = evt.clientX - rect.left;
        const mouseY = evt.clientY - rect.top;
        const svgX = (mouseX - viewState.x) / viewState.scale;
        const svgY = (mouseY - viewState.y) / viewState.scale;
        viewState.scale = newScale;
        viewState.x = mouseX - (svgX * newScale);
        viewState.y = mouseY - (svgY * newScale);
        updateTransform();
      }
    }, { passive: false });

    container.addEventListener('mousedown', startPan);
}