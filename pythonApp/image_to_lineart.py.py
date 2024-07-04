# -*- coding: utf-8 -*-
"""
Created on Fri Jan 27 11:30:12 2017

@author: khsk
"""

import numpy as np
import cv2 as c
import glob
import os

# 8近傍の定義
neiborhood8 = np.array([[1, 1, 1],
                        [1, 1, 1],
                        [1, 1, 1]], np.uint8)

# 出力フォルダの作成
output_dir = './output_clean_senga_color_gray/'
os.makedirs(output_dir, exist_ok=True)

for path in glob.glob('./image_train.png'):
    if (os.path.basename(path) == 'Thumbs.db'):
        continue
    img = c.imread(path, 0) # 0なしでカラー
    img_dilate = c.dilate(img, neiborhood8, iterations=1)
    img_diff = c.absdiff(img, img_dilate)
    img_diff_not = c.bitwise_not(img_diff)
    #gray = c.cvtColor(img_diff_not, c.COLOR_RGB2GRAY)

    #at = c.adaptiveThreshold(img_diff_not, 255, c.ADAPTIVE_THRESH_GAUSSIAN_C, c.THRESH_BINARY, 7, 8) # intをいい感じに調整する
    c.imwrite(os.path.dirname(path) + '_clean_senga_color_gray/' + os.path.basename(path), img_diff_not)

    # 出力ファイルのパスを作成
    output_path = os.path.join(output_dir, os.path.splitext(os.path.basename(path))[0] + '_sketch.png')
    
    # 画像の保存
    c.imwrite(output_path, img_diff_not)
    
    # 必要に応じて画像の表示
    # cv.imshow('Inverted Difference Image', img_diff_not)
    # cv.waitKey(0)

# 全てのウィンドウを破棄
c.destroyAllWindows()