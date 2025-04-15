const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const pointCountElement = document.getElementById('pointCount');
const clusterInfoElement = document.getElementById('clusterInfo');
const iterationInfoElement = document.getElementById('iterationInfo');
const statusMessageElement = document.getElementById('statusMessage');
const clusterCountInput = document.getElementById('clusterCount');
const algorithmSelect = document.getElementById('algorithm');

let points = [];
let clusters = [];
let isProcessing = false;
const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
                '#FF9F40', '#8AC24A', '#607D8B', '#E91E63', '#9C27B0'];

// Обработчики событий
canvas.addEventListener('click', (event) => {
    if (isProcessing) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    points.push({ x, y });
    drawPoints();
    updatePointCount();
});

document.getElementById('clearButton').addEventListener('click', () => {
    if (isProcessing) return;
    
    points = [];
    clusters = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updatePointCount();
    updateClusterInfo(0);
    iterationInfoElement.textContent = 'Итераций: 0';
    showStatus("Готов к работе", "info");
});

document.getElementById('randomButton').addEventListener('click', () => {
    if (isProcessing) return;
    
    points = [];
    const margin = 50;
    const count = 10;
    
    // Генерируем точки сгруппированно для лучшей демонстрации кластеризации
    for (let i = 0; i < count; i++) {
        const groupCenter = {
            x: margin + Math.random() * (canvas.width - 2 * margin),
            y: margin + Math.random() * (canvas.height - 2 * margin)
        };
        
        // Добавляем несколько точек вокруг центра
        for (let j = 0; j < 3; j++) {
            points.push({
                x: groupCenter.x + (Math.random() - 0.5) * 50,
                y: groupCenter.y + (Math.random() - 0.5) * 50
            });
        }
    }
    
    drawPoints();
    updatePointCount();
    showStatus(`Сгенерировано ${points.length} случайных точек`, "info");
});

document.getElementById('clusterButton').addEventListener('click', async () => {
    if (isProcessing || points.length < 2) {
        showStatus("Добавьте хотя бы 2 точки для кластеризации", "error");
        return;
    }
    
    const k = parseInt(clusterCountInput.value) || 3;
    const algorithm = algorithmSelect.value;
    
    if (algorithm === 'kmeans' && k > points.length) {
        showStatus(`Количество кластеров (${k}) не может быть больше количества точек (${points.length})`, "error");
        return;
    }
    
    isProcessing = true;
    showStatus("Выполняется кластеризация...", "info");
    
    try {
        if (algorithm === 'kmeans') {
            clusters = await kMeansClustering(k);
        } else {
            clusters = await dbscanClustering();
        }
        
        // Фильтруем пустые кластеры
        clusters = clusters.filter(cluster => cluster.length > 0);
        
        drawClusters(clusters);
        updateClusterInfo(clusters.length);
        showStatus(`Найдено ${clusters.length} кластеров`, "info");
    } catch (error) {
        console.error("Ошибка кластеризации:", error);
        showStatus("Ошибка при выполнении кластеризации", "error");
    } finally {
        isProcessing = false;
    }
});

// Алгоритм K-means
async function kMeansClustering(k, maxIterations = 100) {
    // Инициализация центроидов с улучшенным методом k-means++
    let centroids = initializeCentroids(k);
    let iterations = 0;
    let clusters = [];
    
    for (iterations = 0; iterations < maxIterations; iterations++) {
        iterationInfoElement.textContent = `Итераций: ${iterations + 1}`;
        
        // Шаг 1: Назначение точек кластерам
        clusters = Array.from({ length: k }, () => []);
        
        points.forEach(point => {
            let minDist = Infinity;
            let clusterIndex = 0;
            
            centroids.forEach((centroid, i) => {
                const dist = distance(point, centroid);
                if (dist < minDist) {
                    minDist = dist;
                    clusterIndex = i;
                }
            });
            
            clusters[clusterIndex].push(point);
        });
        
        // Шаг 2: Пересчет центроидов
        let changed = false;
        centroids.forEach((centroid, i) => {
            if (clusters[i].length === 0) return;
            
            const newX = clusters[i].reduce((sum, p) => sum + p.x, 0) / clusters[i].length;
            const newY = clusters[i].reduce((sum, p) => sum + p.y, 0) / clusters[i].length;
            
            if (distance(centroid, { x: newX, y: newY }) > 1) {
                changed = true;
                centroids[i] = { x: newX, y: newY };
            }
        });
        
        // Визуализация промежуточного результата
        drawClusters(clusters, centroids);
        await delay(100);
        
        if (!changed) break;
    }
    
    return clusters;
}

// Алгоритм DBSCAN
async function dbscanClustering(eps = 50, minPts = 3) {
    const clusters = [];
    const visited = new Set();
    const noise = [];
    
    points.forEach((point, index) => {
        if (visited.has(index)) return;
        
        visited.add(index);
        const neighbors = regionQuery(point, eps);
        
        if (neighbors.length < minPts) {
            noise.push(point);
        } else {
            const cluster = [point];
            expandCluster(cluster, neighbors, visited, eps, minPts);
            clusters.push(cluster);
        }
    });
    
    // Шум тоже возвращаем как отдельный кластер
    if (noise.length > 0) {
        clusters.push(noise);
    }
    
    return clusters;
}

// Вспомогательные функции для DBSCAN
function expandCluster(cluster, neighbors, visited, eps, minPts) {
    for (let i = 0; i < neighbors.length; i++) {
        const pointIndex = neighbors[i];
        
        if (!visited.has(pointIndex)) {
            visited.add(pointIndex);
            const newNeighbors = regionQuery(points[pointIndex], eps);
            
            if (newNeighbors.length >= minPts) {
                neighbors = neighbors.concat(newNeighbors.filter(n => !neighbors.includes(n)));
            }
        }
        
        // Добавляем точку в кластер, если ее там еще нет
        if (!cluster.some(p => p === points[pointIndex])) {
            cluster.push(points[pointIndex]);
        }
    }
}

function regionQuery(point, eps) {
    const neighbors = [];
    points.forEach((p, index) => {
        if (distance(point, p) <= eps) {
            neighbors.push(index);
        }
    });
    return neighbors;
}

// Общие вспомогательные функции
function initializeCentroids(k) {
    // Выбираем первую центроиду случайно
    const centroids = [points[Math.floor(Math.random() * points.length)]];
    
    // Для остальных центроид используем алгоритм k-means++
    for (let i = 1; i < k; i++) {
        // Вычисляем квадраты расстояний до ближайшей центроиды для каждой точки
        const distances = points.map(p => {
            return Math.min(...centroids.map(c => distance(p, c) ** 2));
        });
        
        // Выбираем следующую центроиду с вероятностью, пропорциональной D(x)^2
        const sum = distances.reduce((a, b) => a + b, 0);
        let threshold = Math.random() * sum;
        let j = 0;
        
        while (threshold > 0 && j < points.length) {
            threshold -= distances[j];
            j++;
        }
        
        centroids.push(points[Math.max(0, j-1)]);
    }
    
    return centroids;
}

function distance(pointA, pointB) {
    return Math.sqrt((pointA.x - pointB.x) ** 2 + (pointA.y - pointB.y) ** 2);
}

function drawPoints() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    points.forEach(point => {
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawClusters(clusters, centroids = null) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Сначала рисуем линии, чтобы они были под точками
    if (centroids) {
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
        ctx.lineWidth = 1;
        
        points.forEach(point => {
            let minDist = Infinity;
            let nearestCentroid = null;
            
            centroids.forEach(centroid => {
                const dist = distance(point, centroid);
                if (dist < minDist) {
                    minDist = dist;
                    nearestCentroid = centroid;
                }
            });
            
            if (nearestCentroid) {
                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(nearestCentroid.x, nearestCentroid.y);
                ctx.stroke();
            }
        });
    }
    
    // Затем рисуем точки кластеров
    clusters.forEach((cluster, index) => {
        const color = colors[index % colors.length];
        
        // Рисуем точки кластера
        ctx.fillStyle = color;
        cluster.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Рисуем центроиды (для k-means)
        if (centroids && centroids[index]) {
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(centroids[index].x, centroids[index].y, 10, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centroids[index].x, centroids[index].y, 20, 0, Math.PI * 2);
            ctx.stroke();
        }
    });
}

function updatePointCount() {
    pointCountElement.textContent = `Точек: ${points.length}`;
}

function updateClusterInfo(count) {
    clusterInfoElement.textContent = `Кластеров: ${count}`;
}

function showStatus(message, type = "info") {
    statusMessageElement.textContent = message;
    statusMessageElement.className = `status-message ${type}`;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Инициализация
updatePointCount();
updateClusterInfo(0);
showStatus("Готов к работе", "info");