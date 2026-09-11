"""Development-only asset conversion. Runtime requires no Python or external requests.

Original files are recorded in reference/apple-duo/urls.json.
Requires Pillow and texture2ddecoder. Preserves Apple's geometry, rig and animation.
"""
import json
import pathlib
import shutil
import struct
import texture2ddecoder
from PIL import Image

source = pathlib.Path('reference/apple-duo')
target = pathlib.Path('public/models/apple-duo')
target.mkdir(parents=True, exist_ok=True)
model = json.loads((source / 'vroIlOhiWPzmavg.gltf').read_text())

for image in model['images']:
    data = (source / image['uri']).read_bytes()
    fmt, _, width, height = struct.unpack_from('<4I', data, 12)
    assert fmt in (165, 166), f'Unexpected ASTC format: {fmt}'
    offset, size, _ = struct.unpack_from('<3Q', data, 80)
    rgba = texture2ddecoder.decode_astc(data[offset:offset + size], width, height, 6, 6)
    name = pathlib.Path(image['uri']).with_suffix('.png').name
    Image.frombytes('RGBA', (width, height), rgba, 'raw', 'BGRA').save(target / name)
    image.update(uri=name, mimeType='image/png')

# Lotus has custom coat/edge shaders; retain standard glTF clearcoat/specular.
model['extensionsUsed'] = ['KHR_materials_specular', 'KHR_materials_clearcoat']
for material in model['materials']:
    extensions = material.get('extensions', {})
    extensions.pop('KHR_materials_coat', None)
    extensions.get('KHR_materials_specular', {}).pop('extensions', None)

(target / 'duo.gltf').write_text(json.dumps(model, separators=(',', ':')))
shutil.copyfile(source / 'vroIlOhiWPzmavg.bin', target / 'vroIlOhiWPzmavg.bin')
shutil.copyfile(source / 'SfFEyQuyjAgUwjH.exr', target / 'studio.exr')
scene = json.loads((source / 'device-scene.json').read_text())
materials = scene['children'][0]['children'][0]['children'][0]['materials']
(target / 'materials.json').write_text(json.dumps(materials, separators=(',', ':')))


# Placeholder demo screens: the lock screen from the page's #product-gallery
# viewer. The wallpaper is statically composited from its parallax layers
# (sky / far dunes / hills / close dunes; the strips are opaque with soft
# edges baked into RGB, so bottom-up overlapping reproduces the scene — the
# sky's darkest strip stretches down as a base so no gap can show). The
# lock-screen UI (9:41 clock, date, buttons, home bar) ships as transparent
# overlays and is composited on top: the inner plate on landscape screens,
# the outer plate on portrait ones.
def decode_ktx_rgba(name):
    data = (source / name).read_bytes()
    fmt, _, width, height = struct.unpack_from('<4I', data, 12)
    assert fmt in (165, 166), f'Unexpected ASTC format: {fmt}'
    offset, size, _ = struct.unpack_from('<3Q', data, 80)
    rgba = texture2ddecoder.decode_astc(data[offset:offset + size], width, height, 6, 6)
    return Image.frombytes('RGBA', (width, height), rgba, 'raw', 'BGRA')


demo = pathlib.Path('public/demo/apple')
demo.mkdir(parents=True, exist_ok=True)
layers = {
    part: decode_ktx_rgba(f'{name}_cropped-wallpaper_png.ktx')
    for part, name in [
        ('sky', 'sky_3k'),
        ('far', 'dune_far_3k'),
        ('hills', 'hills_5k'),
        ('close', 'dune_close_3k'),
    ]
}
ui_inner = decode_ktx_rgba('lockscreen_ui_inner-wallpaper_png.ktx')
ui_outer = decode_ktx_rgba('lockscreen_ui_outer-wallpaper_png.ktx')


def compose_wallpaper(width, height):
    canvas = Image.new('RGB', (width, height))
    sky_h = round(height * 0.5)
    canvas.paste(layers['sky'].resize((width, sky_h), Image.LANCZOS), (0, 0))
    tail = layers['sky'].crop(
        (0, layers['sky'].height - 10, layers['sky'].width, layers['sky'].height)
    )
    canvas.paste(tail.resize((width, height - sky_h), Image.LANCZOS), (0, sky_h))
    band = round(height * (0.62 if width < height else 0.55))
    close_h, hills_h, far_h = (round(band * 0.66), round(band * 0.16), round(band * 0.13))
    canvas.paste(
        layers['far'].resize((width, far_h), Image.LANCZOS), (0, sky_h - round(far_h * 0.35))
    )
    canvas.paste(
        layers['hills'].resize((width, hills_h), Image.LANCZOS),
        (0, height - close_h - round(hills_h * 0.35)),
    )
    canvas.paste(layers['close'].resize((width, close_h), Image.LANCZOS), (0, height - close_h))
    return canvas


def overlay_lock_screen(canvas, ui):
    scale = canvas.height / ui.height
    plate = ui.resize((round(ui.width * scale), canvas.height), Image.LANCZOS)
    canvas.paste(plate, ((canvas.width - plate.width) // 2, 0), plate)
    return canvas


for name, width, height, ui in [
    ('inner', 2853, 2007, ui_inner),
    ('inner-portrait', 2007, 2853, ui_outer),
    ('outer', 1398, 2034, ui_outer),
    ('outer-landscape', 2034, 1398, ui_inner),
]:
    overlay_lock_screen(compose_wallpaper(width, height), ui).save(
        demo / f'{name}.png', optimize=True
    )
print(
    f'Prepared {len(model["meshes"])} meshes, {len(model["images"])} textures, '
    f'{len(model["animations"])} animations, 4 demo screens'
)
