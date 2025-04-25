// Инициализация canvas
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Параметры алгоритма
let points = [];
let bestPath = [];
let bestLength = Infinity;
let pheromones = [];
let currentIteration = 0;
let isRunning = false;

// Фиксированные параметры алгоритма
const ANT_COUNT = 10;
const ALPHA = 1;   // Влияние феромонов
const BETA = 2;     // Влияние расстояния
const EVAPORATION = 0.5; // Испарение феромонов
const Q = 100;      // Количество феромонов

// Инициализация элементов управления
const addPointBtn = document.getElementById('addPoint');
const clearBtn = document.getElementById('clear');
const randomBtn = document.getElementById('random');
const runBtn = document.getElementById('run');
const iterationsInput = document.getElementById('iterations');
const bestLengthSpan = document.getElementById('bestLength');
const bestPathSpan = document.getElementById('bestPath');
const currentIterationSpan = document.getElementById('currentIteration');

// Обработчики событий
canvas.addEventListener('click', (e) => {
    if (isRunning) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    points.push({x, y});
    drawPoints();
});

addPointBtn.addEventListener('click', () => {
    if (isRunning) return;
    canvas.style.cursor = 'crosshair';
});

clearBtn.addEventListener('click', () => {
    if (isRunning) return;
    points = [];
    bestPath = [];
    bestLength = Infinity;
    currentIteration = 0;
    updateResults();
    drawPoints();
});

randomBtn.addEventListener('click', () => {
    if (isRunning) return;
    
    points = [];
    const pointCount = Math.floor(Math.random() * 10) + 5; // 5-14 точек
    
    for (let i = 0; i < pointCount; i++) {
        const x = 50 + Math.random() * (canvas.width - 100);
        const y = 50 + Math.random() * (canvas.height - 100);
        points.push({x, y});
    }
    
    drawPoints();
});

runBtn.addEventListener('click', async () => {
    if (isRunning || points.length < 2) return;
    
    isRunning = true;
    runBtn.disabled = true;
    
    initializePheromones();
    
    const iterations = parseInt(iterationsInput.value);
    
    for (let i = 0; i < iterations; i++) {
        currentIteration = i + 1;
        updateResults();
        
        const paths = [];
        const lengths = [];
        
        // Каждый муравей строит путь
        for (let ant = 0; ant < ANT_COUNT; ant++) {
            const {path, length} = buildAntPath();
            paths.push(path);
            lengths.push(length);
            
            if (length < bestLength) {
                bestLength = length;
                bestPath = [...path];
                drawPoints();
                drawPath(bestPath, 'red');
            }
        }
        
        // Обновление феромонов
        updatePheromones(paths, lengths);
        
        // Небольшая задержка для визуализации
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    isRunning = false;
    runBtn.disabled = false;
    drawPoints();
    drawPath(bestPath, 'red');
});

// Функции алгоритма

function initializePheromones() {
    const n = points.length;
    pheromones = Array(n).fill().map(() => Array(n).fill(1));
    bestPath = [];
    bestLength = Infinity;
    currentIteration = 0;
}

function buildAntPath() {
    const n = points.length;
    
    const visited = new Set();
    const path = [];
    let length = 0;
    
    // Начинаем со случайного города
    let current = Math.floor(Math.random() * n);
    path.push(current);
    visited.add(current);
    
    while (visited.size < n) {
        // Вычисляем вероятности перехода в каждый из непосещенных городов
        const probabilities = [];
        let total = 0;
        
        for (let i = 0; i < n; i++) {
            if (!visited.has(i)) {
                const pheromone = Math.pow(pheromones[current][i], ALPHA);
                const distance = 1 / getDistance(points[current], points[i]);
                const attractiveness = pheromone * Math.pow(distance, BETA);
                probabilities.push({city: i, prob: attractiveness});
                total += attractiveness;
            } else {
                probabilities.push({city: i, prob: 0});
            }
        }
        
        // Нормализуем вероятности
        for (let i = 0; i < probabilities.length; i++) {
            probabilities[i].prob /= total;
        }
        
        // Выбираем следующий город на основе вероятностей
        let rand = Math.random();
        let nextCity = -1;
        
        for (let i = 0; i < probabilities.length; i++) {
            rand -= probabilities[i].prob;
            if (rand <= 0) {
                nextCity = probabilities[i].city;
                break;
            }
        }
        
        // Если из-за ошибок округления следующий город не выбран, берем первый доступный
        if (nextCity === -1) {
            for (let i = 0; i < n; i++) {
                if (!visited.has(i)) {
                    nextCity = i;
                    break;
                }
            }
        }
        
        length += getDistance(points[current], points[nextCity]);
        path.push(nextCity);
        visited.add(nextCity);
        current = nextCity;
    }
    
    // Возвращаемся в начальный город
    length += getDistance(points[current], points[path[0]]);
    path.push(path[0]);
    
    return {path, length};
}

function updatePheromones(paths, lengths) {
    const n = points.length;
    
    // Испарение феромонов
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            pheromones[i][j] *= (1 - EVAPORATION);
        }
    }
    
    // Добавление новых феромонов
    for (let ant = 0; ant < paths.length; ant++) {
        const path = paths[ant];
        const deltaPheromone = Q / lengths[ant];
        
        for (let i = 0; i < path.length - 1; i++) {
            const from = path[i];
            const to = path[i+1];
            pheromones[from][to] += deltaPheromone;
            pheromones[to][from] += deltaPheromone; // Феромоны симметричны
        }
    }
}

// Вспомогательные функции

function getDistance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function drawPoints() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем точки
    ctx.fillStyle = 'blue';
    for (const point of points) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawPath(path, color) {
    if (path.length < 2) return;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[path[0]].x, points[path[0]].y);
    
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(points[path[i]].x, points[path[i]].y);
    }
    
    ctx.stroke();
    
    // Подписываем порядок посещения городов
    ctx.fillStyle = 'black';
    ctx.font = '12px Arial';
    for (let i = 0; i < path.length - 1; i++) {
        const point = points[path[i]];
        ctx.fillText(i+1, point.x + 8, point.y + 8);
    }
}

function updateResults() {
    currentIterationSpan.textContent = currentIteration;
    
    if (bestPath.length > 0) {
        bestLengthSpan.textContent = bestLength.toFixed(2);
        bestPathSpan.textContent = bestPath.slice(0, -1).map(i => i+1).join(' → ') + ' → 1';
    } else {
        bestLengthSpan.textContent = '-';
        bestPathSpan.textContent = '-';
    }
}

// Инициализация
drawPoints();