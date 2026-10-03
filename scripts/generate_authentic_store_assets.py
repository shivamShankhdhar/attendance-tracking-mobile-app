import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 2400
OUT_DIR = '/Users/shivamshankhdhar/Projects/attendance-tracker-full-stack/frontend/store-assets/screenshots'
FEAT_DIR = '/Users/shivamshankhdhar/Projects/attendance-tracker-full-stack/frontend/store-assets/feature-graphic'
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(FEAT_DIR, exist_ok=True)

try:
    font_badge = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 26)
    font_header_title = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 62)
    font_header_sub = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 32)
    font_brand = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 34)
    font_body_bold = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 28)
    font_body = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 24)
except Exception:
    font_badge = font_header_title = font_header_sub = font_brand = font_body_bold = font_body = ImageFont.load_default()

def draw_rounded_rect(draw, bbox, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(bbox, radius=radius, fill=fill, outline=outline, width=width)

def create_base_canvas(badge_text, title, subtitle, bg_color=(245, 247, 238)):
    img = Image.new('RGB', (W, H), bg_color)
    
    # Soft ambient glow
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ov_draw = ImageDraw.Draw(overlay)
    ov_draw.ellipse([W - 350, -120, W + 350, 580], fill=(225, 236, 210, 180))
    ov_draw.ellipse([-220, 260, 380, 860], fill=(234, 242, 220, 140))
    img.paste(Image.alpha_composite(Image.new('RGBA', (W, H), bg_color + (255,)), overlay).convert('RGB'), (0, 0))
    
    draw = ImageDraw.Draw(img)
    
    # 1. Badge Pill
    badge_w = draw.textlength(badge_text, font=font_badge) + 40
    badge_h = 50
    badge_x = 75
    badge_y = 110
    draw_rounded_rect(draw, [badge_x, badge_y, badge_x + badge_w, badge_y + badge_h], 25, fill=(235, 242, 226), outline=(205, 218, 190), width=2)
    draw.text((badge_x + 20, badge_y + 11), badge_text, fill=(58, 92, 38), font=font_badge)
    
    # 2. Main Title
    y_cursor = 195
    draw.text((75, y_cursor), title, fill=(27, 34, 16), font=font_header_title)
    
    # 3. Subtitle
    y_cursor += 78
    draw.text((75, y_cursor), subtitle, fill=(107, 122, 90), font=font_header_sub)
    
    return img

def add_device_mockup(canvas, screen_img, y_top=440):
    dev_w = 930
    dev_h = 1960
    dev_x = (W - dev_w) // 2
    dev_y = y_top

    # Soft drop shadow
    shadow = Image.new('RGBA', (W, H), (0,0,0,0))
    s_draw = ImageDraw.Draw(shadow)
    s_draw.rounded_rectangle([dev_x - 12, dev_y + 16, dev_x + dev_w + 12, dev_y + dev_h + 30], radius=68, fill=(25, 38, 15, 60))
    shadow = shadow.filter(ImageFilter.GaussianBlur(26))
    
    canvas_rgba = canvas.convert('RGBA')
    canvas_rgba = Image.alpha_composite(canvas_rgba, shadow)

    draw = ImageDraw.Draw(canvas_rgba)
    # Device frame bezel (sleek titanium finish)
    draw.rounded_rectangle([dev_x, dev_y, dev_x + dev_w, dev_y + dev_h], radius=64, fill=(255, 255, 255), outline=(215, 225, 205), width=8)

    bezel = 12
    scr_x = dev_x + bezel
    scr_y = dev_y + bezel
    scr_w = dev_w - (bezel * 2)
    scr_h = dev_h - (bezel * 2)

    # Scale the screen image to fit width
    ratio = scr_w / screen_img.width
    target_h = int(screen_img.height * ratio)
    resized_screen = screen_img.resize((scr_w, target_h), Image.Resampling.LANCZOS)

    if target_h >= scr_h:
        cropped_screen = resized_screen.crop((0, 0, scr_w, scr_h))
    else:
        cropped_screen = Image.new('RGB', (scr_w, scr_h), (248, 249, 243))
        cropped_screen.paste(resized_screen, (0, 0))

    mask = Image.new('L', (scr_w, scr_h), 0)
    m_draw = ImageDraw.Draw(mask)
    m_draw.rounded_rectangle([0, 0, scr_w, scr_h], radius=52, fill=255)

    canvas_rgba.paste(cropped_screen, (scr_x, scr_y), mask)

    # Dynamic island
    island_w = 160
    island_h = 30
    island_x = scr_x + (scr_w - island_w) // 2
    island_y = scr_y + 18
    dev_draw = ImageDraw.Draw(canvas_rgba)
    dev_draw.rounded_rectangle([island_x, island_y, island_x + island_w, island_y + island_h], radius=15, fill=(18, 18, 18))

    return canvas_rgba.convert('RGB')

print("Test setup initialized successfully.")
