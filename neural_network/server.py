import numpy as np
from flask import Flask, request, jsonify
from tensorflow.keras.datasets import mnist  # type: ignore
from tensorflow.keras.preprocessing.image import ImageDataGenerator # type:ignore
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

(x_train, y_train), (x_test, y_test) = mnist.load_data()

def center_image(image):
    image_2d = image.reshape(28, 28)
    y_indices, x_indices = np.indices(image_2d.shape)

    total = np.sum(image_2d)

    center_x = np.sum(x_indices * image_2d) / total
    center_y = np.sum(y_indices * image_2d) / total
    
    shift_x = np.round(14 - center_x).astype(int)
    shift_y = np.round(14 - center_y).astype(int)
    
    centered = np.roll(image_2d, shift_y, axis=0)
    centered = np.roll(centered, shift_x, axis=1)
    
    if shift_y > 0:
        centered[:shift_y, :] = 0
    elif shift_y < 0:
        centered[shift_y:, :] = 0
    
    if shift_x > 0:
        centered[:, :shift_x] = 0
    elif shift_x < 0:
        centered[:, shift_x:] = 0
    
    return centered.reshape(784)

def prepare_data():
    images = x_train.reshape(60000, 28*28) / 255.0
    labels = y_train

    datagen = ImageDataGenerator(
            rotation_range = 13,      
            width_shift_range = 0.13,
            height_shift_range = 0.13, 
            zoom_range = 0.13,        
            shear_range = 0.13,       
            fill_mode='nearest'    
        )

    augmented_images = []
    augmented_labels = []

    for x, y in zip(images, labels):
        x_reshaped = x.reshape(28, 28, 1)
        x_aug = datagen.random_transform(x_reshaped)  
        x_aug = x_aug.reshape(-1)
        x_aug = np.clip(x_aug, 0.0, 1.0)
        augmented_images.append(x_aug)
        augmented_labels.append(y)

    images = np.concatenate([images, augmented_images], axis=0)
    labels = np.concatenate([labels, augmented_labels], axis=0)

    ind = np.arange(len(images))
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

def initialize_weights(input_size, output_size):
    return np.random.randn(input_size, output_size) * np.sqrt(2.0 / input_size)

class NeuralNetwork:
    def __init__(self):
        np.random.seed(1)
        self.alpha = 0.1
        self.batch_size = 100
        self.images, self.labels = prepare_data()
        self.input_layer = 784
        self.hidden_size_1 = 128
        self.hidden_size_2 = 256
        self.lambda_reg = 0.0001

        if os.path.exists('weights_0_1.npy') and os.path.exists('weights_1_2.npy') and os.path.exists('weights_2_3.npy'):
            print("Загружаем сохраненные веса...")
            self.weights_0_1 = np.load('weights_0_1.npy')
            self.weights_1_2 = np.load('weights_1_2.npy')
            self.weights_2_3 = np.load('weights_2_3.npy')
            self.is_trained = True  
        else:
            print("Сохраненных весов нет, инициализируем случайные...")
            self.weights_0_1 = initialize_weights(self.input_layer, self.hidden_size_1)
            self.weights_1_2 = initialize_weights(self.hidden_size_1, self.hidden_size_2)
            self.weights_2_3 = np.random.randn(self.hidden_size_2, 10) * 0.01
            self.is_trained = False  
    
    def train(self, iterations = 500):

        if self.is_trained:
            test_correct = 0
            test_images = x_test.reshape(len(x_test), 28*28) / 255.0
            for i in range(len(x_test)): 
                layer_0 = test_images[i:i+1]
                layer_1 = relu(np.dot(layer_0, self.weights_0_1))
                layer_2 = relu(np.dot(layer_1, self.weights_1_2))
                layer_3 = softmax(np.dot(layer_2, self.weights_2_3))
                test_correct += int(np.argmax(layer_3) == y_test[i])
            
            return test_correct / len(x_test)
        no_improve = 0
        best_accuracy = 0
        for j in range(iterations):
            correct_cnt = 0
            for i in range(int(len(self.images) / self.batch_size)):
                batch_start = i * self.batch_size
                batch_end = (i+1) * self.batch_size
                
                layer_0 = self.images[batch_start:batch_end]
                layer_1 = relu(np.dot(layer_0, self.weights_0_1))
                dropout_mask_1 = (np.random.rand(*layer_1.shape) > 0.2).astype(float)
                layer_1 *= dropout_mask_1 / 0.8

                layer_2 = relu(np.dot(layer_1, self.weights_1_2))
                dropout_mask_2 = (np.random.rand(*layer_2.shape) > 0.2).astype(float)
                layer_2 *= dropout_mask_2 / 0.8

                layer_3 = softmax(np.dot(layer_2, self.weights_2_3))

                for k in range(self.batch_size):
                    correct_cnt += int(np.argmax(layer_3[k:k+1]) == np.argmax(self.labels[batch_start+k:batch_start+k+1]))
                
                layer_3_delta = (self.labels[batch_start:batch_end] - layer_3) / self.batch_size

                layer_2_delta = layer_3_delta.dot(self.weights_2_3.T) * relu2deriv(layer_2)
                layer_2_delta *= dropout_mask_2

                layer_1_delta = layer_2_delta.dot(self.weights_1_2.T) * relu2deriv(layer_1)
                layer_1_delta *= dropout_mask_1
                
                self.weights_2_3 += self.alpha * (layer_2.T.dot(layer_3_delta) - self.lambda_reg * self.weights_2_3)
                self.weights_1_2 += self.alpha * (layer_1.T.dot(layer_2_delta) - self.lambda_reg * self.weights_1_2)
                self.weights_0_1 += self.alpha * (layer_0.T.dot(layer_1_delta) - self.lambda_reg * self.weights_0_1)

            if (j % 10 == 0):
                test_correct = 0
                test_images = x_test.reshape(len(x_test), 28*28) / 255.0
                for i in range(len(test_images)):
                    layer_0 = test_images[i:i+1]
                    layer_1 = relu(np.dot(layer_0, self.weights_0_1))
                    layer_2 = relu(np.dot(layer_1, self.weights_1_2))
                    layer_3 = softmax(np.dot(layer_2, self.weights_2_3))
                    test_correct += int(np.argmax(layer_3) == y_test[i])
                
                test_acc = test_correct / float(len(test_images))
                print("Iteration: " + str(j) + " Train-acc: " + str(correct_cnt / float(len(self.images))) + " Test-acc: " + str(test_acc))
                if test_acc > best_accuracy:
                    best_accuracy = test_acc
                    no_improve = 0
                else:
                    no_improve += 1
                    if no_improve >= 5: 
                        print("Пошло переобучение, завершаем обучение")
                        break

        np.save('weights_0_1.npy', self.weights_0_1)
        np.save('weights_1_2.npy', self.weights_1_2)
        np.save('weights_2_3.npy', self.weights_2_3)
        self.is_trained = True
        print("Обучение завершено, веса сохранены.")

        test_correct = 0
        test_images = x_test.reshape(len(x_test), 28*28) / 255.0
        for i in range(len(x_test)): 
            layer_0 = test_images[i:i+1]
            layer_1 = relu(np.dot(layer_0, self.weights_0_1))
            layer_2 = relu(np.dot(layer_1, self.weights_1_2))
            layer_3 = softmax(np.dot(layer_2, self.weights_2_3))
            test_correct += int(np.argmax(layer_3) == y_test[i])
        
        return test_correct / len(x_test)

nn = NeuralNetwork()

@app.route('/recognize', methods=['POST'])
def recognize():
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({"error": "No image data"}), 400
        
        if not nn.is_trained:
            return jsonify({"error": "Model is not trained"}), 500

        pixels = np.array(data['image'], dtype=np.float32)

        centered_image = center_image(pixels)
        img_array = centered_image.reshape(1, 784) 

        layer_1 = relu(np.dot(img_array, nn.weights_0_1))
        layer_2 = relu(np.dot(layer_1, nn.weights_1_2))
        layer_3 = softmax(np.dot(layer_2, nn.weights_2_3))
        
        return jsonify({
            'prediction': int(np.argmax(layer_3)),
            'confidence': float(np.max(layer_3)),
            'probabilities': layer_3[0].tolist()
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