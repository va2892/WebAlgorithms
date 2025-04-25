const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const pointCountElement = document.getElementById('pointCount');
const clusterInfoElement = document.getElementById('clusterInfo');
const iterationInfoElement = document.getElementById('iterationInfo');
const algorithmSelect = document.getElementById('algorithm');

let points = [];
let clusters = [];
let isProcessing = false;
const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];

const NOISE_COLOR = '#999999';

function initCanvas() {
    canvas.width = 1200;
    canvas.height = 600;
}

canvas.addEventListener('click', (event) => {
    if (isProcessing) return;
    
    const rect = canvas.getBoundingClientRect();
    points.push({ 
        x: event.clientX - rect.left, 
        y: event.clientY - rect.top 
    });
    drawPoints();
    updatePointCount();
});

document.getElementById('clearButton').addEventListener('click', () => {
    if (isProcessing) return;
    resetCanvas();
});

document.getElementById('randomButton').addEventListener('click', () => {
    if (isProcessing) return;
    generateRandomPoints(10);
});

document.getElementById('clusterButton').addEventListener('click', () => {
    if (isProcessing || points.length < 2) return;
    startClustering();
});

function resetCanvas() {
    points = [];
    clusters = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updatePointCount();
    updateClusterInfo(0);
    iterationInfoElement.textContent = 'Итераций: 0';
}

function generateRandomPoints(count) {
    points = [];
    const margin = 50;
    
    for (let i = 0; i < count; i++) {
        points.push({
            x: margin + Math.random() * (canvas.width - 2 * margin),
            y: margin + Math.random() * (canvas.height - 2 * margin)
        });
    }
    
    drawPoints();
    updatePointCount();
}

async function startClustering() {
    isProcessing = true;
    const k = parseInt(document.getElementById('clusterCount').value) || 3;
    const algorithm = document.getElementById('algorithm').value;
    
    try {
        if (algorithm === 'kmeans') {
            clusters = await kMeansClustering(k);
        } else if (algorithm === 'dbscan') {
            clusters = await dbscanClustering();
        } else if (algorithm === 'hierarchical') {
            clusters = hierarchicalClustering(k);
        }
        
        clusters = clusters.filter(cluster => cluster.length > 0);
        drawClusters(clusters);
        updateClusterInfo(clusters.length);
    } finally {
        isProcessing = false;
    }
}

async function kMeansClustering(k, maxIterations = 100) {
    let centroids = initializeCentroids(k);
    let clusters = [];
    
    for (let i = 0; i < maxIterations; i++) {
        iterationInfoElement.textContent = `Итераций: ${i + 1}`;
        clusters = assignPointsToCentroids(centroids);
        
        const newCentroids = calculateNewCentroids(clusters);
        if (!centroidsChanged(centroids, newCentroids)) break;
        
        centroids = newCentroids;
        drawClusters(clusters, centroids);
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return clusters;
}

function dbscanClustering(eps = 50, minPts = 3) {
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

    if (noise.length > 0) {
        clusters.push(noise);
    }
    
    return clusters;
}

function assignPointsToCentroids(centroids) {
    const clusters = Array.from({ length: centroids.length }, () => []);
    
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
    
    return clusters;
}

function calculateNewCentroids(clusters) {
    return clusters.map(cluster => {
        if (cluster.length === 0) return null;
        return {
            x: cluster.reduce((sum, p) => sum + p.x, 0) / cluster.length,
            y: cluster.reduce((sum, p) => sum + p.y, 0) / cluster.length
        };
    }).filter(centroid => centroid !== null);
}

function centroidsChanged(oldCentroids, newCentroids) {
    return oldCentroids.some((centroid, i) => 
        distance(centroid, newCentroids[i]) > 1
    );
}

function expandCluster(cluster, neighbors, visited, eps, minPts) {
    for (let i = 0; i < neighbors.length; i++) {
        const pointIndex = neighbors[i];
        
        if (!visited.has(pointIndex)) {
            visited.add(pointIndex);
            const newNeighbors = regionQuery(points[pointIndex], eps);
            
            if (newNeighbors.length >= minPts) {
                neighbors = neighbors.concat(newNeighbors);
            }
        }
        
        if (!cluster.includes(points[pointIndex])) {
            cluster.push(points[pointIndex]);
        }
    }
}

function regionQuery(point, eps) {
    const neighbors = [];
    points.forEach((p, index) => {
        if (distance(point, p) <= eps) neighbors.push(index);
    });
    return neighbors;
}

function hierarchicalClustering(k) {
    let currentClusters = points.map(point => [point]);

    const distanceMatrix = computeDistanceMatrix(points);

    while (currentClusters.length > k) {
        let minDistance = Infinity;
        let cluster1Idx = 0;
        let cluster2Idx = 1;
        
        for (let i = 0; i < currentClusters.length; i++) {
            for (let j = i + 1; j < currentClusters.length; j++) {
                const distance = clustersDistance(
                    currentClusters[i], 
                    currentClusters[j], 
                    distanceMatrix
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    cluster1Idx = i;
                    cluster2Idx = j;
                }
            }
        }

        const mergedCluster = [...currentClusters[cluster1Idx], ...currentClusters[cluster2Idx]];
        currentClusters = currentClusters.filter((_, idx) => idx !== cluster1Idx && idx !== cluster2Idx);
        currentClusters.push(mergedCluster);
    }
    
    return currentClusters;
}

function computeDistanceMatrix(points) {
    const matrix = [];
    for (let i = 0; i < points.length; i++) {
        matrix[i] = [];
        for (let j = 0; j < points.length; j++) {
            matrix[i][j] = distance(points[i], points[j]);
        }
    }
    return matrix;
}

function clustersDistance(cluster1, cluster2, distanceMatrix) {
    let maxDistance = 0;
    for (const point1 of cluster1) {
        const idx1 = points.findIndex(p => p.x === point1.x && p.y === point1.y);
        for (const point2 of cluster2) {
            const idx2 = points.findIndex(p => p.x === point2.x && p.y === point2.y);
            maxDistance = Math.max(maxDistance, distanceMatrix[idx1][idx2]);
        }
    }
    return maxDistance;
}

function initializeCentroids(k) {
    return points
        .slice()
        .sort(() => Math.random() - 0.5)
        .slice(0, k);
}

function distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
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
    
    const algorithm = document.getElementById('algorithm').value;

    if (algorithm === 'kmeans' && centroids) {
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
        ctx.lineWidth = 1;
        
        clusters.forEach((cluster, i) => {
            if (centroids[i]) {
                cluster.forEach(point => {
                    ctx.beginPath();
                    ctx.moveTo(centroids[i].x, centroids[i].y);
                    ctx.lineTo(point.x, point.y);
                    ctx.stroke();
                });
            }
        });
    }

    clusters.forEach((cluster, i) => {
        const isNoise = algorithm === 'dbscan' && 
                       i === clusters.length - 1 && 
                       clusters.length > 1;
        
        ctx.fillStyle = isNoise ? NOISE_COLOR : colors[i % colors.length];
        
        cluster.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
            ctx.fill();
        });
    });

    if (algorithm === 'kmeans' && centroids) {
        centroids.forEach((centroid, i) => {
            if (!centroid) return;

            ctx.strokeStyle = colors[i % colors.length];
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centroid.x, centroid.y, 20, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(centroid.x, centroid.y, 10, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    if (algorithm === 'hierarchical') {
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.2)';
        ctx.lineWidth = 1;
        
        clusters.forEach(cluster => {
            if (cluster.length > 1) {
                for (let i = 0; i < cluster.length; i++) {
                    for (let j = i + 1; j < cluster.length; j++) {
                        ctx.beginPath();
                        ctx.moveTo(cluster[i].x, cluster[i].y);
                        ctx.lineTo(cluster[j].x, cluster[j].y);
                        ctx.stroke();
                    }
                }
            }
        });
    }
}   

function updatePointCount() {
    pointCountElement.textContent = `Точек: ${points.length}`;
}

function updateClusterInfo(count) {
    clusterInfoElement.textContent = `Кластеров: ${count}`;
}

initCanvas();
updatePointCount();
updateClusterInfo(0);
iterationInfoElement.textContent = 'Итераций: 0';