from PIL import Image, ImageDraw

W, H = 1024, 768
img = Image.new("RGB", (W, H), (18, 20, 28))
draw = ImageDraw.Draw(img)

# City blocks / sidewalks
for x, y, w, h in [
    (0, 0, 220, 260),
    (0, 500, 220, 268),
    (804, 0, 220, 260),
    (804, 500, 220, 268),
    (270, 0, 190, 220),
    (565, 0, 190, 220),
    (270, 548, 190, 220),
    (565, 548, 190, 220),
]:
    draw.rectangle([x, y, x + w, y + h], fill=(40, 44, 56))
    draw.rectangle([x + 8, y + 8, x + w - 8, y + h - 8], outline=(62, 68, 84), width=1)

# Main road surfaces with shoulders
road_color = (72, 76, 88)
shoulder_color = (90, 94, 108)
draw.rectangle([0, 334, W, 434], fill=shoulder_color)  # horizontal shoulder
draw.rectangle([462, 0, 562, H], fill=shoulder_color)  # vertical shoulder
draw.rectangle([0, 340, W, 428], fill=road_color)  # horizontal asphalt
draw.rectangle([468, 0, 556, H], fill=road_color)  # vertical asphalt

# Intersection fill
draw.rectangle([468, 340, 556, 428], fill=(78, 82, 94))

# Barriers (one per direction arm, continuing through center)
barrier_color = (154, 160, 176)
draw.rectangle([510, 0, 514, H], fill=barrier_color)    # NS divider
draw.rectangle([0, 382, W, 386], fill=barrier_color)    # EW divider

# White lane markings matching simulation routes
line_white = (252, 253, 255)

# solid lane center guides (replace old yellow with white)
for x in [492, 504, 520, 532]:
    draw.line([(x, 0), (x, H)], fill=line_white, width=2)
for y in [364, 376, 392, 404]:
    draw.line([(0, y), (W, y)], fill=line_white, width=2)

# dashed separators for realism
dash_len, gap = 18, 12
for x in [486, 498, 526, 538]:
    y = 0
    while y < H:
        draw.line([(x, y), (x, min(y + dash_len, H))], fill=(232, 235, 242), width=2)
        y += dash_len + gap
for y in [358, 370, 398, 410]:
    x = 0
    while x < W:
        draw.line([(x, y), (min(x + dash_len, W), y)], fill=(232, 235, 242), width=2)
        x += dash_len + gap

# edge lines
draw.line([(0, 340), (W, 340)], fill=(248, 250, 255), width=3)
draw.line([(0, 428), (W, 428)], fill=(248, 250, 255), width=3)
draw.line([(468, 0), (468, H)], fill=(248, 250, 255), width=3)
draw.line([(556, 0), (556, H)], fill=(248, 250, 255), width=3)

# Crosswalk hints
for y in range(346, 424, 9):
    draw.rectangle([460, y, 466, y + 5], fill=(245, 245, 245))
    draw.rectangle([558, y, 564, y + 5], fill=(245, 245, 245))
for x in range(474, 552, 9):
    draw.rectangle([x, 332, x + 5, 338], fill=(245, 245, 245))
    draw.rectangle([x, 430, x + 5, 436], fill=(245, 245, 245))

# subtle asphalt texture strips (reduced intensity for cleaner readability)
for y in range(344, 426, 8):
    draw.line([(0, y), (W, y)], fill=(78, 82, 94), width=1)
for x in range(472, 554, 8):
    draw.line([(x, 0), (x, H)], fill=(78, 82, 94), width=1)

# soft highlight overlays for clearer lane readability (no geometry changes)
draw.line([(0, 384), (W, 384)], fill=(255, 255, 255), width=1)
draw.line([(512, 0), (512, H)], fill=(255, 255, 255), width=1)

img.save("public/assets/times-square-map.png")
print("Generated public/assets/times-square-map.png")
