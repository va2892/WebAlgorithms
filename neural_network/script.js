// window.onload = function() {
//     draw();
// };

// var pixelSize = 50;
// var gridSize = 5;
// var grid = new Array(gridSize);
// for (let x = 0; x < gridSize; x++)
//     {
//         grid[x] = new Array(gridSize).fill(0);
//     }

// function clearField()
// {
//     let canvas = document.getElementById("field");
//     let ctx = canvas.getContext("2d");
//     ctx.clearRect(0, 0, canvas.width, canvas.height);
//     ctx.strokeStyle = "gray";
//     for (let x = 0; x < canvas.width; x += pixelSize) {
//         for (let y = 0; y < canvas.height; y += pixelSize) {
//             ctx.strokeRect(x, y, pixelSize, pixelSize);
//         }
//     }
//     for (let x = 0; x < gridSize; x++){
//             grid[x].fill(0);
//     }
    
// }

// function draw() {
//     let canvas = document.getElementById("field");
//     let ctx = canvas.getContext("2d");

//     canvas.width = canvas.height = gridSize * pixelSize;

//     ctx.strokeStyle = "gray";
//     for (let x = 0; x < canvas.width; x += pixelSize) {
//         for (let y = 0; y < canvas.height; y += pixelSize) {
//             ctx.strokeRect(x, y, pixelSize, pixelSize);
//         }
//     }

//     canvas.addEventListener("click", (event) => {
//         let rect = canvas.getBoundingClientRect();
//         let x = event.clientX - rect.left;
//         let y = event.clientY - rect.top;

//         let pixelX = Math.floor(x / pixelSize) * pixelSize;
//         let pixelY = Math.floor(y / pixelSize) * pixelSize;

//         if (grid[pixelY / pixelSize][pixelX / pixelSize] === 1) {
//             grid[pixelY / pixelSize][pixelX / pixelSize] = 0;
//             ctx.clearRect(pixelX, pixelY, pixelSize, pixelSize);
//             ctx.strokeStyle = "gray"; 
//             ctx.strokeRect(pixelX, pixelY, pixelSize, pixelSize);
//         } else {
//             grid[pixelY / pixelSize][pixelX / pixelSize] = 1;
//             ctx.fillStyle = "black";
//             ctx.fillRect(pixelX, pixelY, pixelSize, pixelSize);
//             ctx.strokeStyle = "gray"; 
//             ctx.strokeRect(pixelX, pixelY, pixelSize, pixelSize);
//         }
//     });
// }



























let modelReady = false; // Объявляем переменную глобально
let model;
var grid = Array.from({ length: 28 }, () => Array(28).fill(0));
const pixelSize = 10;
const gridSize = 28;

function drawGrid() {
    const canvas = document.getElementById("field");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "lightgray";
    for (let x = 0; x <= canvas.width; x += pixelSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += pixelSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

window.clearField = function () {
    const canvas = document.getElementById("field");
    const ctx = canvas.getContext("2d");
    grid = Array.from({ length: 28 }, () => Array(28).fill(0));
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();
};

window.onload = function () {
    const canvas = document.getElementById("field");
    canvas.width = canvas.height = gridSize * pixelSize;
    const ctx = canvas.getContext("2d");

    let isDrawing = false;

    function drawCell(x, y) {
        if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return;
        grid[y][x] = 1;
        ctx.fillStyle = "black";
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }

    canvas.addEventListener("mousedown", (e) => {
        isDrawing = true;
        handleDraw(e);
    });
    canvas.addEventListener("mouseup", () => isDrawing = false);
    canvas.addEventListener("mouseleave", () => isDrawing = false);
    canvas.addEventListener("mousemove", (e) => {
        if (isDrawing) {
            handleDraw(e);
        }
    });

    function handleDraw(e) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / pixelSize);
        const y = Math.floor((e.clientY - rect.top) / pixelSize);
        drawCell(x, y);
    }

    drawGrid();

    ///////////////////////// MNIST загрузка и модель /////////////////////////

    const IMAGE_URL = 'https://storage.googleapis.com/learnjs-data/model-builder/mnist_images.png';
    const LABELS_URL = 'https://storage.googleapis.com/learnjs-data/model-builder/mnist_labels_uint8';

    const IMAGE_SIZE = 28 * 28;
    const NUM_CLASSES = 10;
    const NUM_IMAGES = 10000;

    async function loadMnistData() {
        const [imgResp, labelsResp] = await Promise.all([
            fetch(IMAGE_URL),
            fetch(LABELS_URL)
        ]);
        const imgBlob = await imgResp.blob();
        const labelsArrayBuffer = await labelsResp.arrayBuffer();

        const imgBitmap = await createImageBitmap(imgBlob);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imgBitmap.width;
        tempCanvas.height = imgBitmap.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(imgBitmap, 0, 0);
        const { data } = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

        const images = [];
        for (let i = 0; i < NUM_IMAGES; i++) {
            const pixels = new Float32Array(IMAGE_SIZE);
            for (let j = 0; j < IMAGE_SIZE; j++) {
                pixels[j] = data[i * IMAGE_SIZE * 4 + j * 4] / 255;
            }
            images.push(tf.tensor(pixels, [28, 28, 1]));
        }

        const labels = new Uint8Array(labelsArrayBuffer).slice(0, NUM_IMAGES);
        const oneHotLabels = tf.oneHot(tf.tensor1d(labels, 'int32'), NUM_CLASSES);

        return {
            xs: tf.stack(images),
            ys: oneHotLabels
        };
    }

    async function trainModel() {
        const data = await loadMnistData();

        try {
            model = await tf.loadLayersModel('localstorage://my-model');
            alert('Модель загружена из LocalStorage');
        } catch (e) {
            model = tf.sequential();
            model.add(tf.layers.flatten({ inputShape: [28, 28] }));
            model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
            model.add(tf.layers.dense({ units: 10, activation: 'softmax' }));
            model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });

            await model.fit(data.xs, data.ys, {
                epochs: 10,
                batchSize: 32,
                shuffle: true,
                callbacks: {
                    onEpochEnd: (epoch, logs) => console.log(`Epoch ${epoch}: loss = ${logs.loss}`)
                }
            });

            await model.save('localstorage://my-model');
            alert('Модель обучена и сохранена!');
        }

        modelReady = true; // Устанавливаем флаг в true после обучения модели
    }

    trainModel();

    ///////////////////////// Распознавание /////////////////////////
};

window.recognizeNumber = function () {
    if (!modelReady) {
        alert("Модель ещё не готова");
        return;
    }

    // Преобразуем данные в форму [1, 28*28] (плоский вектор)
    const input = tf.tensor2d(grid.flat(), [1, 28 * 28]);
    model.predict(input).array().then(predictions => {
        const prediction = predictions[0];
        const maxIndex = prediction.indexOf(Math.max(...prediction));
        alert("Распознано: " + maxIndex);
    });
};
