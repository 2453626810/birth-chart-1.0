#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
用智谱 CogView 生成手相/面相示意图

用法：
    python scripts/generate_zhipu_images.py <智谱API_KEY>

或先设置环境变量 ZHIPU_API_KEY，然后不带参数运行：
    python scripts/generate_zhipu_images.py

生成结果：
    img/palm-ai.png — 手掌示意图
    img/face-ai.png  — 面部示意图
"""
import sys
import os
import json
import urllib.request

# 智谱图像生成接口（OpenAI 兼容格式）
API_URL = "https://open.bigmodel.cn/api/paas/v4/images/generations"
# 免费/便宜的图像生成模型
MODEL = "cogview-3-flash"
# 图片尺寸（cogview-3-flash 免费版支持 1024x1024；若换付费版 cogview-3 可用竖版 768x1344）
SIZE = "1024x1024"


def generate_image(api_key, prompt, out_path):
    """调用 CogView 生成图片并下载到本地"""
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "size": SIZE
    }
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + api_key
        }
    )
    print("正在生成：", out_path, "…")
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    # 响应格式：{"data": [{"url": "https://..."}]}
    url = data["data"][0]["url"]
    urllib.request.urlretrieve(url, out_path)
    print("已保存：", out_path)


def main():
    # 从命令行参数或环境变量读取 key
    api_key = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("ZHIPU_API_KEY")
    if not api_key:
        print("错误：请提供智谱 API Key（作为参数，或设置 ZHIPU_API_KEY 环境变量）")
        sys.exit(1)

    # 手掌示意图：掌心朝上、五指张开、掌纹清晰，便于后续叠加 SVG 热区
    palm_prompt = (
        "一张清晰的手掌示意图，右手掌心朝上，手掌竖直，五指向上自然张开，"
        "掌纹清晰可见：生命线（从虎口绕过大拇指根部的弧线）、智慧线（手掌中部横线）、"
        "感情线（手掌上部横线）。线条简洁清晰，白色背景，医学解剖图解风格，"
        "无任何文字标注，比例准确。"
    )

    # 面部示意图：正面、五官清晰，便于后续叠加 SVG 热区
    face_prompt = (
        "一张正面人脸示意图，五官端正，额头（上停）、眉眼鼻（中停）、口下巴（下停）"
        "三部分比例匀称。眉、眼、鼻、口、耳清晰可辨。线条简洁清晰，白色背景，"
        "医学解剖图解风格，无任何文字标注，比例准确。"
    )

    generate_image(api_key, palm_prompt, "img/palm-ai.png")
    generate_image(api_key, face_prompt, "img/face-ai.png")
    print("全部完成！")


if __name__ == "__main__":
    main()
