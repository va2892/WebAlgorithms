// Основной код приложения
const decisionTree = new DecisionTree();
let currentTree = null;
let features = [];
let target = '';

// Обработчик кнопки "Построить дерево"
document.getElementById('buildTree').addEventListener('click', () => {
    const csvText = document.getElementById('trainingData').value;
    try {
        const { headers, data } = parseCSV(csvText);
        
        if (headers.length < 2 || data.length === 0) {
            throw new Error('Недостаточно данных для построения дерева');
        }
        
        target = headers[headers.length - 1];
        features = headers.slice(0, headers.length - 1);
        
        currentTree = decisionTree.buildTree(data, features, target);
        
        document.getElementById('treeVisualization').innerHTML = 
            decisionTree.visualizeTree(currentTree);
        
        document.getElementById('predictionResults').innerHTML = 
            'Дерево построено. Теперь вы можете ввести данные для прогнозирования.';
        
    } catch (error) {
        alert(`Ошибка: ${error.message}`);
        console.error(error);
    }
});

// Обработчик кнопки "Прогнозировать"
document.getElementById('predict').addEventListener('click', () => {
    if (!currentTree) {
        alert('Сначала постройте дерево на обучающих данных');
        return;
    }
    
    const csvText = document.getElementById('predictionData').value;
    try {
        const { headers, data } = parseCSV(csvText);
        
        const expectedFeatures = [...features];
        if (headers.length !== expectedFeatures.length || 
            !expectedFeatures.every(f => headers.includes(f))) {
            throw new Error(`Ожидаются признаки: ${expectedFeatures.join(', ')}`);
        }
        
        let resultsHtml = '';
        
        data.forEach((row, index) => {
            const { prediction, path } = decisionTree.predictWithPath(row, currentTree);
            
            resultsHtml += `<div style="margin-bottom: 20px;">
                <h3>Прогноз для примера ${index + 1}: <strong>${prediction}</strong></h3>
                <div class="decision-path">
                    <h4>Путь решения:</h4>
                    ${path.map(step => `<div class="path-step">${step}</div>`).join('')}
                </div>
                <div><strong>Исходные данные:</strong> ${JSON.stringify(row)}</div>
            </div>`;
        });
        
        document.getElementById('predictionResults').innerHTML = resultsHtml;
        
    } catch (error) {
        alert(`Ошибка: ${error.message}`);
        console.error(error);
    }
});