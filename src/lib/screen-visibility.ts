import * as THREE from 'three';

/** Render screen IDs with the same depth test as the device, so DOM cannot cover its body. */
export class ScreenVisibility {
  private target = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });
  private body = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
  private inner = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  private outer = new THREE.MeshBasicMaterial({ color: 0x00ff00, toneMapped: false });
  private canvas = document.createElement('canvas');
  private bytes = new Uint8Array(4);
  constructor() {
    this.canvas.width = this.canvas.height = 1;
    this.inner.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float screenHalf;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nscreenHalf = position.x;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float screenHalf;')
        .replace(
          '#include <color_fragment>',
          '#include <color_fragment>\ndiffuseColor.rgb = screenHalf < 0. ? vec3(0.,0.,1.) : vec3(1.,0.,0.);',
        );
    };
  }
  render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    model: THREE.Group,
    camera: THREE.Camera,
    width: number,
    height: number,
    split: boolean,
  ) {
    const w = Math.max(1, Math.round(width)),
      h = Math.max(1, Math.round(height));
    if (this.target.width !== w || this.target.height !== h) {
      this.target.setSize(w, h);
      this.canvas.width = w;
      this.canvas.height = h;
      this.bytes = new Uint8Array(w * h * 4);
    }
    const materials: [THREE.Mesh, THREE.Material | THREE.Material[]][] = [];
    const previous = renderer.getRenderTarget(),
      color = renderer.getClearColor(new THREE.Color()),
      alpha = renderer.getClearAlpha();
    try {
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        materials.push([object, object.material]);
        object.material =
          object.name === 'skeleton_0_3_screenTexture_geo'
            ? this.inner
            : object.name === 'skeleton_0_7_outerDisplayScreenTexture_geo'
              ? this.outer
              : this.body;
      });
      renderer.setRenderTarget(this.target);
      renderer.setClearColor(0, 0);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(this.target, 0, 0, w, h, this.bytes);
    } finally {
      for (const [mesh, material] of materials) mesh.material = material;
      renderer.setRenderTarget(previous);
      renderer.setClearColor(color, alpha);
    }
    const ctx = this.canvas.getContext('2d')!;
    const result: Record<string, { mask: string; clip: string; visible: boolean }> = {};
    for (const id of split ? ['inner', 'inner-left', 'outer'] : ['inner', 'outer']) {
      const image = ctx.createImageData(w, h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const src = ((h - 1 - y) * w + x) * 4,
            dst = (y * w + x) * 4;
          image.data[dst] = image.data[dst + 1] = image.data[dst + 2] = 255;
          image.data[dst + 3] =
            id === 'outer'
              ? this.bytes[src + 1]
              : id === 'inner-left'
                ? this.bytes[src + 2]
                : Math.min(255, this.bytes[src] + (split ? 0 : this.bytes[src + 2]));
        }
      ctx.putImageData(image, 0, 0);
      // CSS masks affect paint but not iframe hit testing. Clip to the same visible pixels.
      const rows: string[] = [];
      const sx = width / w,
        sy = height / h;
      for (let y = 0; y < h; y++) {
        let start = -1;
        for (let x = 0; x <= w; x++) {
          const lit = x < w && image.data[(y * w + x) * 4 + 3] > 0;
          if (lit && start < 0) start = x;
          if (!lit && start >= 0) {
            rows.push(`M${start * sx} ${y * sy}H${x * sx}V${(y + 1) * sy}H${start * sx}Z`);
            start = -1;
          }
        }
      }
      result[id] = {
        visible: rows.length > 0,
        mask: `url("${this.canvas.toDataURL()}")`,
        clip: `path('${rows.join('')}')`,
      };
    }
    return result;
  }
  dispose() {
    this.target.dispose();
    this.body.dispose();
    this.inner.dispose();
    this.outer.dispose();
  }
}
