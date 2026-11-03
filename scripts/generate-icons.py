#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""生成 PWA 图标 img/icon-192.png 与 img/icon-512.png（哑铃徽标）。

用法：python scripts/generate-icons.py
依赖：Pillow（本机已随 DSH 运行时提供）
"""
from __future__ import annotations

import os
import sys

try:
    from PIL import Image, ImageDraw
except ImportError:  # pragma: no cover
    print("需要 Pillow：pip install Pillow", file=sys.stderr)
    raise SystemExit(1)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "img")

GREEN = (14, 159, 110, 255)
GREEN_DARK = (11, 128, 88, 255)
WHITE = (255, 255, 255, 255)


def draw_icon(size: int) -> "Image.Image":
    scale = 4  # 先画大图再缩小，得到平滑边缘
    W = size * scale
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    radius = int(W * 0.22)
    d.rounded_rectangle([0, 0, W - 1, W - 1], radius=radius, fill=GREEN)

    # 哑铃：中间横杆 + 两侧配重块
    bar_w = int(W * 0.46)
    bar_h = int(W * 0.075)
    cx, cy = W // 2, W // 2
    d.rounded_rectangle(
        [cx - bar_w // 2, cy - bar_h // 2, cx + bar_w // 2, cy + bar_h // 2],
        radius=bar_h // 2,
        fill=WHITE,
    )

    plate_w = int(W * 0.10)
    plate_h = int(W * 0.34)
    plate_r = int(W * 0.035)
    gap = int(W * 0.02)
    for sign in (-1, 1):
        # 内侧大配重
        x0 = cx + sign * (bar_w // 2) - (plate_w if sign > 0 else 0)
        if sign < 0:
            x0 = cx - bar_w // 2 - plate_w
        d.rounded_rectangle(
            [x0, cy - plate_h // 2, x0 + plate_w, cy + plate_h // 2],
            radius=plate_r,
            fill=WHITE,
        )
        # 外侧小配重
        x1 = x0 - gap - int(plate_w * 0.72) if sign < 0 else x0 + plate_w + gap
        small_h = int(plate_h * 0.72)
        d.rounded_rectangle(
            [x1, cy - small_h // 2, x1 + int(plate_w * 0.72), cy + small_h // 2],
            radius=plate_r,
            fill=WHITE,
        )

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    for size in (192, 512):
        path = os.path.join(OUT_DIR, f"icon-{size}.png")
        draw_icon(size).save(path, "PNG", optimize=True)
        print(f"已生成 {path} ({os.path.getsize(path)} 字节)")


if __name__ == "__main__":
    main()