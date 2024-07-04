from flask import Flask, request, jsonify
from PIL import Image, ImageDraw
import cv2
import numpy as np
from skimage.feature import hog
import logging

app = Flask(__name__)

drawing_data_list = []
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

drawing_data_list = []

@app.route('/draw', methods=['POST'])
def receive_drawing_data():
    try:
        data = request.get_json()
        if data and 'currentX' in data and 'currentY' in data:
            if data['currentX'] != 0 or data['currentY'] != 0:
                # 座標データを反転させて保存
                data['previousY'] = 500 - data['previousY']
                data['currentY'] = 500 - data['currentY']
                drawing_data_list.append(data)
                # print(f"Received drawing data: {data}")
            return jsonify({"message": "Data received successfully"}), 200
        else:
            return jsonify({"error": "Invalid data format"}), 400
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

# @app.route('/save', methods=['POST'])
# def save_sketch():
#     try:
#         width, height = 500, 500
#         image = Image.new('RGB', (width, height), 'white')
#         draw = ImageDraw.Draw(image)

#         for data in drawing_data_list:
#             previous_y = height - data['previousY']
#             current_y = height - data['currentY']
#             draw.line([(data['previousX'], previous_y), (data['currentX'], current_y)], fill='black', width=2)

#         image.save('sketch.png')
#         print("Sketch saved as sketch.png")
#         return jsonify({"message": "Sketch saved successfully"}), 200
#     except Exception as e:
#         print(f"Error: {e}")
#         return jsonify({"error": str(e)}), 500

@app.route('/save', methods=['POST'])
def save_sketch():
    try:
        width, height = 500, 500
        image = Image.new('RGB', (width, height), 'white')
        draw = ImageDraw.Draw(image)

        for data in drawing_data_list:
            draw.line([(data['previousX'], data['previousY']), (data['currentX'], data['currentY'])], fill='black', width=2)

        image_path = 'sketch.png'
        image.save(image_path)
        # print("Sketch saved as sketch.png")

        # 生成された画像とサンプル画像の類似度を計算
        generated_img = cv2.imread(image_path)
        sample_img = cv2.imread('image3.png')
        hog_generated = extract_hog(generated_img)
        hog_sample = extract_hog(sample_img)
        similarity = calculate_similarity(hog_generated, hog_sample)
        print(f"Similarity: {similarity}")

        return jsonify({"message": "Sketch saved successfully", "similarity": similarity}), 200
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/clear', methods=['POST'])
def clear_data():
    try:
        global drawing_data_list
        drawing_data_list = []
        print("Drawing data cleared")
        return jsonify({"message": "Drawing data cleared"}), 200
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500
def extract_hog(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    features, _ = hog(gray, orientations=9, pixels_per_cell=(8, 8),
                      cells_per_block=(2, 2), visualize=True)
    return features
def calculate_similarity(hog1, hog2):
    # コサイン類似度の計算
    similarity = np.dot(hog1, hog2) / (np.linalg.norm(hog1) * np.linalg.norm(hog2))
    return similarity
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
