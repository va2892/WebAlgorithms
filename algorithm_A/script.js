var startCell = null;
var endCell = null;
var grid = [];

class Node {
    constructor(x, y, cost = Infinity, previous = null) {
        this.x = parseInt(x);
        this.y = parseInt(y);
        this.cost = cost;
        this.previous = previous;
    }
}

function generateGrid() {

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
            cell.dataset.row = x;
            cell.dataset.col = y;
            container.appendChild(cell);
            cell.addEventListener("click", () => selectCell(cell));

            grid[x][y] = cell;

            if (Math.random() < 0.2) {
                cell.classList.add("wall");
                cell.style.backgroundColor = "black";
            }
        }
    }

    resetPath();
}


function selectCell(cell) {

    if (startCell && endCell) {
        startCell.style.backgroundColor = "white";
        endCell.style.backgroundColor = "white";
        startCell = null;
        endCell = null;
    }

    if (!startCell) {
        startCell = cell;
        cell.style.backgroundColor = "lightgreen";
    } else if (!endCell && cell !== startCell) {
        endCell = cell;
        cell.style.backgroundColor = "lightgreen";
    }
}

function resetPath() {
    let size = parseInt(document.getElementById("input-size").value);
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            if (grid[x][y].style.backgroundColor === "green") {
                grid[x][y].style.backgroundColor = ""
            }
        }
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

function getAdjacentNodes(node, grid, size) {
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
                adjacentNodes.push(new Node(adjacentCell.dataset.row, adjacentCell.dataset.col));
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

function findPath(startNode, goalNode, grid, size) {
    let reachable = [startNode];
    let explored = [];
    startNode.cost = 0;

    while (reachable.length > 0) {
        let node = chooseNode(reachable, goalNode);

        if (node.x === goalNode.x && node.y === goalNode.y) {
            return buildPath(node);
        }

        reachable = reachable.filter((n) => n.x !== node.x || n.y !== node.y);
        explored.push(node);

        let newReachable = [];

        for (let adj of getAdjacentNodes(node, grid, size)) {
            let isInExplored = false;
            for (let e of explored) {
                if (e.x === adj.x && e.y === adj.y) {
                    isInExplored = true;
                    break;
                }
            }

            let isInReachable = false;
            for (let r of reachable) {
                if (r.x === adj.x && r.y === adj.y) {
                    isInReachable = true;
                    break;
                }
            }

            if (!isInExplored && !isInReachable) {
                newReachable.push(adj);
            }
        }

        for (let adjacent of newReachable) {
            let newCost = node.cost + 1;
            if (newCost < adjacent.cost) {
                adjacent.previous = node;
                adjacent.cost = newCost;
                reachable.push(adjacent);
            }
        }
    }

    return null;
}

function runAStar() {

    if (!startCell || !endCell) {
        alert("Please select both start and end points");
        return;
    }

    let size = parseInt(document.getElementById("input-size").value);
    let start = new Node(startCell.dataset.row, startCell.dataset.col);
    let end = new Node(endCell.dataset.row, endCell.dataset.col);
    let path = findPath(start, end, grid, size);

    if (path) {
        let delay = 100;
        for (let [step, [x, y]] of path.entries()) {
            setTimeout(() => {
                let cell = grid[x][y];
                if (cell && !cell.classList.contains("wall")) {
                    cell.style.backgroundColor = "green"; 
                }
            }, delay * step);
        }
    } else {
        alert("Путь не найден");
    }
}
