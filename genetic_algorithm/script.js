const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const answerInputLength = document.getElementById('bestPathLength');
const answerInputWay = document.getElementById('cityCount');
const currentIterationElement = document.getElementById('currentIteration');

// Увеличиваем размер canvas
canvas.width = 800;
canvas.height = 500;

// Глобальные переменные состояния
let points = [];
let currentPopulation = [];
let potentialBestResult = Number.MAX_VALUE;
let globalPressing = false;

// Параметры алгоритма (будут обновляться из полей ввода)
let POPULATION_SIZE = 1000;
let PERCENTAGE_MUTATION = 0.5;
let COUNT_GENERATIONS = 100;

// Получаем элементы ввода
const populationSizeInput = document.getElementById('populationSize');
const percentageMutationInput = document.getElementById('percentageMutation');
const countGenerationsInput = document.getElementById('countGenerations');
// Увеличим количество попыток найти лучший путь
const MAX_UNCHANGED_ITERATIONS = 1;

// Добавим проверку на минимальное количество точек
function validatePoints() {
    if (points.length < 3) {
        alert("Добавьте хотя бы 3 города для построения маршрута");
        return false;
    }
    return true;
}

// Обновляем параметры из полей ввода
function updateAlgorithmParameters() {
    POPULATION_SIZE = parseInt(populationSizeInput.value) || 1000;
    PERCENTAGE_MUTATION = parseFloat(percentageMutationInput.value) || 0.5;
    COUNT_GENERATIONS = parseInt(countGenerationsInput.value) || 100;
}

// Обработчик клика по canvas
canvas.addEventListener('click', (event) => {
    if (globalPressing) return;
    
    potentialBestResult = Number.MAX_VALUE;
    const rect = canvas.getBoundingClientRect();
    points.push({ 
        x: event.clientX - rect.left, 
        y: event.clientY - rect.top 
    });
    drawPoints();
    updateCityCount();
});

// Основные функции алгоритма

/**
 * Генерация начальной популяции
 */
function generateStartPopulation() {
    currentPopulation = [];
    const basis = Array.from({ length: points.length }, (_, i) => i);
    
    // Добавляем базовую особь (порядок по возрастанию)
    currentPopulation.push({
        wayLength: getWayLength(basis),
        way: basis
    });

    // Генерация случайных особей
    for (let i = 0; i < POPULATION_SIZE - 1; i++) {
        const individ = [...basis];
        shuffleArray(individ);
        currentPopulation.push({
            wayLength: getWayLength(individ),
            way: individ
        });
    }
}

/**
 * Вычисление длины пути
 */
function getWayLength(path) {
    if (path.length < 2) return 0;
    
    let length = 0;
    for (let i = 0; i < path.length - 1; i++) {
        length += distance(points[path[i]], points[path[i+1]]);
    }
    // Добавляем расстояние от последней точки к первой
    length += distance(points[path[path.length-1]], points[path[0]]);
    return length;
}

/**
 * Расстояние между двумя точками
 */
function distance(pointA, pointB) {
    const dx = pointA.x - pointB.x;
    const dy = pointA.y - pointB.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Процесс размножения
 */
function reproduce() {
    // Выбор двух случайных родителей
    const [parent1, parent2] = selectTwoDifferentParents();
    
    // Создание потомков
    const [child1, child2] = crossover(parent1.way, parent2.way);
    
    // Мутация потомков
    const mutatedChild1 = mutation(child1);
    const mutatedChild2 = mutation(child2);
    
    // Добавление потомков в популяцию
    currentPopulation.push(
        { wayLength: getWayLength(mutatedChild1), way: mutatedChild1 },
        { wayLength: getWayLength(mutatedChild2), way: mutatedChild2 }
    );
    
    // Сортировка и отбор лучших особей
    currentPopulation.sort((a, b) => a.wayLength - b.wayLength);
    currentPopulation = currentPopulation.slice(0, POPULATION_SIZE);
}

/**
 * Выбор двух разных родителей
 */
function selectTwoDifferentParents() {
    const index1 = Math.floor(Math.random() * currentPopulation.length);
    let index2 = Math.floor(Math.random() * currentPopulation.length);
    
    // Гарантируем, что родители разные
    while (index2 === index1) {
        index2 = Math.floor(Math.random() * currentPopulation.length);
    }
    
    return [currentPopulation[index1], currentPopulation[index2]];
}

/**
 * Кроссовер (одноточечный)
 */
function crossover(parent1, parent2) {
    const breakPoint = Math.floor(Math.random() * (parent1.length - 1)) + 1;
    const child1 = [...parent1.slice(0, breakPoint)];
    const child2 = [...parent2.slice(0, breakPoint)];
    
    fillChild(child1, parent2);
    fillChild(child2, parent1);
    
    return [child1, child2];
}

/**
 * Заполнение оставшихся генов потомка
 */
function fillChild(child, parent) {
    for (const gene of parent) {
        if (!child.includes(gene)) {
            child.push(gene);
        }
    }
}

/**
 * Мутация (перестановка двух случайных генов)
 */
function mutation(individ) {
    if (Math.random() * 100 < PERCENTAGE_MUTATION) {
        const a = Math.floor(Math.random() * (individ.length - 1)) + 1;
        let b = Math.floor(Math.random() * (individ.length - 1)) + 1;
        
        // Гарантируем, что индексы разные
        while (b === a) {
            b = Math.floor(Math.random() * (individ.length - 1)) + 1;
        }
        
        [individ[a], individ[b]] = [individ[b], individ[a]];
    }
    return individ;
}

// Улучшенная функция поиска пути
async function findBestWay() {
    if (!validatePoints()) return;
    
    updateAlgorithmParameters();
    globalPressing = true;
    let unchangedIterations = 0;
    let bestSolution = null;
    
    currentIterationElement.textContent = `Итерация: 0/${COUNT_GENERATIONS}`;
    
    while (unchangedIterations < MAX_UNCHANGED_ITERATIONS) {
        generateStartPopulation();
        
        for (let i = 0; i < COUNT_GENERATIONS; i++) {
            reproduce();
            currentIterationElement.textContent = `Итерация: ${i+1}/${COUNT_GENERATIONS}`;
            
            // Обновляем лучший путь каждые 10 итераций
            if (i % 10 === 0) {
                const currentBest = currentPopulation[0];
                if (!bestSolution || currentBest.wayLength < bestSolution.wayLength) {
                    bestSolution = {...currentBest};
                    updateBestSolutionInfo(bestSolution);
                    unchangedIterations = 0;
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        unchangedIterations++;
    }
    
    if (bestSolution) {
        drawWay(bestSolution.way);
    } else {
        alert("Не удалось найти оптимальный путь. Попробуйте увеличить количество поколений.");
    }
    
    globalPressing = false;
}


// Вспомогательные функции

/**
 * Обновление информации о лучшем решении
 */
function updateBestSolutionInfo(solution) {
    answerInputLength.textContent = "Лучший путь: " + Math.round(solution.wayLength);
    updateCityCount();
    
    drawPoints();
    drawWay(solution.way);
}

/**
 * Обновление счетчика городов
 */
function updateCityCount() {
    answerInputWay.textContent = `Особей: ${points.length}`;
}

/**
 * Отрисовка пути
 */
function drawWay(way) {
    if (way.length === 0) return;
    
    // Рисуем начальную точку (зеленая)
    const startPoint = points[way[0]];
    ctx.fillStyle = 'green';
    ctx.beginPath();
    ctx.arc(startPoint.x, startPoint.y, 10, 0, Math.PI * 2);
    ctx.fill();

    // Рисуем путь (красные линии)
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    
    for (let i = 1; i < way.length; i++) {
        const point = points[way[i]];
        ctx.lineTo(point.x, point.y);
    }
    
    // Замыкаем путь
    ctx.lineTo(startPoint.x, startPoint.y);
    ctx.stroke();
}

/**
 * Отрисовка всех точек
 */
function drawPoints() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    points.forEach(point => {
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });
}

/**
 * Перемешивание массива (алгоритм Фишера-Йетса)
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Обработчики событий
document.getElementById('run').addEventListener('click', () => {
    if (!globalPressing) {
        findBestWay();
    }
});

document.getElementById('clear').addEventListener('click', () => {
    if (!globalPressing) {
        points = [];
        currentPopulation = [];
        potentialBestResult = Number.MAX_VALUE;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        answerInputLength.textContent = "Лучший путь: не найден";
        answerInputWay.textContent = "Особей: 0";
        currentIterationElement.textContent = "Итерация: 0/0";
    }
});

// Улучшенная генерация случайных точек
document.getElementById('random').addEventListener('click', () => {
    if (!globalPressing) {
        points = [];
        const margin = 50;
        
        // Генерируем точки с отступами от краев canvas
        for (let i = 0; i < 10; i++) {
            points.push({
                x: margin + Math.random() * (canvas.width - 2 * margin),
                y: margin + Math.random() * (canvas.height - 2 * margin)
            });
        }
        
        drawPoints();
        updateCityCount();
        
        // Автоматически запускаем поиск пути
        setTimeout(() => findBestWay(), 100);
    }
});