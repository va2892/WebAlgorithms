class DigitRecognizer {
    constructor() {
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.initCanvas();
        this.setupEventListeners();
    }

    initCanvas() {
        this.logicalWidth = 50;
        this.logicalHeight = 50;
        const displaySize = 500;
        
        this.canvas.width = displaySize;
        this.canvas.height = displaySize;
        
        // Очищаем canvas белым цветом
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Настраиваем контекст рисования
        this.ctx.fillStyle = 'black';
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.brushSize = displaySize / this.logicalWidth * 1.5; // Физический размер кисти
        this.ctx.lineWidth = this.brushSize;
        this.lastX = 0;
        this.lastY = 0;
        this.isDrawing = false;
        this.scaleFactor = displaySize / this.logicalWidth; // Коэффициент масштабирования
    }

    setupEventListeners() {
        // Desktop events
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

        // Touch events
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));

        // Controls
        document.getElementById('brushSize').addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
            document.getElementById('brushSizeValue').textContent = this.brushSize;
            this.ctx.lineWidth = this.brushSize;
        });

        document.getElementById('clearBtn').addEventListener('click', this.clearCanvas.bind(this));
        document.getElementById('recognizeBtn').addEventListener('click', this.recognizeDigit.bind(this));
        document.getElementById('trainBtn').addEventListener('click', this.trainModel.bind(this));
    }

    startDrawing(e) {
        this.isDrawing = true;
        const pos = this.getPosition(e);
        this.lastX = pos.x * this.scaleFactor;
        this.lastY = pos.y * this.scaleFactor;
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        e.preventDefault();
        const pos = this.getPosition(e);
        const physicalX = pos.x * this.scaleFactor;
        const physicalY = pos.y * this.scaleFactor;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(physicalX, physicalY);
        this.ctx.stroke();
        
        this.lastX = physicalX;
        this.lastY = physicalY;
    }

    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.startDrawing(mouseEvent);
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.draw(mouseEvent);
    }

    stopDrawing() {
        this.isDrawing = false;
    }

    getPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const physicalX = e.clientX - rect.left;
        const physicalY = e.clientY - rect.top;
        
        return {
            x: (physicalX / rect.width) * this.logicalWidth,
            y: (physicalY / rect.height) * this.logicalHeight
        };
    }

    clearCanvas() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        document.getElementById('prediction').textContent = '—';
        document.getElementById('confidenceValue').textContent = '0%';
        document.querySelector('.confidence-fill').style.width = '0%';
        document.getElementById('probabilities').innerHTML = '';
    }

    hasDrawing() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
        for (let i = 0; i < imageData.length; i += 4) {
            if (imageData[i] > 0) return true;
        }
        return false;
    }

    // ???????????
    

    async recognizeDigit() {
        try {
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 28;
            tempCanvas.height = 28;
            const tempCtx = tempCanvas.getContext('2d');
            
            tempCtx.drawImage(this.canvas, 0, 0, 28, 28);
            
            const imgData = tempCtx.getImageData(0, 0, 28, 28).data;
            const pixels = [];
            
            for (let i = 0; i < imgData.length; i += 4) {

                const value = imgData[i];
                pixels.push((255 - value) / 255);
            }

            console.log('Pixel vector:', pixels);
            console.log('Vector length:', pixels.length);

            const response = await fetch('http://localhost:5000/recognize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors',
                body: JSON.stringify({ image: pixels })
            });
            
            
            const result = await response.json();
            this.updatePredictionUI(result);
        } catch (error) {
            console.error('Ошибка распознавания:', error);
            alert('Ошибка соединения с сервером. Убедитесь, что сервер запущен.');
        }
    }

    async trainModel() {
        try {
            const trainBtn = document.getElementById('trainBtn');
            trainBtn.disabled = true;
            trainBtn.textContent = 'Обучение...';
            
            const response = await fetch('http://localhost:5000/train', {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const result = await response.json();
            console.log('Обучение завершено:', result);
            alert(`Модель обучена! Точность: ${(result.accuracy * 100).toFixed(1)}%`);
        } catch (error) {
            console.error('Ошибка обучения:', error);
            alert('Ошибка при обучении модели: ' + error.message);
        } finally {
            const trainBtn = document.getElementById('trainBtn');
            trainBtn.disabled = false;
            trainBtn.textContent = 'Обучить модель';
        }
    }

    updatePredictionUI(result) {
    if (!result || !result.probabilities) {
        console.error('Некорректный ответ сервера:', result);
        alert('Ошибка обработки результата');
        return;
    }
    document.getElementById('prediction').textContent = result.prediction;
    const confidencePercent = Math.round(result.confidence * 100);
    document.getElementById('confidenceValue').textContent = `${confidencePercent}%`;
    document.querySelector('.confidence-fill').style.width = `${confidencePercent}%`;
    
    const container = document.getElementById('probabilities');
    container.innerHTML = '';
    
    result.probabilities.forEach((prob, digit) => {
        const probPercent = Math.round(prob * 100);
        const item = document.createElement('div');
        item.className = 'probability-item';
        item.innerHTML = `
            <div class="probability-digit">${digit}</div>
            <div class="probability-bar">
                <div class="probability-fill" style="width: ${probPercent}%"></div>
            </div>
            <div class="probability-value">${probPercent}%</div>
        `;
        container.appendChild(item);
    });
}
}

document.addEventListener('DOMContentLoaded', () => {
    new DigitRecognizer();
});