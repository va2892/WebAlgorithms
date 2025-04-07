const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let points = [];

// Обработчик клика по канвасу
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    points.push({ x, y });
    drawPoints();
});

// Функция для отрисовки точек
function drawPoints() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    points.forEach(point => {
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });
}

// K-средние алгоритм
function kMeans(k) {
    // Инициализация центров кластеров случайными точками
    let centroids = points.slice(0, k);

    let clusters = new Array(k);
    let changed;

    do {
        // Создание пустых кластеров
        clusters = Array.from({ length: k }, () => []);
        changed = false;

        // Назначение точек к ближайшему центроиду
        points.forEach(point => {
            let distances = centroids.map(centroid => distance(point, centroid));
            let clusterIndex = distances.indexOf(Math.min(...distances));
            clusters[clusterIndex].push(point);
        });

        // Обновление центров кластеров
        for (let i = 0; i < k; i++) {
            if (clusters[i].length > 0) {
                const newCentroid = {
                    x: clusters[i].reduce((sum, p) => sum + p.x, 0) / clusters[i].length,
                    y: clusters[i].reduce((sum, p) => sum + p.y, 0) / clusters[i].length,
                };
                if (newCentroid.x !== centroids[i].x || newCentroid.y !== centroids[i].y) {
                    changed = true;
                }
                centroids[i] = newCentroid;
            }
        }
    } while (changed);

    return clusters;
}

// Функция для вычисления расстояния между двумя точками
function distance(pointA, pointB) {
    return Math.sqrt((pointA.x - pointB.x) ** 2 + (pointA.y - pointB.y) ** 2);
}

// Обработчик кнопки запуска кластеризации
document.getElementById('clusterButton').addEventListener('click', () => {
    const k = prompt("Введите количество кластеров:", "3");
    if (k && !isNaN(k)) {
        const clusters = kMeans(parseInt(k));
        drawClusters(clusters);
    }
});

// Функция для отрисовки кластеров
function drawClusters(clusters) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const colors = ['red', 'green', 'blue', 'yellow', 'purple', 'orange', 'cyan', 'magenta'];

    clusters.forEach((cluster, index) => {
        ctx.fillStyle = colors[index % colors.length];
        cluster.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
            ctx.fill();
        });
    });
}