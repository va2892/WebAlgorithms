const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const answerInputLength = document.getElementById('bestPathLength');
const answerInputWay = document.getElementById('cityCount');
const currentIterationElement = document.getElementById('currentIteration');

canvas.width = 800;
canvas.height = 500;

let points = [];
let currentPopulation = [];
let globalBestSolution = null;
let globalPressing = false;

let POPULATION_SIZE = 1000;
let PERCENTAGE_MUTATION = 0.5;
let COUNT_GENERATIONS = 100;

const populationSizeInput = document.getElementById('populationSize');
const percentageMutationInput = document.getElementById('percentageMutation');
const countGenerationsInput = document.getElementById('countGenerations');
const MAX_UNCHANGED_ITERATIONS = 1;

function addPoint(x, y) {
    globalBestSolution = null;
    points.push({x, y});
    drawPoints();
    updateCityCount();
    answerInputLength.textContent = "Лучший путь: не найден";
}

function resizeCanvas() {
    const container = canvas.parentElement;
    const displayWidth = Math.min(container.clientWidth, 1000);
    const displayHeight = displayWidth * 0.625;
    
    if (displayWidth !== canvas.width || displayHeight !== canvas.height) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        drawPoints();
        if (globalBestSolution) drawWay(globalBestSolution.way);
    }
}

function getCanvasPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: ((event.clientX - rect.left) / rect.width) * canvas.width,
        y: ((event.clientY - rect.top) / rect.height) * canvas.height
    };
}

function validatePoints() {
    if (points.length < 3) {
        alert("Добавьте хотя бы 3 города для построения маршрута");
        return false;
    }
    return true;
}

function updateAlgorithmParameters() {
    POPULATION_SIZE = parseInt(populationSizeInput.value) || 1000;
    PERCENTAGE_MUTATION = parseFloat(percentageMutationInput.value) || 0.5;
    COUNT_GENERATIONS = parseInt(countGenerationsInput.value) || 100;
}

function generateStartPopulation() {
    currentPopulation = [];
    const basis = Array.from({length: points.length}, (_, i) => i);
    
    currentPopulation.push({
        wayLength: getWayLength(basis),
        way: basis
    });

    for (let i = 0; i < POPULATION_SIZE - 1; i++) {
        const individ = [...basis];
        shuffleArray(individ);
        currentPopulation.push({
            wayLength: getWayLength(individ),
            way: individ
        });
    }
}

function getWayLength(path) {
    if (path.length < 2) return 0;
    
    let length = 0;
    for (let i = 0; i < path.length - 1; i++) {
        length += distance(points[path[i]], points[path[i+1]]);
    }
    return length + distance(points[path[path.length-1]], points[path[0]]);
}

function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function reproduce() {
    const [parent1, parent2] = selectTwoDifferentParents();
    const [child1, child2] = crossover(parent1.way, parent2.way);
    
    currentPopulation.push(
        {wayLength: getWayLength(mutation(child1)), way: mutation(child1)},
        {wayLength: getWayLength(mutation(child2)), way: mutation(child2)}
    );
    
    currentPopulation.sort((a, b) => a.wayLength - b.wayLength);
    currentPopulation = currentPopulation.slice(0, POPULATION_SIZE);
}

function selectTwoDifferentParents() {
    const index1 = Math.floor(Math.random() * currentPopulation.length);
    let index2;
    do { index2 = Math.floor(Math.random() * currentPopulation.length); } 
    while (index2 === index1);
    return [currentPopulation[index1], currentPopulation[index2]];
}

function crossover(p1, p2) {
    const breakPoint = 1 + Math.floor(Math.random() * (p1.length - 1));
    const child1 = p1.slice(0, breakPoint).concat(p2.filter(g => !p1.slice(0, breakPoint).includes(g)));
    const child2 = p2.slice(0, breakPoint).concat(p1.filter(g => !p2.slice(0, breakPoint).includes(g)));
    return [child1, child2];
}

function mutation(individ) {
    if (Math.random() * 100 < PERCENTAGE_MUTATION) {
        const a = 1 + Math.floor(Math.random() * (individ.length - 1));
        let b;
        do { b = 1 + Math.floor(Math.random() * (individ.length - 1)); } 
        while (b === a);
        [individ[a], individ[b]] = [individ[b], individ[a]];
    }
    return individ;
}

async function findBestWay() {
    if (!validatePoints()) return;
    
    updateAlgorithmParameters();
    globalPressing = true;
    const initialPointsCount = points.length;
    let unchangedIterations = 0;
    let currentBest = null;
    
    currentIterationElement.textContent = `Итерация: 0/${COUNT_GENERATIONS}`;
    
    while (unchangedIterations < MAX_UNCHANGED_ITERATIONS) {
        generateStartPopulation();
        
        for (let i = 0; i < COUNT_GENERATIONS; i++) {
            if (points.length !== initialPointsCount) {
                globalPressing = false;
                return;
            }
            
            reproduce();
            currentIterationElement.textContent = `Итерация: ${i+1}/${COUNT_GENERATIONS}`;

            if (i % 10 === 0) {
                const candidate = currentPopulation[0];
                if (!globalBestSolution || candidate.wayLength < globalBestSolution.wayLength) {
                    globalBestSolution = {...candidate};
                    currentBest = {...candidate};
                    updateBestSolution();
                    unchangedIterations = 0;
                }
            }
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        unchangedIterations++;
    }
    
    globalPressing = false;
}

function updateBestSolution() {
    answerInputLength.textContent = "Лучший путь: " + Math.round(globalBestSolution.wayLength);
    updateCityCount();
    drawPoints();
    drawWay(globalBestSolution.way);
}

function updateCityCount() {
    answerInputWay.textContent = `Особей: ${points.length}`;
}

function drawWay(way) {
    if (!way.length) return;

    ctx.beginPath();
    ctx.moveTo(points[way[0]].x, points[way[0]].y);
    for (let i = 1; i < way.length; i++) {
        ctx.lineTo(points[way[i]].x, points[way[i]].y);
    }
    ctx.lineTo(points[way[0]].x, points[way[0]].y);
    
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.fillStyle = 'green';
    ctx.beginPath();
    ctx.arc(points[way[0]].x, points[way[0]].y, 10, 0, Math.PI * 2);
    ctx.fill();
}

function drawPoints() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    points.forEach(p => {
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

canvas.addEventListener('click', e => {
    if (!globalPressing) addPoint(...Object.values(getCanvasPosition(e)));
});

document.getElementById('run').addEventListener('click', () => {
    if (!globalPressing) findBestWay();
});

document.getElementById('clear').addEventListener('click', () => {
    if (!globalPressing) {
        points = [];
        currentPopulation = [];
        globalBestSolution = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        answerInputLength.textContent = "Лучший путь: не найден";
        answerInputWay.textContent = "Особей: 0";
        currentIterationElement.textContent = "Итерация: 0/0";
    }
});

document.getElementById('random').addEventListener('click', () => {
    if (!globalPressing) {
        points = Array.from({length: 10}, () => ({
            x: 50 + Math.random() * (canvas.width - 100),
            y: 50 + Math.random() * (canvas.height - 100)
        }));
        globalBestSolution = null;
        drawPoints();
        updateCityCount();
        answerInputLength.textContent = "Лучший путь: не найден";
    }
});

window.addEventListener('load', resizeCanvas);
window.addEventListener('resize', resizeCanvas);