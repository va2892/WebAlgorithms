var startCell = null;
var endCell = null;
var grid = [];

class Node {
    constructor(x, y) {
        this.x = parseInt(x);
        this.y = parseInt(y);
        this.cost = Infinity;
        this.previous = null;
    }
}

let isDrowingNow = false;

function generateGrid() {

    if (isDrowingNow) {
        alert("The path is building now, please wait");
        return;
    }

    startCell = null;
    endCell = null;

    let size = parseInt(document.getElementById("input-size").value);

    if (size <= 0) {
        alert("Please enter a positive number");
        return;
    }

    document.documentElement.style.setProperty("--size", size);
    let container = document.getElementById("grid");
    container.innerHTML = "";

    for (let x = 0; x < size; x++) {
        grid[x] = [];
        for (let y = 0; y < size; y++) {
            let cell = document.createElement("div");
            cell.classList.add("grid-cell");
            if (size % 2 == 0 && (x === size - 1 || y === size - 1)) {
                if (Math.random() < 0.5) {
                    cell.classList.add("wall");
                    cell.style.backgroundColor = "black";
                }
            }
            else {
                cell.classList.add("wall");
                cell.style.backgroundColor = "black";
            }
            cell.dataset.row = x;
            cell.dataset.col = y;
            container.appendChild(cell);
            cell.addEventListener("click", () => selectCell(cell));
            grid[x][y] = cell;
        }
    }

    generateMaze(size);

    resetPath();
}

function addWalls(x, y, walls, size, inMaze) {
    let directions = [
        [0, 2],
        [2, 0],
        [0, -2],
        [-2, 0],
    ];
    for (let [dx, dy] of directions) {
        let newx = x + dx;
        let newy = y + dy;
        if (newx >= 0 && newx < size && newy >= 0 && newy < size && !inMaze[newx][newy]) {
            walls.push({ x: newx, y: newy, px: x, py: y });
        }
    }
}

function generateMaze(size) {
    const inMaze = Array.from({ length: size }, () =>
        Array(size).fill(false)
    );

    let walls = [];
    
    let x = Math.floor(Math.random() * (size / 2)) * 2;
    let y = Math.floor(Math.random() * (size / 2)) * 2;

    inMaze[x][y] = true;
    grid[x][y].classList.remove("wall");
    grid[x][y].style.backgroundColor = "white";

    addWalls(x, y, walls, size, inMaze);

    while (walls.length > 0) {
        let index = Math.floor(Math.random() * walls.length);
        let { x, y, px, py } = walls.splice(index, 1)[0];

        if (!inMaze[x][y]) {
            let wallX = (x + px) / 2;
            let wallY = (y + py) / 2;

            inMaze[x][y] = true;
            grid[x][y].classList.remove("wall");
            grid[x][y].style.backgroundColor = "white";

            grid[wallX][wallY].classList.remove("wall");
            grid[wallX][wallY].style.backgroundColor = "white";

            addWalls(x, y, walls, size, inMaze);
        }
    }
}

let clickTimeout = null;
let lastClicked = null;

function selectCell(cell) {
    if (lastClicked !== cell && clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
    }
    
    if (clickTimeout && lastClicked === cell) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
        handleDoubleClick(cell);
        return;
    }
    
    lastClicked = cell;
    
    clickTimeout = setTimeout(() => {
        clickTimeout = null;
        handleSingleClick(cell);
    }, 300);
}

function handleSingleClick(cell) {
    resetPath();
    if (cell == startCell)
        startCell = null;
    if (cell == endCell)
        endCell = null;
    if (cell.classList.contains("wall")) {
        cell.classList.remove("wall");
        cell.style.backgroundColor = "white";
    } else {
        cell.classList.add("wall");
        cell.style.backgroundColor = "black";
    }
}

function handleDoubleClick(cell) {
    if (startCell && endCell) {
        startCell.style.backgroundColor = "white";
        endCell.style.backgroundColor = "white";
        startCell = null;
        endCell = null;
        resetPath();
    }

    if (!startCell) {
        startCell = cell;
        if (cell.classList.contains("wall")) {
            cell.classList.remove("wall");
        }
        cell.style.backgroundColor = "lightgreen";
    } else if (!endCell && cell !== startCell) {
        endCell = cell;
        if (cell.classList.contains("wall")) {
            cell.classList.remove("wall");
        }
        cell.style.backgroundColor = "lightgreen";
    }
}

function resetPath() {
    let size = parseInt(document.getElementById("input-size").value);
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            if (grid[x][y].style.backgroundColor !== "black" && 
                grid[x][y].style.backgroundColor !== "lightgreen"
            ) {
                grid[x][y].style.backgroundColor = "white"
            }
        }
    }

    if (startCell && endCell) {
        grid[startCell.dataset.row][startCell.dataset.col].style.backgroundColor = "lightgreen";
        grid[endCell.dataset.row][endCell.dataset.col].style.backgroundColor = "lightgreen";
    }
}

function buildPath(node) {
    let path = [];
    while (node !== null) {
        path.push([node.x, node.y]);
        node = node.previous;
    }
    return path.reverse();
}

function getAdjacentNodes(node, grid, size, nodes) {
    let directions = [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
    ];
    let adjacentNodes = [];

    for (let [dx, dy] of directions) {
        let newX = node.x + dx;
        let newY = node.y + dy;

        if (newX >= 0 && newX < size && newY >= 0 && newY < size) {
            let adjacentCell = grid[newX][newY];
            if (!adjacentCell.classList.contains("wall")) {
                adjacentNodes.push(nodes[newX][newY]);
            }
        }
    }

    return adjacentNodes;
}

function estimateDistance(node, goal) {
    return Math.abs(node.x - goal.x) + Math.abs(node.y - goal.y);
}

function chooseNode(reachable, goalNode) {
    let minCost = Infinity;
    let bestNode = null;

    for (let node of reachable) {
        let totalCost = node.cost + estimateDistance(node, goalNode);
        if (totalCost < minCost) {
            minCost = totalCost;
            bestNode = node;
        }
    }
    return bestNode;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function findPath(startNode, goalNode, grid, size) {

    let nodes = [];
    for (let x = 0; x < size; x++) {
        nodes[x] = [];
        for (let y = 0; y < size; y++) {
            nodes[x][y] = new Node(x, y);
        }
    }

    let start = nodes[startNode.x][startNode.y];
    let goal = nodes[goalNode.x][goalNode.y];
    start.cost = 0;

    let reachable = [start];
    let explored = [];

    while (reachable.length > 0) {
        let node = chooseNode(reachable, goalNode);
        await sleep(30);

        if (node === goal) {
            path = buildPath(node);
            for (let [x, y] of path) {
                grid[x][y].style.backgroundColor = "green";
                await sleep(30);
            }
            return path;
        }

        reachable = reachable.filter((n) => n.x !== node.x || n.y !== node.y);
        explored.push(node);

        if (!(node.x === start.x && node.y === start.y)) {
            grid[node.x][node.y].style.backgroundColor = "lightgray";
        }
    

        for (let adj of getAdjacentNodes(node, grid, size, nodes)) {
            let alreadyExplored = explored.some(e => e.x === adj.x && e.y === adj.y);
            let alreadyReachable = reachable.some(r => r.x === adj.x && r.y === adj.y);

            if (!alreadyExplored) {
                let newCost = node.cost + 1;
                if (newCost < adj.cost) {
                    adj.cost = newCost;
                    adj.previous = node;

                    if (!alreadyReachable) {
                        if (!(adj.x === goal.x && adj.y === goal.y)) {
                            grid[adj.x][adj.y].style.backgroundColor = "lightblue";
                        }
                        reachable.push(adj); 
                    }
                }
            }
        }
    }

    return null;
}

async function runAStar() {

    if (!startCell || !endCell) {
        alert("Please select both start and end points");
        return;
    }

    if (isDrowingNow) {
        alert("Path building in progress, please wait");
        return;
    }

    resetPath();
    let size = parseInt(document.getElementById("input-size").value);
    let start = new Node(startCell.dataset.row, startCell.dataset.col);
    let end = new Node(endCell.dataset.row, endCell.dataset.col);

    isDrowingNow = true;

    let path = await findPath(start, end, grid, size);

    isDrowingNow = false;

    if (path == null) {
        alert("The path is not found");
    }
}
