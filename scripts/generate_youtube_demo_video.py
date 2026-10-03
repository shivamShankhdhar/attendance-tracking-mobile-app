#!/usr/bin/env python3
"""
Generate a professional, Full HD (1920x1080 @ 30fps) YouTube demonstration video
showcasing the real Bizora application features.
"""

import os
import shutil
import math
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

WIDTH = 1920
HEIGHT = 1080
FPS = 30

PROJECT_ROOT = '/Users/shivamshankhdhar/Projects/attendance-tracker-full-stack'
SCREENSHOTS_DIR = os.path.join(PROJECT_ROOT, 'frontend/store-assets/screenshots')
ICON_PATH = os.path.join(PROJECT_ROOT, 'frontend/store-assets/icon/bizora_store_icon_512x512.png')
TMP_FRAMES_DIR = '/tmp/bizora_video_frames'
OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'frontend/store-assets/video')
OUTPUT_VIDEO_PATH = os.path.join(OUTPUT_DIR, 'bizora_app_demonstration_1080p.mp4')
ENCODER_BIN = os.path.join(PROJECT_ROOT, 'frontend/scripts/encode_frames')

os.makedirs(OUTPUT_DIR, exist_ok=True)
if os.path.exists(TMP_FRAMES_DIR):
    shutil.rmtree(TMP_FRAMES_DIR)
os.makedirs(TMP_FRAMES_DIR, exist_ok=True)

# Typography
font_title = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 48)
font_subtitle = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 24)
font_brand = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 22)
font_h2 = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 26)
font_body = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 21)
font_badge = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 19)
font_number = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 72)
font_outro_title = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 58)
font_outro_sub = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 26)

# Load real screenshots
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

def create_base_canvas():
    """Create a dark, sleek background with subtle gradient and glowing emerald glow."""
    im = Image.new('RGB', (WIDTH, HEIGHT), (6, 12, 19))
    draw = ImageDraw.Draw(im)
    for y in range(HEIGHT):
        ratio = y / HEIGHT
        r = int(6 + 6 * ratio)
        g = int(12 + 10 * ratio)
        b = int(19 + 14 * ratio)
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b))
    
    # Glowing ambient sphere behind phone position (around x=1420, y=540)
    glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([1100, 180, 1750, 880], fill=(16, 185, 129, 22))
    gdraw.ellipse([1250, 320, 1600, 720], fill=(6, 182, 212, 18))
    glow = glow.filter(ImageFilter.GaussianBlur(60))
    im.paste(glow, (0, 0), glow)
    return im

BASE_CANVAS = create_base_canvas()

def get_phone_mockup(screen_img, target_h=860):
    """
    Renders an authentic screenshot inside a sleek, premium smartphone frame
    with rounded bezel, glass glare, and drop shadow.
    """
    aspect = screen_img.width / screen_img.height
    screen_h = target_h - 40
    screen_w = int(screen_h * aspect)
    
    scaled_screen = screen_img.resize((screen_w, screen_h), Image.Resampling.LANCZOS)
    
    # Mask screen with rounded corners
    corner_r = 36
    mask = Image.new('L', (screen_w, screen_h), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([(0, 0), (screen_w, screen_h)], radius=corner_r, fill=255)
    
    frame_w = screen_w + 30
    frame_h = screen_h + 30
    
    # Composite frame
    frame = Image.new('RGBA', (frame_w, frame_h), (0, 0, 0, 0))
    fdraw = ImageDraw.Draw(frame)
    # Outer body
    fdraw.rounded_rectangle([(0, 0), (frame_w, frame_h)], radius=46, fill=(18, 26, 36, 255), outline=(51, 65, 85, 255), width=2)
    # Inner rim
    fdraw.rounded_rectangle([(7, 7), (frame_w - 7, frame_h - 7)], radius=40, fill=(8, 12, 18, 255))
    
    # Paste screen
    frame.paste(scaled_screen, (15, 15), mask)
    
    # Top camera pill
    cx = frame_w // 2
    fdraw.rounded_rectangle([(cx - 40, 22), (cx + 40, 38)], radius=8, fill=(0, 0, 0, 240))
    fdraw.ellipse([(cx + 18, 26), (cx + 30, 34)], fill=(15, 23, 42, 255))
    
    # Drop shadow
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

# Pre-render phone mockups for all screens
print("Pre-rendering phone mockups...")
mockups = {k: get_phone_mockup(v) for k, v in screens.items()}

# Define Scenes
scenes_data = [
    {
        'id': 'welcome',
        'badge': 'SMART ONBOARDING & SETUP',
        'title': 'Welcome to Bizora',
        'subtitle': 'Touchless QR attendance & team tracking designed for modern businesses.',
        'bullets': [
            'Zero hardware setup — works instantly on any phone or tablet',
            'Instant multi-organization setup in under 60 seconds',
            'Clear workplace code for frictionless employee joining'
        ],
        'stat': ('0.5s', 'Fastest clock-in time'),
        'screen': 'welcome',
        'duration_sec': 4.0
    },
    {
        'id': 'qr',
        'badge': 'TOUCHLESS CLOCK-IN',
        'title': 'Dynamic Workplace QR',
        'subtitle': 'Secure high-density QR code check-in with GPS geo-verification.',
        'bullets': [
            'Staff scan with their camera when arriving on site',
            'Smart GPS radius check prevents remote spoofing',
            'Code refreshes automatically to stop screenshot sharing'
        ],
        'stat': ('100%', 'Touchless & Hygenic'),
        'screen': 'qr',
        'duration_sec': 4.5
    },
    {
        'id': 'dashboard',
        'badge': 'REAL-TIME WORKPLACE PULSE',
        'title': 'Live Today Dashboard',
        'subtitle': 'Monitor team presence, active shifts, and daily attendance at a single glance.',
        'bullets': [
            'Live Present, Absent & Late counters updated instantly',
            'Real-time employee pulse feed with arrival timestamps',
            '1-Tap manager approval for pending attendance requests'
        ],
        'stat': ('Live', 'Instant Cloud Sync'),
        'screen': 'dashboard',
        'duration_sec': 4.5
    },
    {
        'id': 'signin',
        'badge': 'FLEXIBLE ACCESS',
        'title': '1-Tap Google & PIN Login',
        'subtitle': 'Dual authentication tailored for desk managers and field staff.',
        'bullets': [
            'Instant 1-tap Google OAuth 2.0 single sign-on',
            'Dedicated Employee PIN & ID entry for shift workers',
            'No personal Google account required for deskless staff'
        ],
        'stat': ('2 Roles', 'Admin & Team Members'),
        'screen': 'signin',
        'duration_sec': 4.2
    },
    {
        'id': 'directory',
        'badge': 'TEAM MANAGEMENT',
        'title': 'Staff Directory & Roles',
        'subtitle': 'Effortlessly organize employees, assign shift schedules, and manage codes.',
        'bullets': [
            'Quick "+ Add new" action with custom staff codes',
            'Shareable 1-tap workplace invite link via WhatsApp/SMS',
            'Instant search, filtering, and role permission control'
        ],
        'stat': ('Unlimited', 'Staff Capacity'),
        'screen': 'directory',
        'duration_sec': 4.2
    },
    {
        'id': 'explorer',
        'badge': 'ATTENDANCE HISTORY',
        'title': 'Attendance Explorer',
        'subtitle': 'Audit-ready daily, weekly, and monthly attendance records with date navigation.',
        'bullets': [
            'Interactive calendar date picker to inspect past records',
            'Detailed check-in timestamps and verification badges',
            'Export complete records to Excel (.xlsx) in one tap'
        ],
        'stat': ('1-Tap', 'Audit-Ready Reports'),
        'screen': 'explorer',
        'duration_sec': 4.5
    },
    {
        'id': 'pin',
        'badge': 'DESKLESS SHIFT WORKERS',
        'title': 'Staff PIN & Kiosk Clock-In',
        'subtitle': 'Simple 4-digit numeric PIN dialer for shared workplace devices.',
        'bullets': [
            'Employees clock in with their assigned workplace code & PIN',
            'Ideal for shared tablets at the front counter or entry gate',
            'Fast, familiar keypad dialer with zero learning curve'
        ],
        'stat': ('4-Digit', 'Simple Shift Access'),
        'screen': 'pin',
        'duration_sec': 4.2
    },
    {
        'id': 'security',
        'badge': 'ENTERPRISE SECURITY',
        'title': 'Biometric & MPIN Lock',
        'subtitle': 'Protect sensitive employee and payroll records with bank-grade security.',
        'bullets': [
            'Hardware-backed Fingerprint and Face Unlock support',
            'Encrypted 4-digit Master MPIN fallback',
            'Automatic app lock on minimize or backgrounding'
        ],
        'stat': ('AES-256', 'On-Device Security'),
        'screen': 'security',
        'duration_sec': 4.2
    },
]

def render_feature_slide(scene, frame_in_scene, total_frames_in_scene, scene_idx, total_scenes):
    """Renders a single frame for an app feature scene with smooth float and typography."""
    im = BASE_CANVAS.copy()
    draw = ImageDraw.Draw(im)
    
    # 1. Header Bar
    # Bizora Brand Pill
    brand_pill_w = 170
    draw.rounded_rectangle([(100, 60), (100 + brand_pill_w, 102)], radius=21, fill=(16, 185, 129, 35), outline=(16, 185, 129), width=1)
    # Mini icon
    scaled_icon = app_icon.resize((26, 26), Image.Resampling.LANCZOS)
    im.paste(scaled_icon, (114, 68), scaled_icon)
    draw.text((150, 70), "BIZORA", fill=(16, 185, 129), font=font_brand)
    
    # Scene Counter
    draw.text((WIDTH - 240, 70), f"FEATURE {scene_idx + 1:02d} / {total_scenes:02d}", fill=(148, 163, 184), font=font_badge)
    
    # 2. Content Column (Left Side: x=100 to 920)
    # Badge
    draw.text((100, 150), scene['badge'], fill=(6, 182, 212), font=font_badge)
    
    # Main Title
    draw.text((100, 190), scene['title'], fill=(255, 255, 255), font=font_title)
    
    # Subtitle
    # Wrap subtitle if needed
    sub = scene['subtitle']
    draw.text((100, 260), sub, fill=(148, 163, 184), font=font_subtitle)
    
    # Divider line
    draw.line([(100, 320), (900, 320)], fill=(30, 41, 59), width=1)
    
    # Bullets
    by = 360
    for bullet in scene['bullets']:
        # Green check circle
        draw.ellipse([(100, by + 4), (128, by + 32)], fill=(16, 185, 129, 45), outline=(16, 185, 129), width=2)
        # Checkmark lines
        draw.line([(108, by + 18), (114, by + 24)], fill=(16, 185, 129), width=2)
        draw.line([(114, by + 24), (122, by + 12)], fill=(16, 185, 129), width=2)
        
        # Bullet text
        draw.text((144, by + 4), bullet, fill=(226, 232, 240), font=font_h2)
        by += 72
        
    # Stat Highlight Card
    stat_val, stat_label = scene['stat']
    card_x = 100
    card_y = by + 25
    draw.rounded_rectangle([(card_x, card_y), (card_x + 460, card_y + 110)], radius=20, fill=(15, 23, 42, 220), outline=(51, 65, 85), width=1)
    # Glowing dot
    draw.ellipse([(card_x + 28, card_y + 36), (card_x + 44, card_y + 52)], fill=(16, 185, 129))
    draw.text((card_x + 60, card_y + 22), stat_val, fill=(255, 255, 255), font=font_number)
    draw.text((card_x + 60, card_y + 78), stat_label.upper(), fill=(148, 163, 184), font=font_badge)
    
    # 3. Phone Mockup (Right Side: centered around x=1380)
    # Subtle floating sine wave animation (moves up/down by 8px)
    float_offset = math.sin((frame_in_scene / total_frames_in_scene) * math.pi * 2) * 8
    phone_img = mockups[scene['screen']]
    
    phone_x = 1140
    phone_y = int(95 + float_offset)
    im.paste(phone_img, (phone_x, phone_y), phone_img)
    
    # 4. Global Timeline Progress Bar (Bottom)
    progress_w = int((frame_in_scene / total_frames_in_scene) * (WIDTH - 200))
    draw.line([(100, HEIGHT - 35), (WIDTH - 100, HEIGHT - 35)], fill=(30, 41, 59), width=4)
    if progress_w > 0:
        draw.line([(100, HEIGHT - 35), (100 + progress_w, HEIGHT - 35)], fill=(16, 185, 129), width=4)
        draw.ellipse([(100 + progress_w - 6, HEIGHT - 41), (100 + progress_w + 6, HEIGHT - 29)], fill=(255, 255, 255))
        
    return im

def render_intro_slide(frame_idx, total_intro_frames):
    """Renders the cinematic intro card."""
    im = BASE_CANVAS.copy()
    draw = ImageDraw.Draw(im)
    
    # Center Icon
    icon_size = 190
    scaled_icon = app_icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    icon_x = (WIDTH - icon_size) // 2
    icon_y = 220
    
    # Drop glow behind icon
    glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([icon_x - 40, icon_y - 40, icon_x + icon_size + 40, icon_y + icon_size + 40], fill=(16, 185, 129, 90))
    glow = glow.filter(ImageFilter.GaussianBlur(35))
    im.paste(glow, (0, 0), glow)
    
    # Mask icon with rounded corners
    imask = Image.new('L', (icon_size, icon_size), 0)
    idraw = ImageDraw.Draw(imask)
    idraw.rounded_rectangle([(0, 0), (icon_size, icon_size)], radius=42, fill=255)
    im.paste(scaled_icon, (icon_x, icon_y), imask)
    
    # App Title
    title = "Bizora: Attendance Tracker"
    bbox = font_outro_title.getbbox(title)
    tw = bbox[2] - bbox[0]
    draw.text(((WIDTH - tw) // 2, 460), title, fill=(255, 255, 255), font=font_outro_title)
    
    # Tagline
    tagline = "Smart Attendance, Touchless QR Check-In & Team Management"
    bbox2 = font_subtitle.getbbox(tagline)
    tw2 = bbox2[2] - bbox2[0]
    draw.text(((WIDTH - tw2) // 2, 545), tagline, fill=(16, 185, 129), font=font_subtitle)
    
    # Badges Row
    badges = ["📱 TOUCHLESS QR", "📊 LIVE PULSE FEED", "🔒 BIOMETRIC & MPIN", "📈 EXCEL EXPORTS"]
    bx = 400
    by = 640
    for b in badges:
        bw = len(b) * 13 + 36
        draw.rounded_rectangle([(bx, by), (bx + bw, by + 46)], radius=23, fill=(15, 23, 42, 220), outline=(51, 65, 85), width=1)
        draw.text((bx + 18, by + 12), b, fill=(226, 232, 240), font=font_badge)
        bx += bw + 24
        
    # Walkthrough announcement
    sub_text = "Official App Feature Walkthrough • Version 1.0.1"
    bbox3 = font_body.getbbox(sub_text)
    tw3 = bbox3[2] - bbox3[0]
    draw.text(((WIDTH - tw3) // 2, 750), sub_text, fill=(148, 163, 184), font=font_body)
    
    # Bottom accent line
    draw.line([(600, 840), (1320, 840)], fill=(16, 185, 129), width=2)
    return im

def render_outro_slide(frame_idx, total_outro_frames):
    """Renders the cinematic call-to-action closing card."""
    im = BASE_CANVAS.copy()
    draw = ImageDraw.Draw(im)
    
    # Center Icon
    icon_size = 170
    scaled_icon = app_icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    icon_x = (WIDTH - icon_size) // 2
    icon_y = 190
    
    imask = Image.new('L', (icon_size, icon_size), 0)
    idraw = ImageDraw.Draw(imask)
    idraw.rounded_rectangle([(0, 0), (icon_size, icon_size)], radius=38, fill=255)
    im.paste(scaled_icon, (icon_x, icon_y), imask)
    
    # Main CTA
    title = "Ready to Simplify Your Workplace Attendance?"
    bbox = font_outro_title.getbbox(title)
    tw = bbox[2] - bbox[0]
    draw.text(((WIDTH - tw) // 2, 410), title, fill=(255, 255, 255), font=font_outro_title)
    
    sub = "Say goodbye to paper registers and costly biometric hardware."
    bbox2 = font_subtitle.getbbox(sub)
    tw2 = bbox2[2] - bbox2[0]
    draw.text(((WIDTH - tw2) // 2, 490), sub, fill=(148, 163, 184), font=font_subtitle)
    
    # Google Play Store Pill
    cta_w = 460
    cta_h = 76
    cta_x = (WIDTH - cta_w) // 2
    cta_y = 570
    draw.rounded_rectangle([(cta_x, cta_y), (cta_x + cta_w, cta_y + cta_h)], radius=38, fill=(16, 185, 129), outline=(52, 211, 153), width=2)
    cta_text = "GET IT ON GOOGLE PLAY"
    bbox3 = font_h2.getbbox(cta_text)
    tw3 = bbox3[2] - bbox3[0]
    draw.text((cta_x + (cta_w - tw3) // 2, cta_y + 22), cta_text, fill=(6, 12, 19), font=font_h2)
    
    # Package Details
    pkg_text = "Package: bizora.app • Android 15 & 16 KB Ready • Bank-Grade Security"
    bbox4 = font_body.getbbox(pkg_text)
    tw4 = bbox4[2] - bbox4[0]
    draw.text(((WIDTH - tw4) // 2, 680), pkg_text, fill=(100, 116, 139), font=font_body)
    
    # Bottom brand footer
    draw.line([(550, 760), (1370, 760)], fill=(30, 41, 59), width=1)
    footer = "www.bizora.app • Made for Growing Businesses"
    bbox5 = font_body.getbbox(footer)
    tw5 = bbox5[2] - bbox5[0]
    draw.text(((WIDTH - tw5) // 2, 790), footer, fill=(16, 185, 129), font=font_body)
    
    return im

def main():
    print("Generating demonstration video frames...")
    frame_counter = 0
    
    # 1. Intro Slide (3.5 seconds = 105 frames)
    intro_frames = int(3.5 * FPS)
    print(f"Rendering Intro ({intro_frames} frames)...")
    for f in range(intro_frames):
        im = render_intro_slide(f, intro_frames)
        im.save(os.path.join(TMP_FRAMES_DIR, f"frame_{frame_counter:05d}.png"))
        frame_counter += 1
        
    # 2. Feature Scenes (8 scenes)
    total_scenes = len(scenes_data)
    for s_idx, scene in enumerate(scenes_data):
        scene_frames = int(scene['duration_sec'] * FPS)
        print(f"Rendering Scene {s_idx + 1}/{total_scenes}: {scene['title']} ({scene_frames} frames)...")
        for f in range(scene_frames):
            im = render_feature_slide(scene, f, scene_frames, s_idx, total_scenes)
            im.save(os.path.join(TMP_FRAMES_DIR, f"frame_{frame_counter:05d}.png"))
            frame_counter += 1
            
    # 3. Outro Slide (4.0 seconds = 120 frames)
    outro_frames = int(4.0 * FPS)
    print(f"Rendering Outro ({outro_frames} frames)...")
    for f in range(outro_frames):
        im = render_outro_slide(f, outro_frames)
        im.save(os.path.join(TMP_FRAMES_DIR, f"frame_{frame_counter:05d}.png"))
        frame_counter += 1
        
    print(f"\nTotal frames generated: {frame_counter} (~{frame_counter / FPS:.1f}s)")
    
    # 4. Encode to MP4 using Apple VideoToolbox / Swift AVAssetWriter
    print(f"Encoding frames to MP4 with native hardware acceleration...")
    cmd = [ENCODER_BIN, TMP_FRAMES_DIR, str(FPS), OUTPUT_VIDEO_PATH]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print(res.stdout)
    if res.returncode != 0:
        print("Encoder error:", res.stderr)
        raise RuntimeError("Video encoding failed")
        
    # Clean up tmp frames
    shutil.rmtree(TMP_FRAMES_DIR, ignore_errors=True)
    
    file_size_mb = os.path.getsize(OUTPUT_VIDEO_PATH) / (1024 * 1024)
    print(f"SUCCESS: Video exported to {OUTPUT_VIDEO_PATH} ({file_size_mb:.2f} MB)")

if __name__ == '__main__':
    main()
