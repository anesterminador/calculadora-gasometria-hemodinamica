# Gera ícones 192 e 512 a partir do PNG do logo néon (recorte quadrado central)
from PIL import Image
import os

src = r"C:\Users\Davi\.cursor\projects\C-Users-Davi-AppData-Local-Temp-a27c9c9b-5e90-486b-926a-1cf090f4ac4d\assets\c__Users_Davi_AppData_Roaming_Cursor_User_workspaceStorage_1773248349391_images_Gemini_Generated_Image_z072slz072slz072_no-watermark-9471a54b-b66e-4702-9abb-b358e43452e2.png"
dest_dir = os.path.dirname(os.path.abspath(__file__))

img = Image.open(src).convert("RGBA")
w, h = img.size
size = min(w, h)
left = (w - size) // 2
top = (h - size) // 2
cropped = img.crop((left, top, left + size, top + size))

for s in (192, 512):
    out = cropped.resize((s, s), Image.Resampling.LANCZOS)
    out.save(os.path.join(dest_dir, f"icon-{s}.png"), "PNG")
    print(f"Salvo icon-{s}.png")
