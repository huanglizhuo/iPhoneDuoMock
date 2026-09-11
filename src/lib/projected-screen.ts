import * as THREE from 'three';

export function screenMotion(inner: boolean, open: number) {
  return Math.min(1, Math.max(0, inner ? (1 - open) * 2 : open * 2));
}

// Sampling adapted from chuspeeism/iphone-duo (MIT). See public/THIRD_PARTY_NOTICES.txt.
/** Project lit artwork through the moving glass onto a fixed plane.
 * Coordinates are in the glTF model's space AFTER skinning (Y is depth, Z vertical).
 * This is shared by preview and export; camera framing never follows the hinge.
 */
export class ProjectedScreen {
  private source?: THREE.CanvasTexture;
  private uniforms = {
    projectionEnabled: { value: 0 },
    projectionEye: { value: new THREE.Vector3(0, 40, 0) },
    projectionFrame: { value: new THREE.Vector4() },
    projectionPixel: { value: new THREE.Vector2(1 / 2048, 1 / 2048) },
    projectionMotion: { value: 0 },
  };
  constructor(
    readonly inner: boolean,
    material: THREE.MeshPhysicalMaterial,
  ) {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        '#include <common>\nvarying vec3 glassPosition;',
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        'glassPosition=transformed;\n#include <project_vertex>',
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_pars_fragment>',
        `
        #include <emissivemap_pars_fragment>
        varying vec3 glassPosition;
        uniform float projectionEnabled, projectionMotion;
        uniform vec3 projectionEye;
        uniform vec4 projectionFrame;
        uniform vec2 projectionPixel;
        vec2 imageCoverage(vec2 uv, vec2 feather) {
          // Extend the edge texels horizontally; only the top/bottom image
          // boundaries reveal black glass. A rectangular mask creates side bars
          // as perspective pushes the moving leaf beyond the artwork plane.
          return vec2(1., smoothstep(-feather.y,feather.y,uv.y)*(1.-smoothstep(1.-feather.y,1.+feather.y,uv.y)));
        }
        vec3 projectedContent() {
          float depth=(.2492995-projectionEye.y)/(glassPosition.y-projectionEye.y);
          vec2 hit=projectionEye.xz+(glassPosition.xz-projectionEye.xz)*depth;
          vec2 uv=(hit-projectionFrame.xy)/projectionFrame.zw;
          float gradient=${inner ? 'clamp(1.-uv.x*2.,0.,1.)' : 'clamp(uv.x,0.,1.)'};
          float motion=smoothstep(0.,1.,projectionMotion);
          float radius=72./2670./projectionPixel.x*motion*pow(gradient,1.35);
          vec2 footprint=max(fwidth(uv),projectionPixel*.5);
          float baseLod=log2(max(1.,max(length(dFdx(uv)/projectionPixel),length(dFdy(uv)/projectionPixel))));
          vec2 coverage=imageCoverage(uv,footprint);
          vec3 color=textureLod(emissiveMap,clamp(uv,0.,1.),baseLod).rgb*coverage.x*coverage.y;
          if(radius>.01) {
            float lod=max(baseLod,log2(max(1.,radius)));
            vec2 feather=max(footprint,projectionPixel*radius*.75);
            color=vec3(0.);
            for(int y=-2;y<=2;y++) for(int x=-2;x<=2;x++) {
              float wx=x==0?6.:(abs(x)==1?4.:1.);
              float wy=y==0?6.:(abs(y)==1?4.:1.);
              vec2 sampleUv=uv+vec2(float(x),float(y))*projectionPixel*radius;
              vec2 mask=imageCoverage(sampleUv,feather);
              color+=textureLod(emissiveMap,clamp(sampleUv,0.,1.),lod).rgb*mask.x*mask.y*wx*wy/256.;
            }
          }
          float darkening=motion*pow(clamp((gradient-.2)/.8,0.,1.),1.35);
          return color*(1.-min(1.,darkening*2.));
        }
      `,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #ifdef USE_EMISSIVEMAP
          totalEmissiveRadiance *= projectionEnabled>.5 ? projectedContent() : texture2D(emissiveMap,vEmissiveMapUv).rgb;
        #endif
      `,
      );
    };
    material.customProgramCacheKey = () => `duo-projection-${inner ? 'inner' : 'outer'}-v2`;
  }
  get frame() {
    return this.uniforms.projectionFrame.value;
  }
  get texture() {
    return this.source!;
  }
  setArtwork(canvas: HTMLCanvasElement) {
    this.source?.dispose();
    this.source = new THREE.CanvasTexture(canvas);
    this.source.flipY = false;
    this.source.colorSpace = THREE.SRGBColorSpace;
    this.source.anisotropy = 4;
    this.uniforms.projectionPixel.value.set(1 / canvas.width, 1 / canvas.height);
  }
  update(enabled: boolean, open: number, eye: THREE.Vector3, hinge: THREE.Vector3) {
    this.uniforms.projectionEnabled.value = enabled ? 1 : 0;
    this.uniforms.projectionMotion.value = screenMotion(this.inner, open);
    this.uniforms.projectionEye.value.copy(eye);
    if (this.inner)
      this.uniforms.projectionFrame.value.set(-7.8922534, -5.51794, 15.7845068, 11.03588);
    else {
      // Keep the projected image's left edge at the hinge; size is calibrated
      // once against the closed outer screen, never the moving bounding box.
      const closedDepth = (0.2492995 - eye.y) / (0.8276538 - eye.y);
      const hingeDepth = (0.2492995 - eye.y) / (hinge.y - eye.y);
      const anchor = eye.x + (hinge.x - eye.x) * hingeDepth;
      const top = eye.z + (-5.5913858 - eye.z) * closedDepth;
      this.uniforms.projectionFrame.value.set(
        anchor,
        top,
        7.7323975 * closedDepth,
        11.1827716 * closedDepth,
      );
    }
  }
  dispose() {
    this.source?.dispose();
  }
}
