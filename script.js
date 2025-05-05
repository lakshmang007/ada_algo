// Graph and visualization variables
const canvas = document.getElementById('graph-canvas');
const ctx = canvas.getContext('2d');
let graph = {};
let nodes = [];
let edges = [];
let startNode = null;
let endNode = null;
let currentNode = null;
let visitedNodes = new Set();
let pathNodes = [];
let distances = {};
let previous = {};
let unvisited = new Set();
let animationId = null;
let isPaused = false;
let isRunning = false;
let stepDelay = 500;

// Graph creation variables
let currentMode = 'create'; // 'create' or 'run'
let currentTool = 'add-node'; // 'add-node', 'connect-nodes', 'set-start', 'set-end', 'delete'
let selectedNode = null;
let selectedEdge = null;
let connectingNode = null;
let draggingNode = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let nodeIdCounter = 0;
let edgeWeight = 1;

// DOM elements
// Mode buttons
const createModeBtn = document.getElementById('create-mode-btn');
const runModeBtn = document.getElementById('run-mode-btn');

// Tool buttons
const addNodeBtn = document.getElementById('add-node-btn');
const connectNodesBtn = document.getElementById('connect-nodes-btn');
const setStartBtn = document.getElementById('set-start-btn');
const setEndBtn = document.getElementById('set-end-btn');
const deleteBtn = document.getElementById('delete-btn');
const clearGraphBtn = document.getElementById('clear-graph-btn');
const exampleGraphBtn = document.getElementById('example-graph-btn');
const edgeWeightInput = document.getElementById('edge-weight');

// Tool panels
const createToolsPanel = document.getElementById('create-tools');
const runToolsPanel = document.getElementById('run-tools');

// Run controls
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const speedSlider = document.getElementById('speed');

// Info elements
const currentStepText = document.getElementById('current-step');
const instructionText = document.getElementById('instruction-text');

// Modals
const nodeModal = document.getElementById('node-modal');
const edgeModal = document.getElementById('edge-modal');
const nodeLabelInput = document.getElementById('node-label');
const edgeWeightModalInput = document.getElementById('edge-weight-input');
const saveNodeBtn = document.getElementById('save-node-btn');
const saveEdgeBtn = document.getElementById('save-edge-btn');
const closeModalBtns = document.querySelectorAll('.close-modal');

// Initialize the canvas size
function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

// Create a random graph
function createRandomGraph() {
    const nodeCount = 10;
    const edgeDensity = 0.3; // Probability of edge between nodes

    // Create nodes
    nodes = [];
    for (let i = 0; i < nodeCount; i++) {
        nodes.push({
            id: i,
            x: Math.random() * (canvas.width - 100) + 50,
            y: Math.random() * (canvas.height - 100) + 50,
            label: String.fromCharCode(65 + i) // A, B, C, ...
        });
    }

    // Create edges
    edges = [];
    for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
            if (Math.random() < edgeDensity) {
                const distance = Math.floor(
                    Math.sqrt(
                        Math.pow(nodes[i].x - nodes[j].x, 2) +
                        Math.pow(nodes[i].y - nodes[j].y, 2)
                    ) / 10
                ) + 1;

                edges.push({
                    from: i,
                    to: j,
                    weight: distance
                });
            }
        }
    }

    // Build adjacency list representation
    graph = {};
    for (let i = 0; i < nodeCount; i++) {
        graph[i] = [];
    }

    for (const edge of edges) {
        graph[edge.from].push({ node: edge.to, weight: edge.weight });
        graph[edge.to].push({ node: edge.from, weight: edge.weight }); // Undirected graph
    }

    // Set start and end nodes
    startNode = 0;
    endNode = nodeCount - 1;
}

// Draw the graph
function drawGraph() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw edges
    for (const edge of edges) {
        const fromNode = nodes[edge.from];
        const toNode = nodes[edge.to];

        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw edge weight
        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2;

        ctx.fillStyle = '#333';
        ctx.font = '14px Arial';
        ctx.fillText(edge.weight, midX, midY);
    }

    // Draw nodes
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        ctx.beginPath();
        ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);

        // Set node color based on its state
        if (i === startNode) {
            ctx.fillStyle = '#2ecc71'; // Start node - green
        } else if (i === endNode) {
            ctx.fillStyle = '#e74c3c'; // End node - red
        } else if (i === currentNode) {
            ctx.fillStyle = '#f39c12'; // Current node - orange
        } else if (pathNodes.includes(i)) {
            ctx.fillStyle = '#9b59b6'; // Path node - purple
        } else if (visitedNodes.has(i)) {
            ctx.fillStyle = '#3498db'; // Visited node - blue
        } else {
            ctx.fillStyle = '#ecf0f1'; // Unvisited node - light gray
        }

        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw node label
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.label, node.x, node.y - 5);

        // Draw distance if available
        if (distances[i] !== undefined) {
            const distText = distances[i] === Infinity ? '∞' : distances[i];
            ctx.font = '12px Arial';
            ctx.fillText(distText, node.x, node.y + 10);
        }
    }
}

// Initialize Dijkstra's algorithm
function initDijkstra() {
    visitedNodes.clear();
    pathNodes = [];
    currentNode = null;

    // Initialize distances
    distances = {};
    previous = {};
    unvisited = new Set();

    for (let i = 0; i < nodes.length; i++) {
        distances[i] = Infinity;
        previous[i] = null;
        unvisited.add(i);
    }

    distances[startNode] = 0;
    currentStepText.textContent = "Algorithm initialized. Starting from node " + nodes[startNode].label;
}

// Perform one step of Dijkstra's algorithm
function dijkstraStep() {
    if (unvisited.size === 0) {
        // Algorithm complete
        constructPath();
        return false;
    }

    // Find the unvisited node with the smallest distance
    let minDistance = Infinity;
    let minNode = null;

    for (const node of unvisited) {
        if (distances[node] < minDistance) {
            minDistance = distances[node];
            minNode = node;
        }
    }

    // If we can't reach any more nodes
    if (minDistance === Infinity) {
        currentStepText.textContent = "No path exists to remaining nodes.";
        return false;
    }

    currentNode = minNode;
    unvisited.delete(minNode);
    visitedNodes.add(minNode);

    // If we've reached the end node
    if (minNode === endNode) {
        constructPath();
        currentStepText.textContent = "End node reached! Path found with distance: " + distances[endNode];
        return false;
    }

    // Update distances to neighbors
    for (const neighbor of graph[minNode]) {
        if (!visitedNodes.has(neighbor.node)) {
            const alt = distances[minNode] + neighbor.weight;
            if (alt < distances[neighbor.node]) {
                distances[neighbor.node] = alt;
                previous[neighbor.node] = minNode;
            }
        }
    }

    currentStepText.textContent = "Visiting node " + nodes[minNode].label +
                                 ". Updated distances to neighbors.";

    return true;
}

// Construct the shortest path
function constructPath() {
    pathNodes = [];
    let current = endNode;

    while (current !== null) {
        pathNodes.unshift(current);
        current = previous[current];
    }

    if (pathNodes.length > 0 && pathNodes[0] === startNode) {
        currentStepText.textContent = "Shortest path found! Distance: " +
                                     distances[endNode] + ", Path: " +
                                     pathNodes.map(n => nodes[n].label).join(" → ");
    } else {
        pathNodes = [];
        currentStepText.textContent = "No path exists between start and end nodes.";
    }
}

// Animation loop for Dijkstra's algorithm
function runDijkstra() {
    if (isPaused) return;

    const continueAlgorithm = dijkstraStep();
    drawGraph();

    if (continueAlgorithm) {
        animationId = setTimeout(runDijkstra, stepDelay);
    } else {
        isRunning = false;
        startBtn.textContent = "Restart";
        startBtn.disabled = false;
        pauseBtn.disabled = true;
    }
}

// Event listeners
startBtn.addEventListener('click', () => {
    if (isRunning) {
        // Reset and restart
        resetVisualization();
    }

    isRunning = true;
    isPaused = false;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    pauseBtn.textContent = "Pause";

    initDijkstra();
    runDijkstra();
});

pauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? "Resume" : "Pause";

    if (!isPaused) {
        runDijkstra();
    }
});

resetBtn.addEventListener('click', () => {
    resetVisualization();
});

speedSlider.addEventListener('input', () => {
    stepDelay = 1000 / speedSlider.value;
});

// Reset the visualization
function resetVisualization() {
    if (animationId) {
        clearTimeout(animationId);
        animationId = null;
    }

    isRunning = false;
    isPaused = false;
    startBtn.textContent = "Start";
    startBtn.disabled = false;
    pauseBtn.disabled = true;

    visitedNodes.clear();
    pathNodes = [];
    currentNode = null;
    distances = {};

    currentStepText.textContent = "Algorithm not started";

    drawGraph();
}

// Helper functions for graph creation
function getNodeAt(x, y) {
    const nodeRadius = 20;
    for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        const distance = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
        if (distance <= nodeRadius) {
            return i;
        }
    }
    return null;
}

function getEdgeAt(x, y) {
    const clickThreshold = 10;
    for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const fromNode = nodes[edge.from];
        const toNode = nodes[edge.to];

        // Calculate distance from point to line segment
        const A = x - fromNode.x;
        const B = y - fromNode.y;
        const C = toNode.x - fromNode.x;
        const D = toNode.y - fromNode.y;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = fromNode.x;
            yy = fromNode.y;
        } else if (param > 1) {
            xx = toNode.x;
            yy = toNode.y;
        } else {
            xx = fromNode.x + param * C;
            yy = fromNode.y + param * D;
        }

        const dx = x - xx;
        const dy = y - yy;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if click is close enough to the edge
        if (distance <= clickThreshold) {
            // Also check if click is between the nodes (not past the endpoints)
            const minX = Math.min(fromNode.x, toNode.x) - clickThreshold;
            const maxX = Math.max(fromNode.x, toNode.x) + clickThreshold;
            const minY = Math.min(fromNode.y, toNode.y) - clickThreshold;
            const maxY = Math.max(fromNode.y, toNode.y) + clickThreshold;

            if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                return i;
            }
        }
    }
    return null;
}

function addNode(x, y) {
    const label = String.fromCharCode(65 + nodeIdCounter); // A, B, C, ...
    nodes.push({
        id: nodeIdCounter,
        x: x,
        y: y,
        label: label
    });

    // Update graph structure
    graph[nodeIdCounter] = [];

    // Set as start/end node if none exists
    if (startNode === null) {
        startNode = nodeIdCounter;
    } else if (endNode === null && nodeIdCounter !== startNode) {
        endNode = nodeIdCounter;
    }

    nodeIdCounter++;
    drawGraph();
}

function connectNodes(fromNodeIndex, toNodeIndex, weight) {
    // Check if edge already exists
    const edgeExists = edges.some(edge =>
        (edge.from === fromNodeIndex && edge.to === toNodeIndex) ||
        (edge.from === toNodeIndex && edge.to === fromNodeIndex)
    );

    if (!edgeExists && fromNodeIndex !== toNodeIndex) {
        edges.push({
            from: fromNodeIndex,
            to: toNodeIndex,
            weight: weight
        });

        // Update graph adjacency list
        graph[fromNodeIndex].push({ node: toNodeIndex, weight: weight });
        graph[toNodeIndex].push({ node: fromNodeIndex, weight: weight }); // Undirected graph

        drawGraph();
        return true;
    }
    return false;
}

function deleteNode(nodeIndex) {
    if (nodeIndex !== null) {
        // Remove all edges connected to this node
        edges = edges.filter(edge => edge.from !== nodeIndex && edge.to !== nodeIndex);

        // Remove the node
        nodes.splice(nodeIndex, 1);

        // Update graph structure
        delete graph[nodeIndex];
        for (const nodeId in graph) {
            graph[nodeId] = graph[nodeId].filter(neighbor => neighbor.node !== nodeIndex);
        }

        // Update node indices in edges
        edges.forEach(edge => {
            if (edge.from > nodeIndex) edge.from--;
            if (edge.to > nodeIndex) edge.to--;
        });

        // Update start and end nodes
        if (startNode === nodeIndex) {
            startNode = nodes.length > 0 ? 0 : null;
        } else if (startNode > nodeIndex) {
            startNode--;
        }

        if (endNode === nodeIndex) {
            endNode = nodes.length > 1 ? 1 : null;
        } else if (endNode > nodeIndex) {
            endNode--;
        }

        // Rebuild graph adjacency list
        rebuildGraph();

        drawGraph();
    }
}

function deleteEdge(edgeIndex) {
    if (edgeIndex !== null) {
        const edge = edges[edgeIndex];

        // Remove from graph adjacency list
        graph[edge.from] = graph[edge.from].filter(neighbor => neighbor.node !== edge.to);
        graph[edge.to] = graph[edge.to].filter(neighbor => neighbor.node !== edge.from);

        // Remove the edge
        edges.splice(edgeIndex, 1);

        drawGraph();
    }
}

function rebuildGraph() {
    // Rebuild graph from edges
    graph = {};
    for (let i = 0; i < nodes.length; i++) {
        graph[i] = [];
    }

    for (const edge of edges) {
        graph[edge.from].push({ node: edge.to, weight: edge.weight });
        graph[edge.to].push({ node: edge.from, weight: edge.weight });
    }
}

function clearGraph() {
    nodes = [];
    edges = [];
    graph = {};
    startNode = null;
    endNode = null;
    nodeIdCounter = 0;
    selectedNode = null;
    connectingNode = null;

    drawGraph();
    updateInstructions();
}

function updateToolButtonStates() {
    // Remove active class from all tool buttons
    addNodeBtn.classList.remove('active');
    connectNodesBtn.classList.remove('active');
    setStartBtn.classList.remove('active');
    setEndBtn.classList.remove('active');
    deleteBtn.classList.remove('active');

    // Add active class to current tool button
    switch (currentTool) {
        case 'add-node':
            addNodeBtn.classList.add('active');
            break;
        case 'connect-nodes':
            connectNodesBtn.classList.add('active');
            break;
        case 'set-start':
            setStartBtn.classList.add('active');
            break;
        case 'set-end':
            setEndBtn.classList.add('active');
            break;
        case 'delete':
            deleteBtn.classList.add('active');
            break;
    }
}

function updateModeButtonStates() {
    createModeBtn.classList.remove('active');
    runModeBtn.classList.remove('active');

    if (currentMode === 'create') {
        createModeBtn.classList.add('active');
        createToolsPanel.classList.remove('hidden');
        runToolsPanel.classList.add('hidden');
    } else {
        runModeBtn.classList.add('active');
        createToolsPanel.classList.add('hidden');
        runToolsPanel.classList.remove('hidden');
    }
}

function updateInstructions() {
    switch (currentTool) {
        case 'add-node':
            instructionText.textContent = 'Click anywhere to add a node';
            break;
        case 'connect-nodes':
            if (connectingNode === null) {
                instructionText.textContent = 'Select first node to connect';
            } else {
                instructionText.textContent = 'Select second node to connect';
            }
            break;
        case 'set-start':
            instructionText.textContent = 'Click a node to set as start';
            break;
        case 'set-end':
            instructionText.textContent = 'Click a node to set as end';
            break;
        case 'delete':
            instructionText.textContent = 'Click a node or edge to delete';
            break;
    }
}

function showNodeModal(nodeIndex) {
    nodeLabelInput.value = nodes[nodeIndex].label;
    nodeModal.style.display = 'block';
    selectedNode = nodeIndex;
}

function showEdgeModal(edgeIndex) {
    edgeWeightModalInput.value = edges[edgeIndex].weight;
    edgeModal.style.display = 'block';
    selectedEdge = edgeIndex;
}

// Canvas event handlers
canvas.addEventListener('mousedown', (e) => {
    if (currentMode !== 'create') return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const nodeIndex = getNodeAt(x, y);

    if (nodeIndex !== null) {
        // Node clicked
        switch (currentTool) {
            case 'add-node':
                // Double click to edit node
                showNodeModal(nodeIndex);
                break;
            case 'connect-nodes':
                if (connectingNode === null) {
                    connectingNode = nodeIndex;
                    updateInstructions();
                } else {
                    const weight = parseInt(edgeWeightInput.value) || 1;
                    if (connectNodes(connectingNode, nodeIndex, weight)) {
                        connectingNode = null;
                        updateInstructions();
                    } else {
                        // Edge already exists or trying to connect to self
                        connectingNode = null;
                        updateInstructions();
                    }
                }
                break;
            case 'set-start':
                startNode = nodeIndex;
                drawGraph();
                break;
            case 'set-end':
                endNode = nodeIndex;
                drawGraph();
                break;
            case 'delete':
                deleteNode(nodeIndex);
                break;
            default:
                // Start dragging
                draggingNode = nodeIndex;
                dragOffsetX = x - nodes[nodeIndex].x;
                dragOffsetY = y - nodes[nodeIndex].y;
        }
    } else {
        // Check if edge was clicked
        const edgeIndex = getEdgeAt(x, y);

        if (edgeIndex !== null) {
            // Edge clicked
            switch (currentTool) {
                case 'delete':
                    deleteEdge(edgeIndex);
                    break;
                default:
                    // Show edge weight modal
                    showEdgeModal(edgeIndex);
            }
        } else {
            // Empty space clicked
            if (currentTool === 'add-node') {
                addNode(x, y);
            } else if (currentTool === 'connect-nodes') {
                connectingNode = null;
                updateInstructions();
            }
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (draggingNode !== null) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        nodes[draggingNode].x = x - dragOffsetX;
        nodes[draggingNode].y = y - dragOffsetY;

        drawGraph();
    }
});

canvas.addEventListener('mouseup', () => {
    draggingNode = null;
});

canvas.addEventListener('mouseleave', () => {
    draggingNode = null;
});

// Tool button event listeners
addNodeBtn.addEventListener('click', () => {
    currentTool = 'add-node';
    updateToolButtonStates();
    updateInstructions();
});

connectNodesBtn.addEventListener('click', () => {
    currentTool = 'connect-nodes';
    connectingNode = null;
    updateToolButtonStates();
    updateInstructions();
});

setStartBtn.addEventListener('click', () => {
    currentTool = 'set-start';
    updateToolButtonStates();
    updateInstructions();
});

setEndBtn.addEventListener('click', () => {
    currentTool = 'set-end';
    updateToolButtonStates();
    updateInstructions();
});

deleteBtn.addEventListener('click', () => {
    currentTool = 'delete';
    updateToolButtonStates();
    updateInstructions();
});

clearGraphBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the graph?')) {
        clearGraph();
    }
});

exampleGraphBtn.addEventListener('click', () => {
    clearGraph();
    createRandomGraph();
    drawGraph();
});

// Mode button event listeners
createModeBtn.addEventListener('click', () => {
    currentMode = 'create';
    updateModeButtonStates();
    resetVisualization();
});

runModeBtn.addEventListener('click', () => {
    if (nodes.length < 2) {
        alert('Please create at least 2 nodes before running the algorithm.');
        return;
    }

    if (startNode === null || endNode === null) {
        alert('Please set start and end nodes before running the algorithm.');
        return;
    }

    currentMode = 'run';
    updateModeButtonStates();
    resetVisualization();
});

// Modal event listeners
saveNodeBtn.addEventListener('click', () => {
    if (selectedNode !== null) {
        const newLabel = nodeLabelInput.value.trim();
        if (newLabel) {
            nodes[selectedNode].label = newLabel;
            drawGraph();
        }
    }
    nodeModal.style.display = 'none';
});

saveEdgeBtn.addEventListener('click', () => {
    if (selectedEdge !== null) {
        const newWeight = parseInt(edgeWeightModalInput.value);
        if (!isNaN(newWeight) && newWeight > 0) {
            const edge = edges[selectedEdge];
            edge.weight = newWeight;

            // Update graph adjacency list
            for (let i = 0; i < graph[edge.from].length; i++) {
                if (graph[edge.from][i].node === edge.to) {
                    graph[edge.from][i].weight = newWeight;
                    break;
                }
            }

            for (let i = 0; i < graph[edge.to].length; i++) {
                if (graph[edge.to][i].node === edge.from) {
                    graph[edge.to][i].weight = newWeight;
                    break;
                }
            }

            drawGraph();
        }
    }
    edgeModal.style.display = 'none';
});

closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        nodeModal.style.display = 'none';
        edgeModal.style.display = 'none';
    });
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === nodeModal) {
        nodeModal.style.display = 'none';
    }
    if (e.target === edgeModal) {
        edgeModal.style.display = 'none';
    }
});

// Edge weight input event listener
edgeWeightInput.addEventListener('input', () => {
    edgeWeight = parseInt(edgeWeightInput.value) || 1;
});

// Initialize the visualization
function initVisualization() {
    resizeCanvas();
    updateToolButtonStates();
    updateModeButtonStates();
    updateInstructions();
    drawGraph();
}

// Handle window resize
window.addEventListener('resize', () => {
    resizeCanvas();
    drawGraph();
});

// Start the visualization when the page loads
window.addEventListener('load', initVisualization);
