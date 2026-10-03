import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1024, 500
FEAT_DIR = '/Users/shivamshankhdhar/Projects/attendance-tracker-full-stack/frontend/store-assets/feature-graphic'
RAW_DIR = '/Users/shivamshankhdhar/Projects/attendance-tracker-full-stack/frontend/store-assets/raw_captures'
ASSETS_DIR = '/Users/shivamshankhdhar/Projects/attendance-tracker-full-stack/frontend/assets/images'
ICON_PATH = '/Users/shivamshankhdhar/Projects/attendance-tracker-full-stack/frontend/store-assets/icon/bizora_store_icon_512x512.png'

try:
    font_badge = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 15)
    font_brand = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 24)
    font_title = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 35)
    font_sub = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 17)
    font_bullet_title = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 17)
    font_bullet_sub = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 14)
    font_pill = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 14)
    font_float_title = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 15)
    font_float_stat = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 24)
except Exception:
    font_badge = font_brand = font_title = font_sub = font_bullet_title = font_bullet_sub = font_pill = font_float_title = font_float_stat = ImageFont.load_default()

def get_rounded_mask(size, radius):
    mask = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), size], radius=radius, fill=255)
    return mask

def draw_rounded_rect(draw, bbox, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(bbox, radius=radius, fill=fill, outline=outline, width=width)

# 1. Base Gradient Canvas
img = Image.new('RGB', (W, H), (14, 28, 12))
draw = ImageDraw.Draw(img)

# Radial Lighting Glow
glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
g_draw = ImageDraw.Draw(glow)
g_draw.ellipse([540, -80, 1150, 580], fill=(35, 75, 28, 140))
g_draw.ellipse([-150, -100, 450, 400], fill=(25, 55, 20, 100))
img.paste(Image.alpha_composite(Image.new('RGBA', (W, H), (14, 28, 12, 255)), glow).convert('RGB'), (0, 0))
draw = ImageDraw.Draw(img)

# 2. Left Column: Branding and Feature Copy
# Brand Header
if os.path.exists(ICON_PATH):
    icon_raw = Image.open(ICON_PATH).convert('RGBA')
    icon_resized = icon_raw.resize((56, 56), Image.Resampling.LANCZOS)
    icon_mask = get_rounded_mask((56, 56), 15)
    img.paste(icon_resized, (48, 38), icon_mask)
    draw.rounded_rectangle([47, 37, 105, 95], radius=16, outline=(255, 255, 255, 70), width=1)

draw.text((118, 41), "MODERN WORKFORCE & ATTENDANCE", fill=(245, 195, 75), font=font_badge)
draw.text((118, 63), "BIZORA", fill=(255, 255, 255), font=font_brand)

# Main Title & Subtitle (strictly kept under x=520)
draw.text((48, 114), "Smart Attendance &", fill=(255, 255, 255), font=font_title)
draw.text((48, 154), "Team Tracking", fill=(255, 255, 255), font=font_title)
draw.text((48, 202), "Eliminate paper registers, punch clocks and", fill=(175, 195, 168), font=font_sub)
draw.text((48, 226), "costly biometric hardware.", fill=(175, 195, 168), font=font_sub)

# 3 Feature Checkpoints
bullets = [
    ("Touchless Dynamic QR Code Clock-In", "Employees scan with their phone in under 2 seconds."),
    ("Real-Time Workforce Live Dashboard", "Instantly see who is present, absent, or pending approval."),
    ("Audit-Ready Timesheets & Staff Directory", "Automated shift logs, employee IDs & MPIN app lock.")
]

b_y = 265
for b_title, b_desc in bullets:
    # Green Checkmark Circle
    draw.ellipse([48, b_y + 3, 72, b_y + 27], fill=(35, 125, 52))
    # Crisp white checkmark
    draw.line([(54, b_y + 15), (59, b_y + 20), (66, b_y + 11)], fill=(255, 255, 255), width=2)
    
    draw.text((82, b_y + 1), b_title, fill=(245, 250, 242), font=font_bullet_title)
    draw.text((82, b_y + 23), b_desc, fill=(160, 180, 155), font=font_bullet_sub)
    b_y += 50

# Trust Bar Pill
draw_rounded_rect(draw, [48, 430, 485, 470], 20, fill=(22, 45, 18), outline=(65, 110, 50), width=1)
# Draw tiny vector shield
draw.polygon([(68, 442), (76, 442), (80, 446), (72, 458), (64, 446)], fill=(200, 225, 190))
draw.text((88, 441), "Zero Hardware  |  100% Mobile  |  Biometric Lock", fill=(200, 225, 190), font=font_pill)

# ==============================================================================
# 3. Right Column: Two Angled 3D Device Mockups with Real App Screens
# ==============================================================================
def make_phone_frame(screen_img, fw=245, fh=520, radius=28):
    frame = Image.new('RGBA', (fw, fh), (0, 0, 0, 0))
    f_draw = ImageDraw.Draw(frame)
    f_draw.rounded_rectangle([0, 0, fw, fh], radius=radius, fill=(255, 255, 255), outline=(210, 225, 200), width=4)
    
    bezel = 6
    sw = fw - (bezel * 2)
    sh = fh - (bezel * 2)
    
    ratio = sw / screen_img.width
    th = int(screen_img.height * ratio)
    res_scr = screen_img.resize((sw, th), Image.Resampling.LANCZOS)
    
    if th >= sh:
        crop_scr = res_scr.crop((0, 0, sw, sh))
    else:
        crop_scr = Image.new('RGB', (sw, sh), (248, 249, 243))
        crop_scr.paste(res_scr, (0, 0))
        
    mask = get_rounded_mask((sw, sh), radius - 6)
    frame.paste(crop_scr, (bezel, bezel), mask)
    
    # Island
    f_draw.rounded_rectangle([fw//2 - 24, bezel + 6, fw//2 + 24, bezel + 14], radius=4, fill=(18, 18, 18))
    return frame

# Phone 2 (Back: Workplace QR Modal)
scr_qr = Image.open(os.path.join(ASSETS_DIR, 'sim_join_qr_modal_share.png')).convert('RGB')
p2 = make_phone_frame(scr_qr, fw=240, fh=510, radius=28)

# Phone 1 (Front: Real Employer Today Dashboard)
im_emp = Image.open(os.path.join(ASSETS_DIR, 'sim_employer_share_link.png')).convert('RGB')
w_e, h_e = im_emp.size
tab_bar_e = im_emp.crop((0, 2280, w_e, h_e))
clean_emp = im_emp.copy()
d_emp = ImageDraw.Draw(clean_emp)
d_emp.rectangle([0, 1960, w_e, h_e], fill=im_emp.getpixel((50, 2050)))
clean_emp.paste(tab_bar_e, (0, h_e - tab_bar_e.height))
p1 = make_phone_frame(clean_emp, fw=250, fh=530, radius=30)

# Composite Devices
canvas_rgba = img.convert('RGBA')

# Shadow for Phone 2
sh2 = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(sh2).rounded_rectangle([765, 45, 765 + 240, 45 + 510], radius=32, fill=(0, 0, 0, 150))
sh2 = sh2.filter(ImageFilter.GaussianBlur(24))
canvas_rgba = Image.alpha_composite(canvas_rgba, sh2)
canvas_rgba.paste(p2, (765, 30), p2)

# Shadow for Phone 1
sh1 = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(sh1).rounded_rectangle([550, 20, 550 + 250, 20 + 530], radius=34, fill=(0, 0, 0, 190))
sh1 = sh1.filter(ImageFilter.GaussianBlur(26))
canvas_rgba = Image.alpha_composite(canvas_rgba, sh1)
canvas_rgba.paste(p1, (550, 10), p1)

# Floating Badge 1 (Top: Touchless QR)
b1_w, b1_h = 275, 46
b1_x, b1_y = 485, 75
b1 = Image.new('RGBA', (b1_w, b1_h), (0, 0, 0, 0))
b1_d = ImageDraw.Draw(b1)
b1_d.rounded_rectangle([0, 0, b1_w, b1_h], radius=23, fill=(18, 38, 16, 240), outline=(95, 165, 75), width=2)
# Checkmark
b1_d.ellipse([12, 10, 36, 34], fill=(35, 160, 65))
b1_d.line([(19, 22), (23, 27), (30, 17)], fill=(255, 255, 255), width=2)
b1_d.text((44, 9), "Touchless QR Clock-In", fill=(255, 255, 255), font=font_float_title)
b1_d.text((44, 26), "On-Site GPS & Wi-Fi Verified", fill=(175, 215, 165), font=font_bullet_sub)

sh_b1 = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(sh_b1).rounded_rectangle([b1_x, b1_y + 4, b1_x + b1_w, b1_y + b1_h + 4], radius=23, fill=(0, 0, 0, 130))
sh_b1 = sh_b1.filter(ImageFilter.GaussianBlur(10))
canvas_rgba = Image.alpha_composite(canvas_rgba, sh_b1)
canvas_rgba.paste(b1, (b1_x, b1_y), b1)

# Floating Badge 2 (Bottom: 94% Live Attendance)
b2_w, b2_h = 280, 58
b2_x, b2_y = 675, 395
b2 = Image.new('RGBA', (b2_w, b2_h), (0, 0, 0, 0))
b2_d = ImageDraw.Draw(b2)
b2_d.rounded_rectangle([0, 0, b2_w, b2_h], radius=20, fill=(14, 28, 12, 245), outline=(245, 195, 75), width=2)
b2_d.text((16, 13), "94%", fill=(245, 195, 75), font=font_float_stat)
b2_d.text((80, 11), "Live Attendance Rate", fill=(255, 255, 255), font=font_float_title)
b2_d.text((80, 31), "24 / 25 Members Present Today", fill=(185, 215, 175), font=font_bullet_sub)

sh_b2 = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(sh_b2).rounded_rectangle([b2_x, b2_y + 4, b2_x + b2_w, b2_y + b2_h + 4], radius=20, fill=(0, 0, 0, 130))
sh_b2 = sh_b2.filter(ImageFilter.GaussianBlur(12))
canvas_rgba = Image.alpha_composite(canvas_rgba, sh_b2)
canvas_rgba.paste(b2, (b2_x, b2_y), b2)

# Save Final Outputs
final_rgb = canvas_rgba.convert('RGB')
final_rgb.save(os.path.join(FEAT_DIR, 'bizora_feature_graphic_1024x500.png'), 'PNG')
final_rgb.save(os.path.join(FEAT_DIR, 'bizora_feature_graphic_1024x500.jpg'), 'JPEG', quality=95)

print("Polished Feature Graphic saved successfully (PNG and JPG):", FEAT_DIR)
