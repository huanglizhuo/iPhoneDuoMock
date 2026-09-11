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


# Placeholder demo screens: Apple's own lock screen imagery from the iPhone Duo
# viewer. inner is 2048x1441 (inner landscape ratio), outer is exactly 1398x2034.
# Portrait/standing variants are centre crops so every file matches its slot spec.
demo = pathlib.Path('public/demo/apple')
demo.mkdir(parents=True, exist_ok=True)
inner = decode_ktx('lockscreen_ui_inner-wallpaper_png.ktx')
outer = decode_ktx('lockscreen_ui_outer-wallpaper_png.ktx')
assert inner.size == (2048, 1441) and outer.size == (1398, 2034)
inner.resize((2853, 2007), Image.LANCZOS).save(demo / 'inner.png', optimize=True)
portrait_width = round(inner.height * 2007 / 2853)
inner.crop(
    ((inner.width - portrait_width) // 2, 0, (inner.width + portrait_width) // 2, inner.height)
).resize((2007, 2853), Image.LANCZOS).save(demo / 'inner-portrait.png', optimize=True)
landscape_height = round(inner.width * 1398 / 2034)
inner.crop(
    (0, (inner.height - landscape_height) // 2, inner.width, (inner.height + landscape_height) // 2)
).resize((2034, 1398), Image.LANCZOS).save(demo / 'outer-landscape.png', optimize=True)
outer.save(demo / 'outer.png', optimize=True)
print(
    f'Prepared {len(model["meshes"])} meshes, {len(model["images"])} textures, '
    f'{len(model["animations"])} animations, 4 demo screens'
)
