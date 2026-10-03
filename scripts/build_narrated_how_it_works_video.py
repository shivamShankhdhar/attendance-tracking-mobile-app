#!/usr/bin/env python3
"""
Full pipeline to produce a professional, voiced-over 'How It Works' demonstration video:
1. Synthesizes pristine voiceover clips using macOS speech engine (Samantha, natural pacing).
2. Dynamically times each video scene to perfectly match narration + breathing room.
3. Renders Full HD 1080p frames with interactive visual FX:
   - Pulsing touch indicators on buttons
   - Animated laser scanner beam on QR code
   - On-screen clock-in success confirmation popup
   - Live counter updates
4. Compiles with Apple VideoToolbox hardware encoder.
5. Muxes multi-clip audio with sample-accurate timestamp sync.
"""

import os
import shutil
import math
import json
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

WIDTH = 1920
HEIGHT = 1080
FPS = 30

PROJECT_ROOT = '/Users/shivamshankhdhar/Projects/attendance-tracker-full-stack'
SCREENSHOTS_DIR = os.path.join(PROJECT_ROOT, 'frontend/store-assets/screenshots')
ICON_PATH = os.path.join(PROJECT_ROOT, 'frontend/store-assets/icon/bizora_store_icon_512x512.png')
TMP_DIR = '/tmp/bizora_narration_pipeline'
TMP_FRAMES_DIR = os.path.join(TMP_DIR, 'frames')
TMP_AUDIO_DIR = os.path.join(TMP_DIR, 'audio')
TMP_RAW_VIDEO = os.path.join(TMP_DIR, 'raw_video.mp4')
TMP_CUES_JSON = os.path.join(TMP_DIR, 'cues.json')

OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'frontend/store-assets/video')
FINAL_VOICED_VIDEO = os.path.join(OUTPUT_DIR, 'bizora_how_it_works_with_voiceover_1080p.mp4')
STANDARD_NAME_VIDEO = os.path.join(OUTPUT_DIR, 'bizora_how_it_works_demonstration_1080p.mp4')

ENCODER_BIN = os.path.join(PROJECT_ROOT, 'frontend/scripts/encode_frames')
MUXER_BIN = os.path.join(PROJECT_ROOT, 'frontend/scripts/mux_video_narration')

os.makedirs(TMP_DIR, exist_ok=True)
os.makedirs(TMP_FRAMES_DIR, exist_ok=True)
os.makedirs(TMP_AUDIO_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Typography
font_title = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 44)
font_step = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 24)
font_subtitle = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 23)
font_brand = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 22)
font_h2 = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 25)
font_body = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 20)
font_badge = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 18)
font_card_val = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 52)
font_card_lbl = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 18)
font_outro_title = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 56)
font_scan_alert = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 22)
font_scan_time = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 19)

# Load Screenshots
screens = {
    'welcome': Image.open(os.path.join(SCREENSHOTS_DIR, '01_phone_welcome.png')).convert('RGB'),
    'signin': Image.open(os.path.join(SCREENSHOTS_DIR, '02_phone_signin.png')).convert('RGB'),
    'dashboard': Image.open(os.path.join(SCREENSHOTS_DIR, '03_phone_today_dashboard.png')).convert('RGB'),
    'qr': Image.open(os.path.join(SCREENSHOTS_DIR, '04_phone_touchless_qr.png')).convert('RGB'),
    'directory': Image.open(os.path.join(SCREENSHOTS_DIR, '05_phone_staff_directory.png')).convert('RGB'),
    'explorer': Image.open(os.path.join(SCREENSHOTS_DIR, '06_phone_attendance_explorer.png')).convert('RGB'),
    'pin': Image.open(os.path.join(SCREENSHOTS_DIR, '07_phone_pin_login.png')).convert('RGB'),
    'security': Image.open(os.path.join(SCREENSHOTS_DIR, '08_phone_biometric_mpin.png')).convert('RGB'),
}
app_icon = Image.open(ICON_PATH).convert('RGBA')

# Narration Script Definitions
narration_script = {
    'intro': "Welcome to Bizora, the modern attendance tracker and team management app for growing businesses.",
    'step1': "Step one. Sign in with one tap using your Google account and set up your role as business owner or staff.",
    'step2': "Step two. Create your workplace in thirty seconds. Bizora instantly generates your dynamic workplace QR code stand.",
    'step3': "Step three. Add your employees to the directory and share the direct invite link via WhatsApp or SMS.",
    'step4': "Step four. Daily clock-in. Employees arrive and scan the QR code with their phone. Smart GPS verifies they are physically on site.",
    'step5': "Step five. For shared front-desk tablets or deskless workers, staff simply enter their four-digit PIN on the dialpad.",
    'step6': "Step six. The employer dashboard updates in real time, showing present, absent, and late team members automatically.",
    'step7': "Step seven. Inspect complete attendance history by date, and export audit-ready Excel timesheets for monthly payroll in one tap.",
    'step8': "Step eight. Protect your company data with biometric fingerprint, Face Unlock, and master MPIN security.",
    'outro': "Simplify your workplace attendance today. Download Bizora on Google Play."
}

def get_audio_duration(path):
    res = subprocess.run(['afinfo', path], capture_output=True, text=True)
    for line in res.stdout.splitlines():
        if 'estimated duration' in line:
            return float(line.split(':')[1].replace('sec', '').strip())
    return 5.0

print("Generating voiceover audio files...")
audio_files = {}
audio_durations = {}
for key, text in narration_script.items():
    out_path = os.path.join(TMP_AUDIO_DIR, f"{key}.m4a")
    subprocess.run(['say', '-v', 'Samantha', '-r', '175', '-o', out_path, text], check=True)
    audio_files[key] = out_path
    audio_durations[key] = get_audio_duration(out_path)
    print(f"  {key:8}: {audio_durations[key]:.2f}s -> {text[:50]}...")

def create_base_canvas():
    im = Image.new('RGB', (WIDTH, HEIGHT), (6, 12, 19))
    draw = ImageDraw.Draw(im)
    for y in range(HEIGHT):
        ratio = y / HEIGHT
        r = int(6 + 7 * ratio)
        g = int(12 + 10 * ratio)
        b = int(19 + 15 * ratio)
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b))
    
    glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([1100, 160, 1780, 880], fill=(16, 185, 129, 25))
    gdraw.ellipse([1250, 300, 1620, 720], fill=(6, 182, 212, 20))
    glow = glow.filter(ImageFilter.GaussianBlur(60))
    im.paste(glow, (0, 0), glow)
    return im

BASE_CANVAS = create_base_canvas()

def get_phone_mockup(screen_img, target_h=860):
    aspect = screen_img.width / screen_img.height
    screen_h = target_h - 40
    screen_w = int(screen_h * aspect)
    scaled_screen = screen_img.resize((screen_w, screen_h), Image.Resampling.LANCZOS)
    
    corner_r = 36
    mask = Image.new('L', (screen_w, screen_h), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([(0, 0), (screen_w, screen_h)], radius=corner_r, fill=255)
    
    frame_w = screen_w + 30
    frame_h = screen_h + 30
    frame = Image.new('RGBA', (frame_w, frame_h), (0, 0, 0, 0))
    fdraw = ImageDraw.Draw(frame)
    fdraw.rounded_rectangle([(0, 0), (frame_w, frame_h)], radius=46, fill=(18, 26, 36, 255), outline=(51, 65, 85, 255), width=2)
    fdraw.rounded_rectangle([(7, 7), (frame_w - 7, frame_h - 7)], radius=40, fill=(8, 12, 18, 255))
    frame.paste(scaled_screen, (15, 15), mask)
    
    cx = frame_w // 2
    fdraw.rounded_rectangle([(cx - 40, 22), (cx + 40, 38)], radius=8, fill=(0, 0, 0, 240))
    fdraw.ellipse([(cx + 18, 26), (cx + 30, 34)], fill=(15, 23, 42, 255))
    
    shadow_pad = 50
    total_w = frame_w + shadow_pad * 2
    total_h = frame_h + shadow_pad * 2
    canvas = Image.new('RGBA', (total_w, total_h), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(canvas)
    sdraw.rounded_rectangle(
        [(shadow_pad, shadow_pad + 16), (shadow_pad + frame_w, shadow_pad + frame_h + 16)],
        radius=46,
        fill=(0, 0, 0, 160)
    )
    canvas = canvas.filter(ImageFilter.GaussianBlur(24))
    canvas.paste(frame, (shadow_pad, shadow_pad), frame)
    return canvas

print("Pre-rendering phone mockups...")
mockups = {k: get_phone_mockup(v) for k, v in screens.items()}

# Workflow Steps configured to match audio length + 0.8s buffer
workflow_steps = [
    {
        'key': 'step1',
        'step_num': 1,
        'tag': 'STEP 1: GETTING STARTED',
        'title': 'Sign In & Role Setup',
        'desc': 'Open Bizora and sign in with Google in 1 tap. Choose your role as Business Owner (Admin) or Employee.',
        'action_guide': 'What Happens Here:',
        'points': [
            '1-Tap Google OAuth login — zero complex setup',
            'Business Owner gets full manager permissions',
            'Staff members get personalized clock-in profiles'
        ],
        'callout': ('1 Tap', 'Fast Sign-In'),
        'screen': 'signin',
        'duration_sec': max(6.0, audio_durations['step1'] + 0.8),
        'pointer': (1380, 560)
    },
    {
        'key': 'step2',
        'step_num': 2,
        'tag': 'STEP 2: WORKPLACE CREATION',
        'title': 'Generate Workplace QR',
        'desc': 'Create your workplace in 30 seconds. Bizora instantly generates your unique Workplace QR Stand and 6-digit Code.',
        'action_guide': 'How to Use It:',
        'points': [
            'Display QR stand on your front desk or wall',
            'Works directly on any tablet, phone, or printed sheet',
            'Workplace Code (e.g. B448D5) for manual staff entry'
        ],
        'callout': ('30 Sec', 'Instant Workplace Setup'),
        'screen': 'qr',
        'duration_sec': max(6.5, audio_durations['step2'] + 0.8),
        'pointer': (1380, 520)
    },
    {
        'key': 'step3',
        'step_num': 3,
        'tag': 'STEP 3: TEAM ONBOARDING',
        'title': 'Invite Staff Members',
        'desc': 'Add your team members to the staff directory. Share your invite link via WhatsApp or direct SMS.',
        'action_guide': 'How Staff Join:',
        'points': [
            'Tap "Share link" to send direct join link to staff',
            'Employees scan the QR code to connect instantly',
            'Assign custom staff IDs, roles, and shift timings'
        ],
        'callout': ('1-Click', 'Shareable Invite Link'),
        'screen': 'directory',
        'duration_sec': max(6.0, audio_durations['step3'] + 0.8),
        'pointer': (1440, 240)
    },
    {
        'key': 'step4',
        'step_num': 4,
        'tag': 'STEP 4: DAILY CLOCK-IN (THE CORE FLOW)',
        'title': 'Touchless QR & GPS Check-In',
        'desc': 'When arriving at work, employees scan the QR code with their phone. Smart GPS verifies they are physically at the office.',
        'action_guide': 'How Clock-In Works:',
        'points': [
            'Employee taps "Scan QR" and points camera at desk stand',
            'GPS geo-fence confirms on-site presence (<50m radius)',
            'Clock-in is verified in 0.5s with exact timestamp'
        ],
        'callout': ('0.5s', 'Touchless Clock-In'),
        'screen': 'qr',
        'duration_sec': max(8.5, audio_durations['step4'] + 0.8),
        'is_qr_scan': True,
        'pointer': (1380, 520)
    },
    {
        'key': 'step5',
        'step_num': 5,
        'tag': 'STEP 5: SHARED TABLET KIOSK',
        'title': 'Staff PIN & ID Clock-In',
        'desc': 'For workers without smartphones or shared entry tablets, staff simply enter their 4-digit PIN on the keypad.',
        'action_guide': 'Kiosk Mode Benefits:',
        'points': [
            'No smartphone or email account needed for workers',
            'Ideal for warehouse, retail counter, or kitchen shifts',
            'Simple numerical dialer with zero learning curve'
        ],
        'callout': ('4-Digit', 'Simple Staff PIN'),
        'screen': 'pin',
        'duration_sec': max(7.0, audio_durations['step5'] + 0.8),
        'pointer': (1380, 680)
    },
    {
        'key': 'step6',
        'step_num': 6,
        'tag': 'STEP 6: LIVE EMPLOYER PULSE',
        'title': 'Real-Time Live Dashboard',
        'desc': 'The employer dashboard updates live in real time as staff clock in. See who is present, absent, or late instantly.',
        'action_guide': 'Live Overview Features:',
        'points': [
            'Live Present / Absent / On Break counters update automatically',
            'Real-time pulse activity feed with employee photos',
            'Approve leave or attendance correction requests in 1 tap'
        ],
        'callout': ('Real-Time', 'Instant Team Pulse'),
        'screen': 'dashboard',
        'duration_sec': max(7.5, audio_durations['step6'] + 0.8),
        'pointer': (1280, 360)
    },
    {
        'key': 'step7',
        'step_num': 7,
        'tag': 'STEP 7: AUDIT LOGS & PAYROLL',
        'title': 'Attendance Explorer & Exports',
        'desc': 'View daily, weekly, and monthly records with exact timestamps. Export complete timesheets to Excel in 1 tap.',
        'action_guide': 'Monthly Reporting:',
        'points': [
            'Interactive calendar date picker to view past dates',
            'Clear audit trail with exact in/out timestamps',
            'One-tap Excel (.xlsx) export ready for payroll processing'
        ],
        'callout': ('1-Tap', 'Audit-Ready Excel Export'),
        'screen': 'explorer',
        'duration_sec': max(7.5, audio_durations['step7'] + 0.8),
        'pointer': (1440, 240)
    },
    {
        'key': 'step8',
        'step_num': 8,
        'tag': 'STEP 8: DATA PROTECTION',
        'title': 'Biometric & MPIN Lock',
        'desc': 'Protect sensitive employee salaries, logs, and business records with hardware-backed biometric security.',
        'action_guide': 'Security Highlights:',
        'points': [
            'Fingerprint and Face Unlock support on Android',
            '4-digit Master MPIN for manager access',
            'Automatic app lock when backgrounded or minimized'
        ],
        'callout': ('AES-256', 'On-Device Security'),
        'screen': 'security',
        'duration_sec': max(7.2, audio_durations['step8'] + 0.8),
        'pointer': (1380, 520)
    }
]

intro_duration = max(5.5, audio_durations['intro'] + 0.6)
outro_duration = max(5.0, audio_durations['outro'] + 0.6)

def render_step_slide(step, frame_in_step, total_frames_in_step, step_idx, total_steps):
    im = BASE_CANVAS.copy()
    draw = ImageDraw.Draw(im)
    
    # 1. Header Bar
    brand_pill_w = 170
    draw.rounded_rectangle([(100, 55), (100 + brand_pill_w, 98)], radius=21, fill=(16, 185, 129, 35), outline=(16, 185, 129), width=1)
    scaled_icon = app_icon.resize((26, 26), Image.Resampling.LANCZOS)
    im.paste(scaled_icon, (114, 63), scaled_icon)
    draw.text((150, 66), "BIZORA", fill=(16, 185, 129), font=font_brand)
    
    step_pill_w = 190
    draw.rounded_rectangle([(300, 55), (300 + step_pill_w, 98)], radius=21, fill=(15, 23, 42, 220), outline=(51, 65, 85), width=1)
    draw.text((320, 66), f"HOW IT WORKS", fill=(148, 163, 184), font=font_badge)
    
    draw.text((WIDTH - 230, 66), f"STEP {step['step_num']} OF {total_steps}", fill=(6, 182, 212), font=font_step)
    
    # 2. Left Column
    draw.text((100, 140), step['tag'], fill=(16, 185, 129), font=font_badge)
    draw.text((100, 175), step['title'], fill=(255, 255, 255), font=font_title)
    draw.text((100, 245), step['desc'], fill=(203, 213, 225), font=font_subtitle)
    draw.line([(100, 310), (900, 310)], fill=(30, 41, 59), width=1)
    
    draw.text((100, 335), step['action_guide'].upper(), fill=(148, 163, 184), font=font_badge)
    
    by = 375
    for pt in step['points']:
        draw.ellipse([(100, by + 4), (128, by + 32)], fill=(16, 185, 129, 45), outline=(16, 185, 129), width=2)
        draw.line([(108, by + 18), (114, by + 24)], fill=(16, 185, 129), width=2)
        draw.line([(114, by + 24), (122, by + 12)], fill=(16, 185, 129), width=2)
        draw.text((144, by + 4), pt, fill=(241, 245, 249), font=font_h2)
        by += 72
        
    card_val, card_lbl = step['callout']
    card_x = 100
    card_y = by + 25
    draw.rounded_rectangle([(card_x, card_y), (card_x + 460, card_y + 115)], radius=22, fill=(15, 23, 42, 230), outline=(51, 65, 85), width=1)
    draw.ellipse([(card_x + 28, card_y + 38), (card_x + 44, card_y + 54)], fill=(16, 185, 129))
    draw.text((card_x + 60, card_y + 20), card_val, fill=(255, 255, 255), font=font_card_val)
    draw.text((card_x + 60, card_y + 80), card_lbl.upper(), fill=(148, 163, 184), font=font_card_lbl)
    
    # 3. Phone Mockup
    float_offset = math.sin((frame_in_step / total_frames_in_step) * math.pi * 2) * 8
    phone_img = mockups[step['screen']].copy()
    
    # Interactive Special FX:
    if step.get('is_qr_scan'):
        pdraw = ImageDraw.Draw(phone_img)
        scan_progress = (frame_in_step % 60) / 60.0
        laser_y = int(360 + scan_progress * 260)
        pdraw.line([(120, laser_y), (360, laser_y)], fill=(16, 185, 129, 255), width=4)
        pdraw.line([(120, laser_y - 1), (360, laser_y - 1)], fill=(52, 211, 153, 180), width=2)
        pdraw.line([(120, laser_y + 1), (360, laser_y + 1)], fill=(52, 211, 153, 180), width=2)
        
        if frame_in_step > 50:
            toast_box = [(40, 680), (430, 780)]
            pdraw.rounded_rectangle(toast_box, radius=18, fill=(16, 185, 129, 250), outline=(255, 255, 255, 200), width=2)
            pdraw.text((60, 694), "✓ Clock In Confirmed!", fill=(6, 12, 19), font=font_scan_alert)
            pdraw.text((60, 726), "Shivam S. • 09:14 AM • GPS Verified", fill=(6, 12, 19), font=font_scan_time)
            pdraw.text((60, 750), "Status: PRESENT on premises", fill=(20, 40, 30), font=font_badge)

    phone_x = 1140
    phone_y = int(95 + float_offset)
    im.paste(phone_img, (phone_x, phone_y), phone_img)
    
    # 4. Animated Touch Pointer
    if 'pointer' in step:
        ptr_x, ptr_y = step['pointer']
        ptr_y = int(ptr_y + float_offset)
        pulse_phase = (frame_in_step % 30) / 30.0
        r_inner = 14
        r_outer = int(14 + pulse_phase * 28)
        alpha_outer = int(220 * (1.0 - pulse_phase))
        
        ripple = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
        rdraw = ImageDraw.Draw(ripple)
        rdraw.ellipse([(ptr_x - r_outer, ptr_y - r_outer), (ptr_x + r_outer, ptr_y + r_outer)], outline=(16, 185, 129, alpha_outer), width=3)
        rdraw.ellipse([(ptr_x - r_inner, ptr_y - r_inner), (ptr_x + r_inner, ptr_y + r_inner)], fill=(16, 185, 129, 220), outline=(255, 255, 255, 240), width=2)
        im.paste(ripple, (0, 0), ripple)

    # 5. Timeline Progress Bar
    progress_w = int((frame_in_step / total_frames_in_step) * (WIDTH - 200))
    draw.line([(100, HEIGHT - 35), (WIDTH - 100, HEIGHT - 35)], fill=(30, 41, 59), width=4)
    if progress_w > 0:
        draw.line([(100, HEIGHT - 35), (100 + progress_w, HEIGHT - 35)], fill=(16, 185, 129), width=4)
        draw.ellipse([(100 + progress_w - 6, HEIGHT - 41), (100 + progress_w + 6, HEIGHT - 29)], fill=(255, 255, 255))

    return im

def render_how_it_works_intro(frame_idx, total_frames):
    im = BASE_CANVAS.copy()
    draw = ImageDraw.Draw(im)
    
    icon_size = 190
    scaled_icon = app_icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    icon_x = (WIDTH - icon_size) // 2
    icon_y = 200
    
    glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([icon_x - 50, icon_y - 50, icon_x + icon_size + 50, icon_y + icon_size + 50], fill=(16, 185, 129, 90))
    glow = glow.filter(ImageFilter.GaussianBlur(40))
    im.paste(glow, (0, 0), glow)
    
    imask = Image.new('L', (icon_size, icon_size), 0)
    idraw = ImageDraw.Draw(imask)
    idraw.rounded_rectangle([(0, 0), (icon_size, icon_size)], radius=42, fill=255)
    im.paste(scaled_icon, (icon_x, icon_y), imask)
    
    title = "Bizora: How It Works"
    bbox = font_outro_title.getbbox(title)
    tw = bbox[2] - bbox[0]
    draw.text(((WIDTH - tw) // 2, 430), title, fill=(255, 255, 255), font=font_outro_title)
    
    sub = "Complete Step-by-Step Walkthrough for Business Owners & Staff"
    bbox2 = font_subtitle.getbbox(sub)
    tw2 = bbox2[2] - bbox2[0]
    draw.text(((WIDTH - tw2) // 2, 515), sub, fill=(16, 185, 129), font=font_subtitle)
    
    pillars = [
        "1. Create Workplace",
        "2. Display Dynamic QR",
        "3. Touchless Clock-In",
        "4. Live Tracking & Payroll"
    ]
    px = 300
    py = 620
    for p in pillars:
        pw = len(p) * 13 + 36
        draw.rounded_rectangle([(px, py), (px + pw, py + 48)], radius=24, fill=(15, 23, 42, 220), outline=(51, 65, 85), width=1)
        draw.text((px + 20, py + 12), p, fill=(226, 232, 240), font=font_badge)
        px += pw + 20
        
    announce = "8 Simple Steps to Modernize Your Workplace Attendance"
    bbox3 = font_body.getbbox(announce)
    tw3 = bbox3[2] - bbox3[0]
    draw.text(((WIDTH - tw3) // 2, 730), announce, fill=(148, 163, 184), font=font_body)
    
    draw.line([(550, 820), (1370, 820)], fill=(16, 185, 129), width=2)
    return im

def render_how_it_works_outro(frame_idx, total_frames):
    im = BASE_CANVAS.copy()
    draw = ImageDraw.Draw(im)
    
    icon_size = 170
    scaled_icon = app_icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    icon_x = (WIDTH - icon_size) // 2
    icon_y = 180
    
    imask = Image.new('L', (icon_size, icon_size), 0)
    idraw = ImageDraw.Draw(imask)
    idraw.rounded_rectangle([(0, 0), (icon_size, icon_size)], radius=38, fill=255)
    im.paste(scaled_icon, (icon_x, icon_y), imask)
    
    title = "Start Using Bizora in Under 60 Seconds"
    bbox = font_outro_title.getbbox(title)
    tw = bbox[2] - bbox[0]
    draw.text(((WIDTH - tw) // 2, 390), title, fill=(255, 255, 255), font=font_outro_title)
    
    sub = "No hardware required. Zero paper registers. 100% cloud sync."
    bbox2 = font_subtitle.getbbox(sub)
    tw2 = bbox2[2] - bbox2[0]
    draw.text(((WIDTH - tw2) // 2, 470), sub, fill=(148, 163, 184), font=font_subtitle)
    
    cta_w = 480
    cta_h = 76
    cta_x = (WIDTH - cta_w) // 2
    cta_y = 550
    draw.rounded_rectangle([(cta_x, cta_y), (cta_x + cta_w, cta_y + cta_h)], radius=38, fill=(16, 185, 129), outline=(52, 211, 153), width=2)
    cta_text = "GET BIZORA ON GOOGLE PLAY"
    bbox3 = font_h2.getbbox(cta_text)
    tw3 = bbox3[2] - bbox3[0]
    draw.text((cta_x + (cta_w - tw3) // 2, cta_y + 24), cta_text, fill=(6, 12, 19), font=font_h2)
    
    pkg_text = "Package: bizora.app • Android 15 & 16 KB Ready • Bank-Grade Security"
    bbox4 = font_body.getbbox(pkg_text)
    tw4 = bbox4[2] - bbox4[0]
    draw.text(((WIDTH - tw4) // 2, 660), pkg_text, fill=(100, 116, 139), font=font_body)
    
    draw.line([(550, 740), (1370, 740)], fill=(30, 41, 59), width=1)
    footer = "www.bizora.app • Smart Attendance & Team Management"
    bbox5 = font_body.getbbox(footer)
    tw5 = bbox5[2] - bbox5[0]
    draw.text(((WIDTH - tw5) // 2, 770), footer, fill=(16, 185, 129), font=font_body)
    return im

def main():
    print("Beginning synchronized video and narration assembly...")
    frame_counter = 0
    audio_cues = []
    
    # 1. Intro Slide
    intro_frames = int(intro_duration * FPS)
    intro_start_time = frame_counter / FPS
    audio_cues.append({'time': intro_start_time + 0.3, 'file': audio_files['intro']})
    print(f"Rendering Intro ({intro_frames} frames, audio cue at {intro_start_time + 0.3:.2f}s)...")
    for f in range(intro_frames):
        im = render_how_it_works_intro(f, intro_frames)
        im.save(os.path.join(TMP_FRAMES_DIR, f"frame_{frame_counter:05d}.png"))
        frame_counter += 1
        
    # 2. 8 Steps
    total_steps = len(workflow_steps)
    for s_idx, step in enumerate(workflow_steps):
        step_frames = int(step['duration_sec'] * FPS)
        step_start_time = frame_counter / FPS
        audio_cues.append({'time': step_start_time + 0.25, 'file': audio_files[step['key']]})
        print(f"Rendering Step {s_idx + 1}/{total_steps}: {step['title']} ({step_frames} frames, audio at {step_start_time + 0.25:.2f}s)...")
        for f in range(step_frames):
            im = render_step_slide(step, f, step_frames, s_idx, total_steps)
            im.save(os.path.join(TMP_FRAMES_DIR, f"frame_{frame_counter:05d}.png"))
            frame_counter += 1
            
    # 3. Outro
    outro_frames = int(outro_duration * FPS)
    outro_start_time = frame_counter / FPS
    audio_cues.append({'time': outro_start_time + 0.3, 'file': audio_files['outro']})
    print(f"Rendering Outro ({outro_frames} frames, audio at {outro_start_time + 0.3:.2f}s)...")
    for f in range(outro_frames):
        im = render_how_it_works_outro(f, outro_frames)
        im.save(os.path.join(TMP_FRAMES_DIR, f"frame_{frame_counter:05d}.png"))
        frame_counter += 1
        
    total_duration_sec = frame_counter / FPS
    print(f"\nRendered {frame_counter} total frames (~{total_duration_sec:.1f}s)")
    
    # Save Audio Cues JSON
    with open(TMP_CUES_JSON, 'w') as f:
        json.dump(audio_cues, f, indent=2)
    print("Audio cues mapped:", json.dumps(audio_cues, indent=2))
    
    # 4. Encode video frames to raw MP4
    print("Encoding video frames to MP4 with hardware acceleration...")
    cmd_encode = [ENCODER_BIN, TMP_FRAMES_DIR, str(FPS), TMP_RAW_VIDEO]
    res_encode = subprocess.run(cmd_encode, capture_output=True, text=True)
    print(res_encode.stdout)
    if res_encode.returncode != 0:
        print("Encoder error:", res_encode.stderr)
        raise RuntimeError("Video frame encoding failed")
        
    # 5. Mux with voiceover narration
    print("Muxing video with multi-track voiceover narration...")
    cmd_mux = [MUXER_BIN, TMP_RAW_VIDEO, TMP_CUES_JSON, FINAL_VOICED_VIDEO]
    res_mux = subprocess.run(cmd_mux, capture_output=True, text=True)
    print(res_mux.stdout)
    if res_mux.returncode != 0:
        print("Muxer error:", res_mux.stderr)
        raise RuntimeError("Audio-video muxing failed")
        
    # Copy to standard demonstration file name as well
    shutil.copy2(FINAL_VOICED_VIDEO, STANDARD_NAME_VIDEO)
    
    # Clean up temporary frames
    shutil.rmtree(TMP_DIR, ignore_errors=True)
    
    file_size_mb = os.path.getsize(FINAL_VOICED_VIDEO) / (1024 * 1024)
    print(f"\n==================================================================")
    print(f"SUCCESS: Voiceover Demo Video created: {FINAL_VOICED_VIDEO} ({file_size_mb:.2f} MB, {total_duration_sec:.1f}s)")
    print(f"Updated primary demo: {STANDARD_NAME_VIDEO}")
    print(f"==================================================================")

if __name__ == '__main__':
    main()
