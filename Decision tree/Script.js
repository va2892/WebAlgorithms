class DecisionNode {
    constructor(attribute = null, threshold = null) {
        this.attribute = attribute; // Атрибут для разделения
        this.threshold = threshold; // Пороговое значение
        this.left = null; // Левый дочерний узел
        this.right = null; // Правый дочерний узел
        this.prediction = null; // Предсказание (если лист)
    }
}

function giniIndex(groups, classes) {
    let totalInstances = groups[0].length + groups[1].length;
    
    let gini = 0;

    for (let group of groups) {
        if (group.length === 0) continue;

        let score = 0;

        for (let cls of classes) {
            const proportion = group.filter(row => row[row.length - 1] === cls).length / group.length;
            score += proportion * proportion;
        }

        gini += (1 - score) * (group.length / totalInstances);
    }

    return gini;
}

function splitDataset(dataset, attributeIndex, threshold) {
    const leftGroup = [];
    const rightGroup = [];

    for (let row of dataset) {
        if (row[attributeIndex] <= threshold) {
            leftGroup.push(row);
        } else {
            rightGroup.push(row);
        }
    }

    return [leftGroup, rightGroup];
}

function getBestSplit(dataset) {
    let bestGini = Infinity;
    let bestSplit = {};
    
    const classes = [...new Set(dataset.map(row => row[row.length - 1]))];

    for (let attributeIndex = 0; attributeIndex < dataset[0].length - 1; attributeIndex++) {
        const thresholds = [...new Set(dataset.map(row => row[attributeIndex]))];

        for (let threshold of thresholds) {
            const [leftGroup, rightGroup] = splitDataset(dataset, attributeIndex, threshold);
            const gini = giniIndex([leftGroup, rightGroup], classes);

            if (gini < bestGini) {
                bestGini = gini;
                bestSplit = { attributeIndex, threshold };
                bestSplit.groups = [leftGroup, rightGroup]; // Сохраняем группы для дальнейшего использования
            }
        }
    }

    return bestSplit;
}

function buildDecisionTree(dataset) {
   const classes = dataset.map(row => row[row.length - 1]);
   if (classes.every(cls => cls === classes[0])) { // Если все классы одинаковые
       const leafNode = new DecisionNode();
       leafNode.prediction = classes[0];
       return leafNode;
   }

   if (dataset.length === 0 || dataset[0].length === 1) { // Если нет данных или остался только один атрибут
       const leafNode = new DecisionNode();
       leafNode.prediction = classes.reduce((a,b) =>
           classes.filter(v => v===a).length >= classes.filter(v => v===b).length ? a : b);
       return leafNode;
   }

   const { attributeIndex, threshold } = getBestSplit(dataset);
   
   // Проверка на случай отсутствия лучшего разбиения
   if (!attributeIndex && !threshold) {
       const leafNode = new DecisionNode();
       leafNode.prediction = classes.reduce((a,b) =>
           classes.filter(v => v===a).length >= classes.filter(v => v===b).length ? a : b);
       return leafNode;
   }

   const node = new DecisionNode(attributeIndex, threshold);

   const [leftGroup, rightGroup] = splitDataset(dataset, attributeIndex, threshold);

   // Проверка на пустые группы перед рекурсией
   if (leftGroup.length > 0) {
       node.left = buildDecisionTree(leftGroup);
   } else {
       node.left = new DecisionNode();
       node.left.prediction = classes.reduce((a,b) =>
           classes.filter(v => v===a).length >= classes.filter(v => v===b).length ? a : b);
   }

   if (rightGroup.length > 0) {
       node.right = buildDecisionTree(rightGroup);
   } else {
       node.right = new DecisionNode();
       node.right.prediction = classes.reduce((a,b) =>
           classes.filter(v => v===a).length >= classes.filter(v => v===b).length ? a : b);
   }

   return node;
}

function visualizeTree(node) {
   if (!node) return '';
   
   let result = '';
   
   if (node.prediction !== null) {
       result += `Лист: ${node.prediction}<br>`;
   } else {
       result += `Атрибут ${node.attribute} <= ${node.threshold}<br>`;
       result += `<strong>Левый узел:</strong><br>${visualizeTree(node.left)}`;
       result += `<strong>Правый узел:</strong><br>${visualizeTree(node.right)}`;
   }
   
   return result;
}

function makeDecision(node, inputData) {
   if (!node.prediction && node.attribute !== null && node.threshold !== null) {
       if (inputData[node.attribute] <= node.threshold) {
           return makeDecision(node.left, inputData);
       } else {
           return makeDecision(node.right, inputData);
       }
   }
   
   return node.prediction; // Возвращаем предсказание
}

document.getElementById('buildTree').addEventListener('click', () => {
   const csvData = document.getElementById('trainingData').value.trim();
   const data = csvData.split('\n').map(row => row.split(',').map((val, index) => index === row.length - 1 ? val : parseFloat(val)));
   
   treeRoot = buildDecisionTree(data);
   document.getElementById('treeOutput').innerHTML = visualizeTree(treeRoot);
});

document.getElementById('makeDecision').addEventListener('click', () => {
   const inputCsv = document.getElementById('inputData').value.trim();
   const inputDataArray = inputCsv.split(',').map((val, index) => index === inputCsv.split(',').length - 1 ? val : parseFloat(val));
   
   const decisionResult = makeDecision(treeRoot, inputDataArray);
   document.getElementById('decisionOutput').innerHTML =
     decisionResult !== undefined ? decisionResult : 'Ошибка в данных';
});