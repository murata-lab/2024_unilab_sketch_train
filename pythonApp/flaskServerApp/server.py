from flask import Flask, request, jsonify
from PIL import Image, ImageDraw
import cv2
import numpy as np
from skimage.feature import hog
import logging
import pyperclip

app = Flask(__name__)

blue_drawing_data_list = []
red_drawing_data_list = []
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

SAMPLE_IMAGE_PATH_1 = 'sinkansenn.png'
SAMPLE_IMAGE_PATH_2 = 'sinkansenn2.png'
SAMPLE_IMAGE_PATH_2 = 'sinkansenn3.png'
SAMPLE_IMAGE_PATH = SAMPLE_IMAGE_PATH_2

@app.route('/draw', methods=['POST'])
def receive_drawing_data():
    try:
        data = request.get_json()
        blue_button_color = data.get('blueButtonColor', None)
        if data and 'currentX' in data and 'currentY' in data:
            if data['currentX'] != 0 or data['currentY'] != 0:
                # 座標データを反転させて保存
                data['previousY'] = 500 - data['previousY']
                data['currentY'] = 500 - data['currentY']
                if blue_button_color == 'blue':
                    blue_drawing_data_list.append({
                        **data,
                    })
                else:
                    red_drawing_data_list.append({
                        **data,
                })
            return jsonify({"message": "Data received successfully"}), 200
        else:
            return jsonify({"error": "Invalid data format"}), 400
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/save', methods=['POST'])
def save_sketch():
    try:
        data = request.get_json()

        width, height = 500, 500
        image_blue = Image.new('RGB', (width, height), 'white')
        image_red = Image.new('RGB', (width, height), 'white')
        draw_blue = ImageDraw.Draw(image_blue)
        draw_red = ImageDraw.Draw(image_red)

        for data in blue_drawing_data_list:
            draw_blue.line([(data['previousX'], data['previousY']), (data['currentX'], data['currentY'])], fill='black', width=2)

        for data in red_drawing_data_list:
            draw_red.line([(data['previousX'], data['previousY']), (data['currentX'], data['currentY'])], fill='black', width=2)

        image_blue_path = 'sketch_blue.png'
        image_red_path = 'sketch_red.png'
        image_blue.save(image_blue_path)
        image_red.save(image_red_path)

        generated_img_blue = cv2.imread(image_blue_path)
        if generated_img_blue is None:
            raise ValueError(f"Failed to load image at path: {image_blue_path}")

        generated_img_red = cv2.imread(image_red_path)
        if generated_img_red is None:
            raise ValueError(f"Failed to load image at path: {image_red_path}")

        sample_img = cv2.imread(SAMPLE_IMAGE_PATH)
        if sample_img is None:
            raise ValueError("Failed to load sample image")

        hog_generated_blue = extract_hog(generated_img_blue)
        hog_generated_red = extract_hog(generated_img_red)
        hog_sample = extract_hog(sample_img)
        similarity_blue = calculate_similarity(hog_generated_blue, hog_sample)
        similarity_red = calculate_similarity(hog_generated_red, hog_sample)

        blue_similarity_percentage = (similarity_blue * similarity_blue * 1000)
        red_similarity_percentage = (similarity_red * similarity_red * 1000)
        similarity_difference_percentage = blue_similarity_percentage - red_similarity_percentage
        print(f"ブルーチームの類似度: {blue_similarity_percentage:.2f}%")
        print(f"レッドチームの類似度: {red_similarity_percentage:.2f}%")
        print(f"ブルーチームとレッドチームの類似度の差分: {similarity_difference_percentage:.2f}%")
        pyperclip.copy(-similarity_difference_percentage)

        return jsonify({
            "message": "Sketch saved successfully",
            "similarity_blue": blue_similarity_percentage,
            "similarity_red": red_similarity_percentage,
        }), 200
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/clear', methods=['POST'])
def clear_data():
    try:
        data = request.get_json()
        button_color = data.get('buttonColor', None)

        global blue_drawing_data_list, red_drawing_data_list
        if button_color == 'blue':
            blue_drawing_data_list = []
            print("Blue drawing data cleared")
            return jsonify({"message": "Blue drawing data cleared", "blue_drawing_data_list": blue_drawing_data_list}), 200
        elif button_color == 'red':
            red_drawing_data_list = []
            print("Red drawing data cleared")
            return jsonify({"message": "Red drawing data cleared", "red_drawing_data_list": red_drawing_data_list}), 200
        else:
            blue_drawing_data_list = []
            red_drawing_data_list = []
            print("All drawing data cleared")
            return jsonify({"message": "All drawing data cleared", "blue_drawing_data_list": blue_drawing_data_list, "red_drawing_data_list": red_drawing_data_list}), 200
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

def extract_hog(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    features, _ = hog(gray, orientations=9, pixels_per_cell=(8, 8),
                      cells_per_block=(2, 2), visualize=True)
    return features
def calculate_similarity(hog1, hog2):
    norm_hog1 = np.linalg.norm(hog1)
    norm_hog2 = np.linalg.norm(hog2)

    if norm_hog1 == 0 or norm_hog2 == 0:
        return 0.0  # Return 0 similarity if any norm is zero to avoid division by zero

    similarity = np.dot(hog1, hog2) / (norm_hog1 * norm_hog2)
    return similarity
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
