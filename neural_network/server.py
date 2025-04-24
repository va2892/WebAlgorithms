import numpy as np
from flask import Flask, request, jsonify
from tensorflow.keras.datasets import mnist  # type: ignore
import matplotlib.pyplot as plt
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

(x_train, y_train), (x_test, y_test) = mnist.load_data()

def prepare_data():
    images = x_train.reshape(60000, 28*28) / 255.0
    labels = y_train

    ind = np.arange(60000)
    np.random.shuffle(ind) 
    images = images[ind]
    labels = labels[ind]
    
    one_hot_labels = np.zeros((len(labels), 10))
    for i, l in enumerate(labels):
        one_hot_labels[i][l] = 1
    
    return images, one_hot_labels

def relu(x):
    return np.maximum(0, x)

def relu2deriv(x):
    return (x > 0).astype(float)

def softmax(x):
    temp = np.exp(x)
    return temp / np.sum(temp, axis=1, keepdims=True)

class NeuralNetwork:
    def __init__(self):
        np.random.seed(1)
        self.alpha = 0.05
        self.batch_size = 100
        self.images, self.labels = prepare_data()
        self.input_layer = 784
        self.hidden_size = 100

        if os.path.exists('weights_0_1.npy') and os.path.exists('weights_1_2.npy'):
            print("Загружаем сохраненные веса...")
            self.weights_0_1 = np.load('weights_0_1.npy')
            self.weights_1_2 = np.load('weights_1_2.npy')
            self.is_trained = True  
        else:
            print("Сохраненных весов нет, инициализируем случайные...")
            self.weights_0_1 = 0.02 * np.random.random((self.input_layer, self.hidden_size)) - 0.01
            self.weights_1_2 = 0.2 * np.random.random((self.hidden_size, 10)) - 0.1
            self.is_trained = False  
    
    def train(self, iterations = 500):

        if self.is_trained:
            test_correct = 0
            test_images = x_test.reshape(len(x_test), 28*28) / 255.0
            for i in range(len(x_test)): 
                layer_0 = test_images[i:i+1]
                layer_1 = relu(np.dot(layer_0, self.weights_0_1))
                layer_2 = np.dot(layer_1, self.weights_1_2)
                test_correct += int(np.argmax(layer_2) == y_test[i])
            
            return test_correct / len(x_test)
        
        for j in range(iterations):
            correct_cnt = 0
            for i in range(int(len(self.images) / self.batch_size)):
                batch_start = i * self.batch_size
                batch_end = (i+1) * self.batch_size
                
                layer_0 = self.images[batch_start:batch_end]
                layer_1 = relu(np.dot(layer_0, self.weights_0_1))

                dropout_mask = np.random.randint(2, size=layer_1.shape)

                layer_1 *= dropout_mask * 2
                layer_2 = softmax(np.dot(layer_1, self.weights_1_2))

                for k in range(self.batch_size):
                    correct_cnt += int(np.argmax(layer_2[k:k+1]) == np.argmax(self.labels[batch_start+k:batch_start+k+1]))
                
                layer_2_delta = (self.labels[batch_start:batch_end] - layer_2) / (self.batch_size * layer_2.shape[0])
                layer_1_delta = layer_2_delta.dot(self.weights_1_2.T) * relu2deriv(layer_1)
                layer_1_delta *= dropout_mask
                
                self.weights_1_2 += self.alpha * layer_1.T.dot(layer_2_delta)
                self.weights_0_1 += self.alpha * layer_0.T.dot(layer_1_delta)

            if (j % 10 == 0):
                test_correct = 0
                test_images = x_test.reshape(len(x_test), 28*28) / 255.0
                for i in range(len(test_images)):
                    layer_0 = test_images[i:i+1]
                    layer_1 = relu(np.dot(layer_0, self.weights_0_1))
                    layer_2 = softmax(np.dot(layer_1, self.weights_1_2))
                    test_correct += int(np.argmax(layer_2) == y_test[i])
                
                test_acc = test_correct / float(len(test_images))
                print("Iteration: " + str(j) + " Train-acc: " + str(correct_cnt / float(len(self.images))) + " Test-acc: " + str(test_acc))

        np.save('weights_0_1.npy', self.weights_0_1)
        np.save('weights_1_2.npy', self.weights_1_2)
        self.is_trained = True
        print("Обучение завершено, веса сохранены.")

        test_correct = 0
        test_images = x_test.reshape(len(x_test), 28*28) / 255.0
        for i in range(len(x_test)): 
            layer_0 = test_images[i:i+1]
            layer_1 = relu(np.dot(layer_0, self.weights_0_1))
            layer_2 = softmax(np.dot(layer_1, self.weights_1_2))
            test_correct += int(np.argmax(layer_2) == y_test[i])
        
        return test_correct / len(x_test)

nn = NeuralNetwork()

@app.route('/recognize', methods=['POST'])
def recognize():
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({"error": "No image data"}), 400
        

        pixels = np.array(data['image'], dtype=np.float32)
        img_array = pixels.reshape(1, 784) 

        layer_1 = relu(np.dot(img_array, nn.weights_0_1))
        layer_2 = softmax(np.dot(layer_1, nn.weights_1_2))
        
        return jsonify({
            'prediction': int(np.argmax(layer_2)),
            'confidence': float(np.max(layer_2)),
            'probabilities': layer_2[0].tolist()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/train', methods=['GET'])  
def train():
    accuracy = nn.train()
    return jsonify({
        'status': 'Model trained!',
        'accuracy': accuracy
    })

if __name__ == '__main__':
    app.run()