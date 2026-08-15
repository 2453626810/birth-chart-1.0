#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
用智谱 glm-4v 分析示意图，让 AI 标出各知识点的像素坐标
用法：python scripts/analyze_coords.py <智谱key> <图片路径> <palm|face>
"""
import sys
import base64
import json
import urllib.request

API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
MODEL = "glm-4v-flash"


def main():
    key = sys.argv[1]
    img_path = sys.argv[2]
    kind = sys.argv[3]

    with open(img_path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode()

    if kind == 'palm':
        prompt = (
            "这张图是一张手掌示意图，图片宽高都是 1024 像素，坐标原点在左上角。"
            "请逐一给出以下部位在图中的大致中心坐标，格式严格为「部位名:(x,y)」，"
            "每个一行，不要解释：\n"
            "生命线、智慧线、感情线、命运线、婚姻线、太阳线、"
            "金星丘、木星丘、土星丘、太阳丘、水星丘、火星丘、太阴丘、"
            "拇指、食指、中指、无名指、小指。"
            "如果某个部位在图上看不清或不存在，就写「部位名:无」。"
        )
    else:
        prompt = (
            "这张图是一张正面人脸示意图，图片宽高都是 1024 像素，坐标原点在左上角。"
            "请逐一给出以下部位在图中的大致中心坐标，格式严格为「部位名:(x,y)」，"
            "每个一行，不要解释：\n"
            "上停、中停、下停、眉、眼、鼻、口、耳、"
            "印堂、颧骨、人中、法令纹、地阁。"
            "如果某个部位在图上看不清，就写「部位名:无」。"
        )

    payload = {
        "model": MODEL,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": "data:image/png;base64," + b64}}
            ]
        }]
    }

    req = urllib.request.Request(
        API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + key}
    )
    print("正在分析", img_path, "…")
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    print("========== 坐标结果 ==========")
    print(data['choices'][0]['message']['content'])


if __name__ == "__main__":
    main()
