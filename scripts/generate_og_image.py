"""Generate og-image.png for social previews from the SVG design."""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1200, 630
OUT = os.path.join(os.path.dirname(__file__), '..', 'web', 'public', 'og-image.png')

img = Image.new('RGB', (W, H), '#1a1a2e')
draw = ImageDraw.Draw(img)

# Inner card
draw.rounded_rectangle([40, 40, 1160, 590], radius=30, fill='#16213e')

# Try to use a system font; fall back to default
try:
    title_font = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 90)
    subtitle_font = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 34)
    body_font = ImageFont.truetype('C:/Windows/Fonts/segoeuil.ttf', 24)
    pill_font = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 26)
except Exception:
    title_font = ImageFont.load_default()
    subtitle_font = title_font
    body_font = title_font
    pill_font = title_font

# Title with hand emoji approximation
draw.text((600, 170), 'SignBridge', fill='#FF6B4A', font=title_font, anchor='mm')

# Coral accent line
draw.rounded_rectangle([500, 210, 700, 216], radius=3, fill='#FF6B4A')

# Subtitle
draw.text((600, 270), 'Bilingual ASL + PSL Sign Language Tutor', fill='#e0d6c2', font=subtitle_font, anchor='mm')

# Description
draw.text((600, 340), 'Learn sign language with live camera feedback', fill='#8a8578', font=body_font, anchor='mm')
draw.text((600, 375), 'Free, open-source, and private — all recognition runs in your browser.', fill='#8a8578', font=body_font, anchor='mm')

# URL pill
draw.rounded_rectangle([430, 440, 770, 500], radius=30, fill='#FF6B4A')
draw.text((600, 470), 'signbridge-kappa.vercel.app', fill='#ffffff', font=pill_font, anchor='mm')

img.save(OUT, 'PNG')
print(f'Saved OG image to {OUT}')
