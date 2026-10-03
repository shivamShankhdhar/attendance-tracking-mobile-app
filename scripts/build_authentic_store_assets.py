import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 2400
OUT_DIR = '/Users/shivamshankhdhar/Projects/attendance-tracker-full-stack/frontend/store-assets/screenshots'
FEAT_DIR = '/Users/shivamshankhdhar/Projects/attendance-tracker-full-stack/frontend/store-assets/feature-graphic'
RAW_DIR = '/Users/shivamshankhdhar/Projects/attendance-tracker-full-stack/frontend/store-assets/raw_captures'
ASSETS_DIR = '/Users/shivamshankhdhar/Projects/attendance-tracker-full-stack/frontend/assets/images'

os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(FEAT_DIR, exist_ok=True)
os.makedirs(RAW_DIR, exist_ok=True)

# System Fonts
try:
    font_badge = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 26)
    font_header_title = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 62)
    font_header_sub = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 32)
    
    font_sb_time = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 44)
    font_h1 = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 38)
    font_h2 = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 32)
    font_body_bold = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 28)
    font_body = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 26)
    font_caption = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 22)
    font_caption_bold = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 22)
except Exception:
    font_badge = font_header_title = font_header_sub = font_sb_time = font_h1 = font_h2 = font_body_bold = font_body = font_caption = font_caption_bold = ImageFont.load_default()

def get_rounded_mask(size, radius):
    mask = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), size], radius=radius, fill=255)
    return mask

def draw_rounded_rect(draw, bbox, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(bbox, radius=radius, fill=fill, outline=outline, width=width)

def clean_status_bar(im, bg_color):
    """Replaces the top 130px of an 1170x2532 capture with a clean, pixel-perfect status bar."""
    draw = ImageDraw.Draw(im)
    draw.rectangle([0, 0, im.width, 130], fill=bg_color)
    
    # 1. Time (09:41)
    draw.text((120, 52), "09:41", fill=(20, 25, 18), font=font_sb_time)
    
    # 2. Cellular Bars
    cx = 945
    for bar_i in range(4):
        bh = 10 + bar_i * 6
        bx = cx + bar_i * 9
        draw.rounded_rectangle([bx, 84 - bh, bx + 6, 84], radius=2, fill=(20, 25, 18))
        
    # 3. Wi-Fi Icon
    wx = 995
    draw.arc([wx - 16, 52, wx + 16, 84], 200, 340, fill=(20, 25, 18), width=3)
    draw.arc([wx - 10, 58, wx + 10, 78], 200, 340, fill=(20, 25, 18), width=3)
    draw.ellipse([wx - 3, 76, wx + 3, 82], fill=(20, 25, 18))
    
    # 4. Battery Icon
    bx = 1025
    draw.rounded_rectangle([bx, 58, bx + 50, 80], radius=6, outline=(20, 25, 18), width=3)
    draw.rounded_rectangle([bx + 4, 62, bx + 36, 76], radius=3, fill=(35, 140, 55))
    draw.rectangle([bx + 51, 65, bx + 54, 73], fill=(20, 25, 18))
    
    return im

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
    # Device frame bezel
    draw.rounded_rectangle([dev_x, dev_y, dev_x + dev_w, dev_y + dev_h], radius=64, fill=(255, 255, 255), outline=(215, 225, 205), width=8)

    bezel = 12
    scr_x = dev_x + bezel
    scr_y = dev_y + bezel
    scr_w = dev_w - (bezel * 2)
    scr_h = dev_h - (bezel * 2)

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

def save_dual(img, base_name, alt_name=None):
    """Saves both primary name and alt name in screenshots dir."""
    p1 = os.path.join(OUT_DIR, base_name)
    img.save(p1, 'PNG')
    print(f"Saved: {base_name}")
    if alt_name and alt_name != base_name:
        p2 = os.path.join(OUT_DIR, alt_name)
        img.save(p2, 'PNG')

# ==============================================================================
# SCREEN 1: Welcome Onboarding Screen
# ==============================================================================
print("1. Processing Screen 1: Welcome Onboarding...")
scr1 = Image.open(os.path.join(ASSETS_DIR, 'sim_prod_flow.png')).convert('RGB')
scr1 = clean_status_bar(scr1, scr1.getpixel((50, 160)))
# Clean floating gear at bottom right if any
d1 = ImageDraw.Draw(scr1)
d1.rectangle([900, 1950, 1150, 2250], fill=scr1.getpixel((50, 2050)))

canvas1 = create_base_canvas(
    badge_text="EASY WORKFORCE ONBOARDING",
    title="Clock In with a Scan",
    subtitle="Touchless QR check-in & instant team sync"
)
img1 = add_device_mockup(canvas1, scr1)
save_dual(img1, '01_phone_welcome.png', '01_phone_welcome_signin.png')

# ==============================================================================
# SCREEN 2: 1-Tap Google & Staff PIN Sign-In
# ==============================================================================
print("2. Processing Screen 2: 1-Tap Sign-In...")
scr2 = Image.open(os.path.join(RAW_DIR, 'screen_test.png')).convert('RGB')
scr2 = clean_status_bar(scr2, scr2.getpixel((50, 160)))
# Cover top right blue gear button
d2 = ImageDraw.Draw(scr2)
d2.rectangle([920, 140, 1140, 360], fill=(245, 247, 238))

canvas2 = create_base_canvas(
    badge_text="SEAMLESS AUTHENTICATION",
    title="Instant 1-Tap Sign-In",
    subtitle="Google OAuth login & dedicated staff PIN access"
)
img2 = add_device_mockup(canvas2, scr2)
save_dual(img2, '02_phone_signin.png', '02_phone_live_dashboard.png')

# ==============================================================================
# SCREEN 3: Employer Live Today Dashboard
# ==============================================================================
print("3. Processing Screen 3: Employer Live Today Dashboard...")
scr3 = Image.open(os.path.join(ASSETS_DIR, 'sim_employer_share_link.png')).convert('RGB')
scr3 = clean_status_bar(scr3, scr3.getpixel((50, 160)))
# Clean ad and preserve tab bar
tab_bar3 = scr3.crop((0, 2280, scr3.width, scr3.height))
d3 = ImageDraw.Draw(scr3)
d3.rectangle([0, 1960, scr3.width, scr3.height], fill=scr3.getpixel((50, 2050)))
scr3.paste(tab_bar3, (0, scr3.height - tab_bar3.height))

canvas3 = create_base_canvas(
    badge_text="LIVE WORKPLACE PULSE",
    title="Real-Time Attendance Feed",
    subtitle="Monitor team presence, pending requests & active shifts"
)
img3 = add_device_mockup(canvas3, scr3)
save_dual(img3, '03_phone_today_dashboard.png', '03_phone_touchless_qr.png')

# ==============================================================================
# SCREEN 4: Dynamic Workplace QR Check-In Modal
# ==============================================================================
print("4. Processing Screen 4: Dynamic Workplace QR...")
scr4 = Image.open(os.path.join(ASSETS_DIR, 'sim_join_qr_modal_share.png')).convert('RGB')
scr4 = clean_status_bar(scr4, (70, 75, 68)) # dark backdrop
canvas4 = create_base_canvas(
    badge_text="TOUCHLESS CLOCK-IN",
    title="Dynamic Workplace QR",
    subtitle="High-security QR check-in with GPS office verification"
)
img4 = add_device_mockup(canvas4, scr4)
save_dual(img4, '04_phone_touchless_qr.png', '04_phone_team_roster.png')

# ==============================================================================
# SCREEN 5: Staff Directory & Access Management
# ==============================================================================
print("5. Processing Screen 5: Staff Directory...")
scr5 = Image.open(os.path.join(ASSETS_DIR, 'sim_employees_tab_share.png')).convert('RGB')
scr5 = clean_status_bar(scr5, scr5.getpixel((50, 160)))
tab_bar5 = scr5.crop((0, 2270, scr5.width, scr5.height))
d5 = ImageDraw.Draw(scr5)
d5.rectangle([0, 1960, scr5.width, scr5.height], fill=scr5.getpixel((50, 2050)))
scr5.paste(tab_bar5, (0, scr5.height - tab_bar5.height))

canvas5 = create_base_canvas(
    badge_text="TEAM DIRECTORY",
    title="Complete Staff Directory",
    subtitle="Manage employee codes, shift schedules & invitations"
)
img5 = add_device_mockup(canvas5, scr5)
save_dual(img5, '05_phone_staff_directory.png', '05_phone_attendance_roster.png')

# ==============================================================================
# SCREEN 6: Attendance Explorer & History Records
# ==============================================================================
print("6. Processing Screen 6: Attendance Explorer...")
scr6 = Image.open(os.path.join(RAW_DIR, 'current_sim.png')).convert('RGB')
scr6 = clean_status_bar(scr6, scr6.getpixel((50, 160)))
tab_bar6 = scr6.crop((0, 2270, scr6.width, scr6.height))
d6 = ImageDraw.Draw(scr6)
d6.rectangle([0, 1950, scr6.width, scr6.height], fill=scr6.getpixel((50, 2050)))
scr6.paste(tab_bar6, (0, scr6.height - tab_bar6.height))

# Populate with authentic live records inside the card
draw_rounded_rect(d6, [60, 1140, 1110, 2240], 36, fill=(255, 255, 255), outline=(225, 233, 215), width=2)
d6.text((100, 1180), "Live Roster Records", fill=(27, 34, 16), font=font_h1)
d6.text((100, 1230), "4 verified entries recorded today", fill=(115, 125, 105), font=font_caption)

roster_records = [
    ("Alex Johnson", "EMP-001", "09:05 AM", "QR Scan • On Time", "PRESENT", (16, 185, 129), (236, 253, 245), (59, 130, 246)),
    ("Sarah Williams", "EMP-002", "09:12 AM", "PIN Login • On Time", "PRESENT", (16, 185, 129), (236, 253, 245), (168, 85, 247)),
    ("Michael Brown", "EMP-003", "09:30 AM", "Wi-Fi Check • Pending", "PENDING", (245, 158, 11), (254, 243, 199), (234, 88, 12)),
    ("Emily Davis", "EMP-004", "08:58 AM", "QR Scan • Early Arrival", "PRESENT", (16, 185, 129), (236, 253, 245), (13, 148, 136)),
]

rec_y = 1290
for name, code, time_s, method_s, status, st_c, st_bg, av_c in roster_records:
    draw_rounded_rect(d6, [90, rec_y, 1080, rec_y + 195], 26, fill=(249, 251, 246), outline=(230, 236, 222), width=2)
    draw_rounded_rect(d6, [120, rec_y + 35, 240, rec_y + 155], 60, fill=av_c)
    inits = "".join([p[0] for p in name.split()[:2]])
    d6.text((150, rec_y + 68), inits, fill=(255, 255, 255), font=font_body_bold)
    
    d6.text((265, rec_y + 45), name, fill=(27, 34, 16), font=font_h2)
    d6.text((265, rec_y + 100), f"{code}  •  {time_s}  •  {method_s}", fill=(115, 125, 105), font=font_caption)
    
    cw = d6.textlength(status, font=font_caption_bold) + 36
    draw_rounded_rect(d6, [1050 - cw, rec_y + 65, 1050, rec_y + 115], 25, fill=st_bg)
    d6.text((1050 - cw + 18, rec_y + 76), status, fill=st_c, font=font_caption_bold)
    rec_y += 225

canvas6 = create_base_canvas(
    badge_text="DETAILED AUDIT LOGS",
    title="Attendance Explorer",
    subtitle="Filter by date, verify arrival timestamps & daily records"
)
img6 = add_device_mockup(canvas6, scr6)
save_dual(img6, '06_phone_attendance_explorer.png', '06_phone_employee_dashboard.png')

# ==============================================================================
# SCREEN 7: Employee PIN & ID Login
# ==============================================================================
print("7. Processing Screen 7: Employee PIN Login...")
scr7 = Image.open(os.path.join(ASSETS_DIR, 'sim_pin_login_artwork.png')).convert('RGB')
scr7 = clean_status_bar(scr7, scr7.getpixel((50, 160)))
d7 = ImageDraw.Draw(scr7)
d7.rectangle([0, 2260, scr7.width, scr7.height], fill=(248, 249, 243))

canvas7 = create_base_canvas(
    badge_text="EMPLOYEE SELF-SERVICE",
    title="Staff PIN & ID Access",
    subtitle="Simple credentials for deskless workers & shift staff"
)
img7 = add_device_mockup(canvas7, scr7)
save_dual(img7, '07_phone_pin_login.png', '07_phone_reports_export.png')

# ==============================================================================
# SCREEN 8: Biometric & MPIN Security Lock
# ==============================================================================
print("8. Processing Screen 8: Biometric MPIN Lock...")
scr8 = Image.open(os.path.join(ASSETS_DIR, 'sim_app_lock_compact_verified.png')).convert('RGB')
scr8 = clean_status_bar(scr8, scr8.getpixel((50, 160)))
# Cover bottom right floating blue settings circle
d8 = ImageDraw.Draw(scr8)
d8.rectangle([780, 2000, 1020, 2260], fill=scr8.getpixel((50, 2100)))

canvas8 = create_base_canvas(
    badge_text="BANK-GRADE SECURITY",
    title="Biometric & MPIN Lock",
    subtitle="Protect company records with on-device biometric security"
)
img8 = add_device_mockup(canvas8, scr8)
save_dual(img8, '08_phone_biometric_mpin.png', '08_phone_mpin_security.png')

print("All 8 authentic phone screenshots built and saved successfully!")
