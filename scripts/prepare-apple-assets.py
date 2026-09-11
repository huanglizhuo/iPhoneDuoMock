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


def decode_ktx(name):
    data = (source / name).read_bytes()
    fmt, _, width, height = struct.unpack_from('<4I', data, 12)
    assert fmt in (165, 166), f'Unexpected ASTC format: {fmt}'
    offset, size, _ = struct.unpack_from('<3Q', data, 80)
    rgba = texture2ddecoder.decode_astc(data[offset:offset + size], width, height, 6, 6)
    return Image.frombytes('RGBA', (width, height), rgba, 'raw', 'BGRA').convert('RGB')


# Placeholder demo screens: the wallpaper from the page's #product-gallery
# viewer, statically composited from its parallax layers (sky / far dunes /
# hills / close dunes). The layers are opaque strips whose soft edges are
# baked into RGB, so simple bottom-up overlapping reproduces the scene.
demo = pathlib.Path('public/demo/apple')
demo.mkdir(parents=True, exist_ok=True)
layers = {
    part: decode_ktx(f'{name}_cropped-wallpaper_png.ktx')
    for part, name in [
        ('sky', 'sky_3k'),
        ('far', 'dune_far_3k'),
        ('hills', 'hills_5k'),
        ('close', 'dune_close_3k'),
    ]
}


def compose_wallpaper(width, height):
    canvas = Image.new('RGB', (width, height))
    dune_share = 0.62 if width < height else 0.55
    sky = layers['sky'].resize((width, round(height * (1 - dune_share))), Image.LANCZOS)
    canvas.paste(sky, (0, 0))
    band = round(height * dune_share)
    close = layers['close'].resize((width, round(band * 0.66)), Image.LANCZOS)
    hills = layers['hills'].resize((width, round(band * 0.16)), Image.LANCZOS)
    far = layers['far'].resize((width, round(band * 0.13)), Image.LANCZOS)
    canvas.paste(far, (0, height - close.height - hills.height + round(band * 0.05)))
    canvas.paste(hills, (0, height - close.height - round(hills.height * 0.35)))
    canvas.paste(close, (0, height - close.height))
    return canvas


for name, width, height in [
    ('inner', 2853, 2007),
    ('inner-portrait', 2007, 2853),
    ('outer', 1398, 2034),
    ('outer-landscape', 2034, 1398),
]:
    compose_wallpaper(width, height).save(demo / f'{name}.png', optimize=True)
print(
    f'Prepared {len(model["meshes"])} meshes, {len(model["images"])} textures, '
    f'{len(model["animations"])} animations, 4 demo screens'
)
