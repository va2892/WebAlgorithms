class AntColonyOptimizer {
    constructor(cities, params = {}) {
        this.cities = cities;
        this.antCount = params.antCount || 10;
        this.iterations = params.iterations || 50;
        this.alpha = params.alpha || 1;
        this.beta = params.beta || 2;
        this.evaporation = params.evaporation || 0.5;
        this.q = params.q || 100;
        
        this.pheromone = [];
        this.distances = [];
        this.bestPath = [];
        this.bestPathLength = Infinity;
        
        this.initialize();
    }
    
    initialize() {
        const n = this.cities.length;
        
        // Инициализация матрицы расстояний
        this.distances = new Array(n);
        for (let i = 0; i < n; i++) {
            this.distances[i] = new Array(n);
            for (let j = 0; j < n; j++) {
                const dx = this.cities[i].x - this.cities[j].x;
                const dy = this.cities[i].y - this.cities[j].y;
                this.distances[i][j] = Math.sqrt(dx * dx + dy * dy);
            }
        }
        
        // Инициализация феромонов
        this.pheromone = new Array(n);
        const initialPheromone = 1 / n;
        for (let i = 0; i < n; i++) {
            this.pheromone[i] = new Array(n).fill(initialPheromone);
        }
    }
    
    *run() {
        for (let iter = 0; iter < this.iterations; iter++) {
            const allPaths = [];
            const allLengths = [];
            
            // Каждый муравей строит путь
            for (let ant = 0; ant < this.antCount; ant++) {
                const { path, length } = this.buildPath();
                allPaths.push(path);
                allLengths.push(length);
                
                // Обновляем лучший путь
                if (length < this.bestPathLength) {
                    this.bestPathLength = length;
                    this.bestPath = [...path];
                }
            }
            
            // Обновление феромонов
            this.updatePheromones(allPaths, allLengths);
            
            // Возвращаем информацию о текущей итерации
            yield {
                iteration: iter + 1,
                bestPath: this.bestPath,
                bestPathLength: this.bestPathLength,
                pheromone: this.pheromone
            };
        }
    }
    
    buildPath() {
        const n = this.cities.length;
        const startCity = Math.floor(Math.random() * n);
        const visited = new Array(n).fill(false);
        const path = [startCity];
        visited[startCity] = true;
        let length = 0;
        
        for (let i = 0; i < n - 1; i++) {
            const currentCity = path[path.length - 1];
            const nextCity = this.selectNextCity(currentCity, visited);
            path.push(nextCity);
            visited[nextCity] = true;
            length += this.distances[currentCity][nextCity];
        }
        
        // Замыкаем путь
        length += this.distances[path[path.length - 1]][path[0]];
        
        return { path, length };
    }
    
    selectNextCity(currentCity, visited) {
        const n = this.cities.length;
        const probabilities = [];
        let total = 0;
        
        for (let i = 0; i < n; i++) {
            if (!visited[i] && currentCity !== i) {
                const pheromone = Math.pow(this.pheromone[currentCity][i], this.alpha);
                const distance = Math.pow(1 / Math.max(this.distances[currentCity][i], 0.0001), this.beta);
                const value = pheromone * distance;
                probabilities.push({ city: i, value });
                total += value;
            }
        }
        
        // Если все вероятности нулевые (может случиться на первых итерациях)
        if (total === 0) {
            const unvisited = [];
            for (let i = 0; i < n; i++) {
                if (!visited[i] && currentCity !== i) {
                    unvisited.push(i);
                }
            }
            return unvisited[Math.floor(Math.random() * unvisited.length)];
        }
        
        // Выбор следующего города по вероятности
        let random = Math.random() * total;
        for (const item of probabilities) {
            if (random < item.value) {
                return item.city;
            }
            random -= item.value;
        }
        
        return probabilities[probabilities.length - 1].city;
    }
    
    updatePheromones(allPaths, allLengths) {
        const n = this.cities.length;
        
        // Испарение феромонов
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                this.pheromone[i][j] *= (1 - this.evaporation);
                // Минимальное значение феромона
                this.pheromone[i][j] = Math.max(this.pheromone[i][j], 0.0001);
            }
        }
        
        // Добавление нового феромона
        for (let ant = 0; ant < allPaths.length; ant++) {
            const path = allPaths[ant];
            const length = allLengths[ant];
            const deltaPheromone = this.q / length;
            
            for (let i = 0; i < path.length - 1; i++) {
                const from = path[i];
                const to = path[i + 1];
                this.pheromone[from][to] += deltaPheromone;
                this.pheromone[to][from] += deltaPheromone;
            }
            
            // Замыкаем путь
            const from = path[path.length - 1];
            const to = path[0];
            this.pheromone[from][to] += deltaPheromone;
            this.pheromone[to][from] += deltaPheromone;
        }
    }
}

// Основной код приложения
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const clearBtn = document.getElementById('clear');
    const runBtn = document.getElementById('run');
    const randomBtn = document.getElementById('random');
    const bestPathLengthEl = document.getElementById('bestPathLength');
    const currentIterationEl = document.getElementById('currentIteration');
    const cityCountEl = document.getElementById('cityCount');
    
    // Размеры canvas
    canvas.width = 800;
    canvas.height = 500;
    
    // Точки (города)
    let cities = [];
    let isRunning = false;
    let animationId = null;
    let currentIterations = 0;
    let totalIterations = 0;
    
    // Обработчики событий
    canvas.addEventListener('click', (e) => {
        if (isRunning) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Проверяем, что точка не слишком близко к краю
        if (x < 10 || x > canvas.width - 10 || y < 10 || y > canvas.height - 10) {
            return;
        }
        
        // Проверяем, что точка не слишком близко к уже существующей
        const tooClose = cities.some(city => {
            const dx = city.x - x;
            const dy = city.y - y;
            return Math.sqrt(dx * dx + dy * dy) < 15;
        });
        
        if (!tooClose) {
            cities.push({ x, y });
            drawCities();
            updateCityCount();
        }
    });
    
    clearBtn.addEventListener('click', () => {
        if (isRunning) {
            cancelAnimationFrame(animationId);
            isRunning = false;
            runBtn.textContent = 'Запустить алгоритм';
            runBtn.disabled = false;
            randomBtn.disabled = false;
        }
        
        cities = [];
        drawCities();
        bestPathLengthEl.textContent = 'Лучший путь: не найден';
        currentIterationEl.textContent = 'Итерация: 0/0';
        updateCityCount();
    });
    
    randomBtn.addEventListener('click', () => {
        if (isRunning) return;
        
        cities = [];
        const margin = 30;
        const minDistance = 40;
        
        for (let i = 0; i < 10; i++) {
            let attempts = 0;
            let x, y, valid;
            
            do {
                valid = true;
                x = margin + Math.random() * (canvas.width - 2 * margin);
                y = margin + Math.random() * (canvas.height - 2 * margin);
                
                // Проверяем расстояние до других точек
                for (const city of cities) {
                    const dx = city.x - x;
                    const dy = city.y - y;
                    if (Math.sqrt(dx * dx + dy * dy) < minDistance) {
                        valid = false;
                        break;
                    }
                }
                
                attempts++;
                if (attempts > 100) break; // На всякий случай ограничим попытки
            } while (!valid && attempts <= 100);
            
            if (valid) {
                cities.push({ x, y });
            }
        }
        
        drawCities();
        updateCityCount();
    });
    
    runBtn.addEventListener('click', async () => {
        if (isRunning) {
            cancelAnimationFrame(animationId);
            isRunning = false;
            runBtn.textContent = 'Запустить алгоритм';
            randomBtn.disabled = false;
            return;
        }
        
        if (cities.length < 3) {
            alert('Добавьте хотя бы 3 города');
            return;
        }
        
        isRunning = true;
        runBtn.textContent = 'Остановить';
        randomBtn.disabled = true;
        
        const params = {
            antCount: parseInt(document.getElementById('antCount').value),
            iterations: parseInt(document.getElementById('iterations').value),
            alpha: parseFloat(document.getElementById('alpha').value),
            beta: parseFloat(document.getElementById('beta').value),
            evaporation: parseFloat(document.getElementById('evaporation').value),
            q: 100
        };
        
        totalIterations = params.iterations;
        currentIterations = 0;
        currentIterationEl.textContent = `Итерация: 0/${totalIterations}`;
        
        const aco = new AntColonyOptimizer(cities, params);
        const generator = aco.run();
        
        const runAnimation = () => {
            const result = generator.next();
            
            if (result.done || !isRunning) {
                isRunning = false;
                runBtn.textContent = 'Запустить алгоритм';
                randomBtn.disabled = false;
                return;
            }
            
            const { iteration, bestPath, bestPathLength } = result.value;
            currentIterations = iteration;
            
            // Обновляем информацию
            bestPathLengthEl.textContent = `Лучший путь: ${bestPathLength.toFixed(2)}`;
            currentIterationEl.textContent = `Итерация: ${iteration}/${totalIterations}`;
            
            // Рисуем лучший путь
            drawCities();
            drawPath(bestPath, '#e74c3c', 3);
            
            animationId = requestAnimationFrame(runAnimation);
        };
        
        animationId = requestAnimationFrame(runAnimation);
    });
    
    // Функции отрисовки
    function drawCities() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Рисуем точки
        ctx.fillStyle = '#2c3e50';
        for (const city of cities) {
            ctx.beginPath();
            ctx.arc(city.x, city.y, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Белая обводка для лучшей видимости
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'white';
            ctx.stroke();
        }
    }
    
    function drawPath(path, color = '#3498db', width = 2) {
        if (path.length < 2) return;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        
        // Рисуем основной путь
        ctx.moveTo(cities[path[0]].x, cities[path[0]].y);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(cities[path[i]].x, cities[path[i]].y);
        }
        
        // Замыкаем путь
        ctx.lineTo(cities[path[0]].x, cities[path[0]].y);
        ctx.stroke();
        
        // Рисуем более тонкие линии к центрам точек
        ctx.lineWidth = 1;
        for (let i = 0; i < path.length; i++) {
            ctx.beginPath();
            ctx.moveTo(cities[path[i]].x, cities[path[i]].y);
            const next = i === path.length - 1 ? path[0] : path[i + 1];
            ctx.lineTo(cities[next].x, cities[next].y);
            ctx.stroke();
        }
    }
    
    function updateCityCount() {
        cityCountEl.textContent = `Городов: ${cities.length}`;
        runBtn.disabled = cities.length < 3;
    }
    
    // Инициализация
    drawCities();
    updateCityCount();
});