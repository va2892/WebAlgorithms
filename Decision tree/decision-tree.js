// Класс для реализации дерева решений
class DecisionTree {
    constructor() {
        this.tree = null;
    }
    
    // Основная функция для построения дерева
    buildTree(data, features, target) {
        // Базовые случаи для остановки рекурсии
        const uniqueTargets = [...new Set(data.map(row => row[target]))];
        if (uniqueTargets.length === 1) {
            return {
                type: 'leaf',
                value: uniqueTargets[0],
                count: data.length
            };
        }
        
        if (features.length === 0) {
            const counts = {};
            data.forEach(row => {
                counts[row[target]] = (counts[row[target]] || 0) + 1;
            });
            const majority = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
            return {
                type: 'leaf',
                value: majority,
                count: data.length
            };
        }
        
        const bestFeature = this.findBestFeature(data, features, target);
        const featureValues = [...new Set(data.map(row => row[bestFeature]))];
        const remainingFeatures = features.filter(f => f !== bestFeature);
        
        const children = {};
        featureValues.forEach(value => {
            const subset = data.filter(row => row[bestFeature] === value);
            children[value] = this.buildTree(subset, remainingFeatures, target);
        });
        
        return {
            type: 'node',
            feature: bestFeature,
            children: children
        };
    }
    
    findBestFeature(data, features, target) {
        let bestFeature = null;
        let bestGini = Infinity;
        
        features.forEach(feature => {
            const gini = this.calculateGiniIndex(data, feature, target);
            if (gini < bestGini) {
                bestGini = gini;
                bestFeature = feature;
            }
        });
        
        return bestFeature;
    }
    
    calculateGiniIndex(data, feature, target) {
        const featureValues = [...new Set(data.map(row => row[feature]))];
        let totalGini = 0;
        
        featureValues.forEach(value => {
            const subset = data.filter(row => row[feature] === value);
            const subsetSize = subset.length;
            const targetCounts = {};
            
            subset.forEach(row => {
                targetCounts[row[target]] = (targetCounts[row[target]] || 0) + 1;
            });
            
            let gini = 1;
            Object.values(targetCounts).forEach(count => {
                gini -= Math.pow(count / subsetSize, 2);
            });
            
            totalGini += (subsetSize / data.length) * gini;
        });
        
        return totalGini;
    }
    
    predictWithPath(sample, tree, path = []) {
        if (tree.type === 'leaf') {
            return {
                prediction: tree.value,
                path: [...path, `Результат: ${tree.value} (${tree.count} примеров)`]
            };
        }
        
        const featureValue = sample[tree.feature];
        const child = tree.children[featureValue];
        
        if (!child) {
            const counts = {};
            this.collectLeafCounts(tree, counts);
            const majority = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
            return {
                prediction: majority,
                path: [...path, `Неизвестное значение "${tree.feature} = ${featureValue}", возвращаем наиболее частый результат: ${majority}`]
            };
        }
        
        path.push(`Признак: ${tree.feature} = ${featureValue}`);
        return this.predictWithPath(sample, child, path);
    }
    
    collectLeafCounts(node, counts) {
        if (node.type === 'leaf') {
            counts[node.value] = (counts[node.value] || 0) + node.count;
        } else {
            Object.values(node.children).forEach(child => {
                this.collectLeafCounts(child, counts);
            });
        }
    }
    
    visualizeTree(tree, level = 0) {
        if (tree.type === 'leaf') {
            return `<div class="tree-leaf" style="margin-left: ${level * 20}px">
                <strong>Результат:</strong> ${tree.value} (примеров: ${tree.count})
            </div>`;
        }
        
        let html = `<div class="tree-node" style="margin-left: ${level * 20}px">
            <strong>${tree.feature}</strong>`;
        
        Object.entries(tree.children).forEach(([value, child]) => {
            html += `<div style="margin-left: 20px">
                <strong>→ ${value}:</strong>
                ${this.visualizeTree(child, level + 1)}
            </div>`;
        });
        
        html += `</div>`;
        return html;
    }
}

// Функция для парсинга CSV
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length !== headers.length) continue;
        
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index].trim();
        });
        data.push(row);
    }
    
    return {
        headers: headers,
        data: data
    };
}