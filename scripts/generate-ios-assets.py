"""Render the original Mosslight pixel mascot into native asset catalogs.

Requires Pillow (only for regeneration; not needed by Xcode Cloud).
The app icon is opaque RGB, with no pre-rendered iOS rounded corners.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "ios/App/App/Assets.xcassets"


def mascot(draw, origin, unit):
    ox, oy = origin

    def polygon(points, color):
        draw.polygon([(ox + x * unit, oy + y * unit) for x, y in points], fill=color)

    def rect(box, color):
        x1, y1, x2, y2 = box
        draw.rectangle((ox + x1 * unit, oy + y1 * unit,
                        ox + x2 * unit - 1, oy + y2 * unit - 1), fill=color)

    polygon([(15, 31), (20, 31), (20, 21), (44, 21), (44, 31),
             (49, 31), (49, 50), (15, 50)], "#b4db74")
    polygon([(31, 22), (31, 11), (43, 11), (43, 17),
             (36, 17), (36, 22)], "#e9bd65")
    rect((24, 33, 28, 39), "#193e34")
    rect((37, 33, 41, 39), "#193e34")
    rect((28, 44, 37, 47), "#193e34")


icon = Image.new("RGB", (1024, 1024), "#193e34")
mascot(ImageDraw.Draw(icon), (0, 0), 16)
icon.save(ASSETS / "AppIcon.appiconset/AppIcon-512@2x.png", optimize=True)

splash = Image.new("RGB", (2732, 2732), "#193e34")
mascot(ImageDraw.Draw(splash), (1110, 1110), 8)
for filename in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
    splash.save(ASSETS / "Splash.imageset" / filename, optimize=True)
print("Generated opaque iOS app icon and launch artwork.")
