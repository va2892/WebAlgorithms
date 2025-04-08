const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let points = [];
const numAnts = 10; // Количество муравьев
const alpha = 1; // Влияние феромонов
const beta = 5; // Влияние расстояния
const evaporationRate = 0.5; // Скорость испарения феромонов
let pheromones = [];

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    points.push({ x, y });
    drawPoints();
});

function drawPoints() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    points.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'blue';
        ctx.fill();
        ctx.strokeText(index + '', point.x + 10, point.y);
    });
}

document.getElementById('startButton').addEventListener('click', () => {
    if (points.length < 2) {
        alert("Добавьте хотя бы две точки!");
        return;
    }

    initializePheromones();

    let bestPath = null;

    for (let i = 0; i < numAnts; i++) {
        let path = antWalk();
        updatePheromones(path);

        if (!bestPath || path.length > bestPath.length) {
            bestPath = path;
        }
    }

    drawBestPath(bestPath); // Передаем лучший путь для рисования
});

function initializePheromones() {
    pheromones = Array.from({ length: points.length }, () => Array(points.length).fill(1));
}

function antWalk() {
    let path = [];
    let visited = new Set();

    let currentIndex = Math.floor(Math.random() * points.length);

    for (let i = 0; i < points.length; i++) {
        visited.add(currentIndex);
        path.push(currentIndex);

        currentIndex = selectNextPoint(currentIndex, visited);

        if (currentIndex === -1) break;
    }

    return path;
}

function selectNextPoint(currentIndex, visited) {
   let probabilities = [];
   let totalProbability = 0;

   for (let i = 0; i < points.length; i++) {
       if (!visited.has(i)) {
           const distance = getDistance(points[currentIndex], points[i]);
           const pheromoneLevel = pheromones[currentIndex][i];
           const probability =
               Math.pow(pheromoneLevel, alpha) * Math.pow(1 / distance, beta);
           probabilities[i] = probability;
           totalProbability += probability;
       } else {
           probabilities[i] = 0;
       }
   }

   if (totalProbability === 0) return -1;

   let randomValue = Math.random() * totalProbability;

   for (let i=0;i<probabilities.length;i++){
       randomValue -= probabilities[i];

       if(randomValue <= 0) return i;
   }

   return -1;
}

function updatePheromones(path) {
   for (let i=0;i<path.length-1;i++){
       const fromIndex=path[i];
       const toIndex=path[i+1];
       pheromones[fromIndex][toIndex] += 1/getDistance(points[fromIndex],points[toIndex]);
       pheromones[toIndex][fromIndex] += pheromones[fromIndex][toIndex];
   }

   evaporatePheromones();
}

function evaporatePheromones() {
   for(let i=0;i<pheromones.length;i++){
       for(let j=0;j<pheromones[i].length;j++){
           pheromones[i][j]*=evaporationRate;
       }
   }
}

function drawBestPath(path) {
   ctx.beginPath();
   
   ctx.moveTo(points[path[0]].x, points[path[0]].y);

   for(let i=1;i<path.length;i++){
       ctx.lineTo(points[path[i]].x, points[path[i]].y);
   }

   ctx.strokeStyle='red';
   ctx.lineWidth=2; // Устанавливаем ширину линии
   ctx.stroke(); // Рисуем линию
}

function getDistance(pointA, pointB) {
   return Math.sqrt(Math.pow(pointA.x - pointB.x, 2) + Math.pow(pointA.y - pointB.y, 2));
}