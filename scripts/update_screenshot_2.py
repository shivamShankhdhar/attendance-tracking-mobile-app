import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from generate_store_screenshots import (
    create_base_canvas, add_device_mockup, draw_rounded_rect, get_font,
    FONT_BOLD, FONT_REGULAR, OUTPUT_DIR
)

print("Creating clean Screenshot 2: Live Dashboard Overview...")
scr2 = Image.new('RGB', (1170, 2532), (248, 249, 243))
d2 = ImageDraw.Draw(scr2)

# Top Bar
d2.text((60, 130), "Your workplace overview", fill=(107, 122, 90), font=get_font(FONT_REGULAR, 30))
d2.text((60, 180), "Bizora Headquarters", fill=(27, 34, 16), font=get_font(FONT_BOLD, 52))

# Role Badge
draw_rounded_rect(d2, [60, 260, 420, 316], 28, fill=(235, 242, 226), outline=(205, 218, 190), width=2)
d2.text((100, 274), "● Admin • Employer", fill=(58, 92, 38), font=get_font(FONT_BOLD, 26))

# Main KPI Card (Today at a glance)
draw_rounded_rect(d2, [60, 350, 1110, 1020], 36, fill=(255, 255, 255), outline=(225, 233, 215), width=2)
d2.text((105, 395), "TODAY AT A GLANCE", fill=(115, 125, 105), font=get_font(FONT_BOLD, 26))
d2.text((700, 395), "Wednesday, Sep 30", fill=(115, 125, 105), font=get_font(FONT_REGULAR, 26))

d2.text((105, 450), "4 checked in", fill=(27, 34, 16), font=get_font(FONT_BOLD, 68))
d2.text((105, 535), "80% of your workplace team is present today", fill=(107, 122, 90), font=get_font(FONT_REGULAR, 28))

# Big percentage badge
draw_rounded_rect(d2, [860, 450, 1060, 570], 32, fill=(236, 253, 245), outline=(167, 243, 208), width=2)
d2.text((885, 485), "80%", fill=(5, 150, 105), font=get_font(FONT_BOLD, 54))

# 3 Metric boxes
m_w = 300
gap = 20
box_y = 600

# Present box
draw_rounded_rect(d2, [105, box_y, 105 + m_w, box_y + 190], 24, fill=(243, 249, 238), outline=(215, 228, 205), width=2)
d2.text((135, box_y + 25), "4", fill=(35, 55, 25), font=get_font(FONT_BOLD, 64))
d2.text((135, box_y + 115), "Present", fill=(75, 95, 65), font=get_font(FONT_BOLD, 30))

# Pending box
draw_rounded_rect(d2, [105 + m_w + gap, box_y, 105 + 2*m_w + gap, box_y + 190], 24, fill=(254, 249, 235), outline=(245, 230, 185), width=2)
d2.text((135 + m_w + gap, box_y + 25), "1", fill=(180, 83, 9), font=get_font(FONT_BOLD, 64))
d2.text((135 + m_w + gap, box_y + 115), "Pending", fill=(180, 83, 9), font=get_font(FONT_BOLD, 30))

# Not marked box
draw_rounded_rect(d2, [105 + 2*(m_w + gap), box_y, 105 + 3*m_w + 2*gap, box_y + 190], 24, fill=(245, 247, 242), outline=(225, 230, 220), width=2)
d2.text((135 + 2*(m_w + gap), box_y + 25), "0", fill=(120, 130, 115), font=get_font(FONT_BOLD, 64))
d2.text((135 + 2*(m_w + gap), box_y + 115), "Not Marked", fill=(120, 130, 115), font=get_font(FONT_BOLD, 30))

# Buttons inside card
draw_rounded_rect(d2, [105, 830, 570, 950], 26, fill=(43, 58, 30))
d2.text((205, 868), "⚏ Open QR Session", fill=(255, 255, 255), font=get_font(FONT_BOLD, 34))

draw_rounded_rect(d2, [600, 830, 1065, 950], 26, fill=(240, 246, 232), outline=(205, 220, 195), width=2)
d2.text((700, 868), "↗ Attendance", fill=(43, 58, 30), font=get_font(FONT_BOLD, 34))

# Section: Live Roster Feed
d2.text((60, 1080), "Today's Live Check-Ins", fill=(27, 34, 16), font=get_font(FONT_BOLD, 44))
d2.text((880, 1088), "View all ›", fill=(58, 92, 38), font=get_font(FONT_BOLD, 30))

roster_y = 1150
feed = [
    ("Alex Johnson", "09:05 AM", "QR Scan • On Time", "PRESENT", (16, 185, 129), (236, 253, 245), (59, 130, 246)),
    ("Sarah Williams", "09:12 AM", "PIN Login • On Time", "PRESENT", (16, 185, 129), (236, 253, 245), (168, 85, 247)),
    ("Michael Brown", "09:30 AM", "Wi-Fi Check • Needs Approval", "PENDING", (245, 158, 11), (254, 243, 199), (234, 88, 12)),
    ("Emily Davis", "08:58 AM", "QR Scan • Early Arrival", "PRESENT", (16, 185, 129), (236, 253, 245), (13, 148, 136)),
]

for name, time_s, sub_s, status, st_c, st_bg, av_c in feed:
    draw_rounded_rect(d2, [60, roster_y, 1110, roster_y + 185], 28, fill=(255, 255, 255), outline=(225, 233, 215), width=2)
    
    # Avatar
    draw_rounded_rect(d2, [95, roster_y + 35, 215, roster_y + 155], 60, fill=av_c)
    inits = "".join([p[0] for p in name.split()[:2]])
    d2.text((128, roster_y + 68), inits, fill=(255, 255, 255), font=get_font(FONT_BOLD, 42))

    d2.text((245, roster_y + 45), name, fill=(27, 34, 16), font=get_font(FONT_BOLD, 36))
    d2.text((245, roster_y + 102), f"{time_s}  •  {sub_s}", fill=(115, 125, 105), font=get_font(FONT_REGULAR, 26))

    # Chip
    cw = d2.textlength(status, font=get_font(FONT_BOLD, 22)) + 36
    draw_rounded_rect(d2, [1070 - cw, roster_y + 65, 1070, roster_y + 115], 25, fill=st_bg)
    d2.text((1070 - cw + 18, roster_y + 76), status, fill=st_c, font=get_font(FONT_BOLD, 22))

    roster_y += 210

# Bottom Tab Bar
tab_y = 2080
draw_rounded_rect(d2, [0, tab_y, 1170, 2532], 0, fill=(255, 255, 255), outline=(225, 230, 220), width=2)
tabs = [("Today", True), ("Attendance", False), ("Employees", False), ("Workplace", False)]
for idx, (t_name, active) in enumerate(tabs):
    tx = idx * (1170 // 4) + 60
    tc = (43, 58, 30) if active else (140, 150, 130)
    d2.text((tx, tab_y + 55), t_name, fill=tc, font=get_font(FONT_BOLD, 30))

canvas2 = create_base_canvas(
    badge_text="LIVE DASHBOARD",
    title_line1="Real-Time Attendance",
    title_line2="At A Single Glance",
    subtitle="Live present counts, pending reviews & instant approvals"
)
img2 = add_device_mockup(canvas2, scr2)
img2.save(os.path.join(OUTPUT_DIR, '02_phone_live_dashboard.png'), 'PNG')
print("Screenshot 2 updated cleanly with zero ads.")
