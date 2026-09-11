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
print(f'Prepared {len(model["meshes"])} meshes, {len(model["images"])} textures, {len(model["animations"])} animations')
