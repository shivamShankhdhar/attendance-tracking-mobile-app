import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUTPUT_DIR = '/Users/shivamshankhdhar/Projects/attendance-tracker-full-stack/frontend/store-assets/screenshots'
os.makedirs(OUTPUT_DIR, exist_ok=True)

WIDTH, HEIGHT = 1080, 2400

FONT_BOLD = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
FONT_REGULAR = '/System/Library/Fonts/Supplemental/Arial.ttf'

def get_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except:
        return ImageFont.load_default()

def draw_rounded_rect(draw, bbox, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(bbox, radius=radius, fill=fill, outline=outline, width=width)

def create_base_canvas(badge_text, title_line1, title_line2, subtitle, bg_color=(245, 247, 238)):
    img = Image.new('RGB', (WIDTH, HEIGHT), bg_color)
    draw = ImageDraw.Draw(img)

    # Decorative background glows
    overlay = Image.new('RGBA', (WIDTH, HEIGHT), (0,0,0,0))
    ov_draw = ImageDraw.Draw(overlay)
    ov_draw.ellipse([WIDTH - 350, -120, WIDTH + 350, 580], fill=(225, 236, 210, 180))
    ov_draw.ellipse([-220, 260, 380, 860], fill=(234, 242, 220, 140))
    img.paste(Image.alpha_composite(Image.new('RGBA', (WIDTH, HEIGHT), bg_color + (255,)), overlay).convert('RGB'), (0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Badge Pill
    f_badge = get_font(FONT_BOLD, 26)
    badge_w = draw.textlength(badge_text, font=f_badge) + 40
    badge_h = 50
    badge_x = 75
    badge_y = 105
    draw_rounded_rect(draw, [badge_x, badge_y, badge_x + badge_w, badge_y + badge_h], 25, fill=(235, 242, 226), outline=(205, 218, 190), width=2)
    draw.text((badge_x + 20, badge_y + 11), badge_text, fill=(58, 92, 38), font=f_badge)

    # 2. Main Title (2 lines)
    f_title = get_font(FONT_BOLD, 64)
    y_cursor = 188
    draw.text((75, y_cursor), title_line1, fill=(27, 34, 16), font=f_title)
    y_cursor += 74
    if title_line2:
        draw.text((75, y_cursor), title_line2, fill=(43, 74, 27), font=f_title)
        y_cursor += 74

    # 3. Subtitle
    f_sub = get_font(FONT_REGULAR, 33)
    draw.text((75, y_cursor + 6), subtitle, fill=(107, 122, 90), font=f_sub)

    return img

def add_device_mockup(canvas, screen_img, y_top=570):
    dev_w = 930
    dev_h = 1960
    dev_x = (WIDTH - dev_w) // 2
    dev_y = y_top

    # Soft drop shadow
    shadow = Image.new('RGBA', (WIDTH, HEIGHT), (0,0,0,0))
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

# -------------------------------------------------------------
# SCREENSHOT 1: Welcome & Easy Sign-In
# -------------------------------------------------------------
print("Creating Screenshot 1: Sign-In...")
src_signin = Image.open('/Users/shivamshankhdhar/.gemini/antigravity-ide/brain/73c11b4f-906b-4ccf-9ba9-e648e7ef1a65/final_screen.png')
canvas1 = create_base_canvas(
    badge_text="BIZORA ATTENDANCE",
    title_line1="Simple Attendance",
    title_line2="For Growing Teams",
    subtitle="Fast Google sign-in & team member PIN access"
)
img1 = add_device_mockup(canvas1, src_signin)
img1.save(os.path.join(OUTPUT_DIR, '01_phone_welcome_signin.png'), 'PNG')

# -------------------------------------------------------------
# SCREENSHOT 2: Real-Time Attendance Dashboard
# -------------------------------------------------------------
print("Creating Screenshot 2: Live Dashboard...")
src_dash = Image.open('/Users/shivamshankhdhar/.gemini/antigravity-ide/brain/73c11b4f-906b-4ccf-9ba9-e648e7ef1a65/cap_dashboard.png')
canvas2 = create_base_canvas(
    badge_text="LIVE DASHBOARD",
    title_line1="Real-Time Attendance",
    title_line2="At A Single Glance",
    subtitle="Live present counts, pending reviews & instant approvals"
)
img2 = add_device_mockup(canvas2, src_dash)
img2.save(os.path.join(OUTPUT_DIR, '02_phone_live_dashboard.png'), 'PNG')

# -------------------------------------------------------------
# SCREENSHOT 3: Touchless QR Code Check-In
# -------------------------------------------------------------
print("Creating Screenshot 3: Touchless QR...")
# Build rich QR check-in screen UI
scr3 = Image.new('RGB', (1170, 2532), (248, 249, 243))
d3 = ImageDraw.Draw(scr3)

# Header
d3.text((60, 140), "QR Attendance", fill=(27, 34, 16), font=get_font(FONT_BOLD, 54))
d3.text((60, 210), "Workplace Check-In Session", fill=(107, 122, 90), font=get_font(FONT_REGULAR, 32))

# Card
draw_rounded_rect(d3, [60, 310, 1110, 1850], 40, fill=(255, 255, 255), outline=(225, 233, 215), width=3)

# Status pill inside card
draw_rounded_rect(d3, [120, 380, 480, 446], 33, fill=(236, 253, 245), outline=(167, 243, 208), width=2)
d3.text((160, 396), "● SESSION ACTIVE", fill=(5, 150, 105), font=get_font(FONT_BOLD, 28))

# Big QR Mockup
qr_box = [235, 520, 935, 1220]
draw_rounded_rect(d3, qr_box, 32, fill=(245, 247, 240), outline=(215, 225, 205), width=3)

# Draw stylized QR pattern
grid_size = 14
start_x, start_y = 285, 570
cell_size = 42
for r in range(grid_size):
    for c in range(grid_size):
        # Corner position patterns
        is_corner1 = (r < 4 and c < 4)
        is_corner2 = (r < 4 and c >= grid_size - 4)
        is_corner3 = (r >= grid_size - 4 and c < 4)
        # Random pseudo QR pattern based on coordinates
        val = (r * 11 + c * 17 + (r ^ c)) % 3 == 0
        if is_corner1 or is_corner2 or is_corner3 or val:
            x_pos = start_x + c * cell_size
            y_pos = start_y + r * cell_size
            draw_rounded_rect(d3, [x_pos, y_pos, x_pos + cell_size - 4, y_pos + cell_size - 4], 8, fill=(35, 55, 25))

# Center logo box in QR
draw_rounded_rect(d3, [510, 795, 660, 945], 24, fill=(43, 58, 30))
d3.text((560, 835), "B", fill=(255, 255, 255), font=get_font(FONT_BOLD, 68))

# Code pill
draw_rounded_rect(d3, [340, 1310, 830, 1410], 28, fill=(245, 247, 240), outline=(210, 222, 198), width=2)
d3.text((375, 1342), "CODE:  REVIEW01", fill=(35, 55, 25), font=get_font(FONT_BOLD, 38))

# Instructions
d3.text((200, 1490), "Ask team members to scan with Bizora", fill=(50, 65, 38), font=get_font(FONT_BOLD, 36))
d3.text((230, 1555), "Automatic GPS & Wi-Fi office verification", fill=(120, 135, 105), font=get_font(FONT_REGULAR, 32))

# Action button
draw_rounded_rect(d3, [120, 1680, 1050, 1780], 28, fill=(43, 58, 30))
d3.text((430, 1708), "Share QR Link", fill=(255, 255, 255), font=get_font(FONT_BOLD, 38))

canvas3 = create_base_canvas(
    badge_text="TOUCHLESS CHECK-IN",
    title_line1="Touchless QR Code",
    title_line2="Instant Staff Clock-In",
    subtitle="Generate workplace QR codes for fast contactless entry"
)
img3 = add_device_mockup(canvas3, scr3)
img3.save(os.path.join(OUTPUT_DIR, '03_phone_touchless_qr.png'), 'PNG')

# -------------------------------------------------------------
# SCREENSHOT 4: Team & Employee Directory
# -------------------------------------------------------------
print("Creating Screenshot 4: Team Directory...")
scr4 = Image.new('RGB', (1170, 2532), (248, 249, 243))
d4 = ImageDraw.Draw(scr4)

d4.text((60, 140), "Workplace Team", fill=(27, 34, 16), font=get_font(FONT_BOLD, 54))
d4.text((60, 210), "5 Active Members Registered", fill=(107, 122, 90), font=get_font(FONT_REGULAR, 32))

employees = [
    ("Alex Johnson", "EMP-001", "alex@example.com", "09:05 AM", "PRESENT", (16, 185, 129), (236, 253, 245), (59, 130, 246)),
    ("Sarah Williams", "EMP-002", "sarah@example.com", "09:12 AM", "PRESENT", (16, 185, 129), (236, 253, 245), (168, 85, 247)),
    ("Michael Brown", "EMP-003", "michael@example.com", "Just now", "PENDING", (245, 158, 11), (254, 243, 199), (234, 88, 12)),
    ("Emily Davis", "EMP-004", "emily@example.com", "Not checked in", "NOT MARKED", (156, 163, 175), (243, 244, 246), (13, 148, 136)),
    ("David Miller", "EMP-005", "david@example.com", "On Leave", "LEAVE", (99, 102, 241), (238, 242, 255), (217, 70, 239)),
]

card_y = 290
for name, code, email, time_txt, status, status_c, status_bg, av_c in employees:
    draw_rounded_rect(d4, [60, card_y, 1110, card_y + 240], 32, fill=(255, 255, 255), outline=(225, 233, 215), width=2)
    
    # Avatar Circle
    draw_rounded_rect(d4, [100, card_y + 40, 240, card_y + 180], 70, fill=av_c)
    initials = "".join([part[0] for part in name.split()[:2]])
    d4.text((142, card_y + 78), initials, fill=(255, 255, 255), font=get_font(FONT_BOLD, 46))

    # Name and details
    d4.text((275, card_y + 48), name, fill=(27, 34, 16), font=get_font(FONT_BOLD, 40))
    d4.text((275, card_y + 104), f"{code}  •  {email}", fill=(115, 125, 105), font=get_font(FONT_REGULAR, 28))
    d4.text((275, card_y + 148), f"Activity: {time_txt}", fill=(80, 95, 68), font=get_font(FONT_BOLD, 28))

    # Status Chip
    chip_w = d4.textlength(status, font=get_font(FONT_BOLD, 24)) + 36
    draw_rounded_rect(d4, [1070 - chip_w, card_y + 48, 1070, card_y + 98], 25, fill=status_bg)
    d4.text((1070 - chip_w + 18, card_y + 60), status, fill=status_c, font=get_font(FONT_BOLD, 24))

    card_y += 265

# Add Team Member Button
draw_rounded_rect(d4, [60, card_y + 20, 1110, card_y + 130], 28, fill=(43, 58, 30))
d4.text((410, card_y + 54), "+ Add Team Member", fill=(255, 255, 255), font=get_font(FONT_BOLD, 36))

canvas4 = create_base_canvas(
    badge_text="TEAM MANAGEMENT",
    title_line1="Effortless Staff",
    title_line2="Directory & Access",
    subtitle="Employee codes, instant status & role permissions"
)
img4 = add_device_mockup(canvas4, scr4)
img4.save(os.path.join(OUTPUT_DIR, '04_phone_team_roster.png'), 'PNG')

# -------------------------------------------------------------
# SCREENSHOT 5: Reports, Analytics & Export
# -------------------------------------------------------------
print("Creating Screenshot 5: Reports & Analytics...")
scr5 = Image.new('RGB', (1170, 2532), (248, 249, 243))
d5 = ImageDraw.Draw(scr5)

d5.text((60, 140), "Monthly Reports", fill=(27, 34, 16), font=get_font(FONT_BOLD, 54))
d5.text((60, 210), "September 2026 Overview", fill=(107, 122, 90), font=get_font(FONT_REGULAR, 32))

# Top Metric Cards
draw_rounded_rect(d5, [60, 290, 560, 530], 32, fill=(255, 255, 255), outline=(225, 233, 215), width=2)
d5.text((95, 335), "ATTENDANCE RATE", fill=(115, 125, 105), font=get_font(FONT_BOLD, 26))
d5.text((95, 385), "94.2%", fill=(16, 185, 129), font=get_font(FONT_BOLD, 68))
d5.text((95, 470), "+3.8% from last month", fill=(5, 150, 105), font=get_font(FONT_REGULAR, 26))

draw_rounded_rect(d5, [600, 290, 1110, 530], 32, fill=(255, 255, 255), outline=(225, 233, 215), width=2)
d5.text((635, 335), "TOTAL SHIFTS", fill=(115, 125, 105), font=get_font(FONT_BOLD, 26))
d5.text((635, 385), "184", fill=(35, 55, 25), font=get_font(FONT_BOLD, 68))
d5.text((635, 470), "All 5 employees active", fill=(107, 122, 90), font=get_font(FONT_REGULAR, 26))

# Weekly Attendance Bar Chart Card
draw_rounded_rect(d5, [60, 560, 1110, 1160], 32, fill=(255, 255, 255), outline=(225, 233, 215), width=2)
d5.text((100, 605), "Daily Attendance Trends", fill=(27, 34, 16), font=get_font(FONT_BOLD, 36))
d5.text((100, 655), "Present count across workdays", fill=(115, 125, 105), font=get_font(FONT_REGULAR, 26))

days = [("Mon", 5), ("Tue", 5), ("Wed", 4), ("Thu", 5), ("Fri", 4), ("Sat", 3), ("Sun", 0)]
chart_w = 900
bar_gap = 40
bar_w = (chart_w - (len(days) * bar_gap)) // len(days)
chart_bottom = 1060
chart_max_h = 300

for i, (day_lbl, count) in enumerate(days):
    bx = 110 + i * (bar_w + bar_gap)
    bh = int((count / 5.0) * chart_max_h) if count > 0 else 10
    by = chart_bottom - bh
    
    # Background slot
    draw_rounded_rect(d5, [bx, chart_bottom - chart_max_h, bx + bar_w, chart_bottom], 14, fill=(245, 247, 240))
    # Green fill bar
    if count > 0:
        bar_color = (43, 58, 30) if i == 2 else (74, 107, 50)
        draw_rounded_rect(d5, [bx, by, bx + bar_w, chart_bottom], 14, fill=bar_color)
        d5.text((bx + bar_w // 2 - 12, by - 36), str(count), fill=(43, 58, 30), font=get_font(FONT_BOLD, 28))
    
    d5.text((bx + bar_w // 2 - 24, chart_bottom + 16), day_lbl, fill=(115, 125, 105), font=get_font(FONT_BOLD, 26))

# Export Actions Card
draw_rounded_rect(d5, [60, 1195, 1110, 1680], 32, fill=(255, 255, 255), outline=(225, 233, 215), width=2)
d5.text((100, 1240), "Export Timesheets & Records", fill=(27, 34, 16), font=get_font(FONT_BOLD, 36))
d5.text((100, 1290), "Download audit-ready attendance files", fill=(115, 125, 105), font=get_font(FONT_REGULAR, 26))

draw_rounded_rect(d5, [100, 1370, 1070, 1490], 24, fill=(245, 248, 240), outline=(215, 225, 205), width=2)
d5.text((150, 1408), "📊  Export to Excel (.xlsx)", fill=(35, 55, 25), font=get_font(FONT_BOLD, 34))

draw_rounded_rect(d5, [100, 1520, 1070, 1640], 24, fill=(245, 248, 240), outline=(215, 225, 205), width=2)
d5.text((150, 1558), "📄  Export Summary PDF", fill=(35, 55, 25), font=get_font(FONT_BOLD, 34))

canvas5 = create_base_canvas(
    badge_text="INSIGHTS & REPORTS",
    title_line1="Smart Analytics &",
    title_line2="One-Tap Exports",
    subtitle="Monthly trends, timesheets & audit-ready Excel exports"
)
img5 = add_device_mockup(canvas5, scr5)
img5.save(os.path.join(OUTPUT_DIR, '05_phone_reports_export.png'), 'PNG')

print("All 5 showcase screenshots generated successfully in:", OUTPUT_DIR)
