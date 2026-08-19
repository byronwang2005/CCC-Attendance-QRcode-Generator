#!/usr/bin/env python3
"""Build the animated README masthead from the project's native artwork."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/assets/images/readme-hero.webp"
LOGO = ROOT / "public/assets/images/ccc-small.webp"
TITLE_FONT = ROOT / "public/assets/fonts/TsangerJinKai02-W05.ttf"
SUMMARY_FONT = ROOT / "public/assets/fonts/TsangerJinKai02-W04.ttf"

WIDTH = 1200
HEIGHT = 330
FRAME_COUNT = 90
FRAME_DURATION_MS = 50

NAVY = (27, 54, 93)
PARCHMENT = (245, 244, 237)


def fluid_background(progress: float) -> Image.Image:
    background = Image.new("RGBA", (WIDTH, HEIGHT), (*PARCHMENT, 255))
    haze = Image.new("RGBA", background.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(haze)

    left_x = 105 + 36 * math.sin(progress * math.tau)
    left_y = 150 + 18 * math.cos(progress * math.tau)
    right_x = 1035 + 44 * math.cos(progress * math.tau + 0.8)
    right_y = 130 + 25 * math.sin(progress * math.tau + 0.6)
    center_x = 610 + 70 * math.sin(progress * math.tau + 2.2)

    draw.ellipse((left_x - 300, left_y - 220, left_x + 300, left_y + 220), fill=(42, 78, 115, 25))
    draw.ellipse((right_x - 310, right_y - 230, right_x + 310, right_y + 230), fill=(166, 139, 88, 22))
    draw.ellipse((center_x - 360, 70, center_x + 360, 410), fill=(255, 255, 252, 62))
    haze = haze.filter(ImageFilter.GaussianBlur(92))
    return Image.alpha_composite(background, haze)


def load_logo_frames() -> list[Image.Image]:
    source = Image.open(LOGO)
    frames: list[Image.Image] = []
    for index in range(source.n_frames):
        source.seek(index)
        frames.append(source.convert("RGBA").copy())
    return frames


def compose_frame(index: int, logo_frames: list[Image.Image]) -> Image.Image:
    progress = index / FRAME_COUNT
    frame = fluid_background(progress)

    logo_index = round(progress * (len(logo_frames) - 1))
    logo = logo_frames[logo_index].resize((142, 121), Image.Resampling.LANCZOS)
    logo_alpha = 0.94 + 0.06 * math.sin(progress * math.tau - math.pi / 2)
    logo.putalpha(logo.getchannel("A").point(lambda value: round(value * logo_alpha)))
    frame.alpha_composite(logo, (255, 104))

    draw = ImageDraw.Draw(frame)
    title_font = ImageFont.truetype(str(TITLE_FONT), 66)
    summary_font = ImageFont.truetype(str(SUMMARY_FONT), 31)
    draw.text((435, 91), "CCC Attendance", font=title_font, fill=(*NAVY, 255), stroke_width=0)
    draw.text((438, 181), "一个签到码，三步搞定", font=summary_font, fill=(45, 70, 102, 242))
    return frame.convert("RGB")


def main() -> None:
    logo_frames = load_logo_frames()
    frames = [compose_frame(index, logo_frames) for index in range(FRAME_COUNT)]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        OUTPUT,
        format="WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=FRAME_DURATION_MS,
        loop=0,
        quality=82,
        method=6,
        minimize_size=True,
    )
    print(f"Built {OUTPUT.relative_to(ROOT)} ({WIDTH}x{HEIGHT}, {FRAME_COUNT} frames)")


if __name__ == "__main__":
    main()
