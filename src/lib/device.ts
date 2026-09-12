import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import type { Page, Project } from './project';
import { screenCanvas, canvas, context, decodeImage } from './assets';
import { sceneSlot, resolveSlot, screenSlots } from './project';
import { screenSurface } from './browser';
import { ScreenVisibility } from './screen-visibility';
import { t } from '../i18n';
import { ProjectedScreen } from './projected-screen';
const MODEL = '/models/apple-duo/';
function artwork(c: HTMLCanvasElement, rotate: number) {
  if (!rotate) return c;
  const target = canvas(c.height, c.width),
    ctx = context(target);
  ctx.translate(rotate > 0 ? target.width : 0, rotate > 0 ? 0 : target.height);
  ctx.rotate((rotate * Math.PI) / 2);
  ctx.drawImage(c, 0, 0);
  return target;
}
/** Apple's skinned product model. Screens, rendering and exports remain local. */
export class DeviceRenderer {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36.24372, 1, 0.1, 100);
  private center = new THREE.Group();
  private view = new THREE.Group();
  private root = new THREE.Group();
  private orientation = new THREE.Group();
  private tilt = new THREE.Group();
  private model?: THREE.Group;
  private mixer?: THREE.AnimationMixer;
  private action?: THREE.AnimationAction;
  private environment?: THREE.WebGLRenderTarget;
  private screens: THREE.MeshPhysicalMaterial[] = [];
  private projections: ProjectedScreen[] = [];
  private outerMesh?: THREE.SkinnedMesh;
  private outerHingeIndex = 0;
  private finishes: { material: THREE.MeshStandardMaterial; color: THREE.Color }[] = [];
  private ready?: Promise<void>;
  private assetKey = '';
  private backgroundKey = '';
  private serial = 0;
  private disposed = false;
  private visibility?: ScreenVisibility;
  /** Decoded custom background, prepared asynchronously for synchronous use in compose(). */
  backgroundImage: HTMLImageElement | null = null;
  constructor(private textureLimit = 2048) {
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera.position.set(0, 0, -20);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.center);
    this.center.add(this.view);
    this.view.add(this.root);
    this.root.add(this.orientation);
    this.orientation.add(this.tilt);
    this.root.scale.setScalar(0.36);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x575968, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(-4, 8, -12);
    this.scene.add(key);
  }
  private async loadModel() {
    const [gltf, hdr] = await Promise.all([
      new GLTFLoader().loadAsync(MODEL + 'duo.gltf'),
      new EXRLoader().loadAsync(MODEL + 'studio.exr'),
    ]);
    this.model = gltf.scene;
    this.tilt.add(this.model);
    if (this.disposed) {
      hdr.dispose();
      this.releaseModel();
      return;
    }
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromEquirectangular(hdr);
    this.scene.environment = this.environment.texture;
    hdr.dispose();
    pmrem.dispose();
    const materials = new Set<THREE.Material>();
    this.model.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.frustumCulled = false;
      const m = o.material as THREE.MeshPhysicalMaterial;
      if (materials.has(m)) return;
      materials.add(m);
      m.envMapIntensity = 1.25;
      if (['lrXfpZcYrByzvym', 'NtNSwEIIFmIbXaY', 'MZiYIrcFSqDDBWG'].includes(m.name)) {
        m.color.setRGB(0.77, 0.79, 0.8);
        this.finishes.push({ material: m, color: m.color.clone() });
      }
    });
    for (const [i, name] of [
      'skeleton_0_3_screenTexture_geo',
      'skeleton_0_7_outerDisplayScreenTexture_geo',
    ].entries()) {
      const mesh = this.model.getObjectByName(name) as THREE.SkinnedMesh;
      if (!mesh) throw new Error(t('errors.deviceMesh'));
      const m = mesh.material as THREE.MeshPhysicalMaterial;
      m.toneMapped = false;
      m.color.set(0x000000);
      m.emissive.set(0xffffff);
      m.emissiveIntensity = 1;
      m.emissiveMap?.dispose();
      m.emissiveMap = null;
      this.screens.push(m);
      this.projections.push(new ProjectedScreen(i === 0, m));
      if (i === 1) {
        this.outerMesh = mesh;
        const pos = mesh.geometry.getAttribute('position');
        let max = -Infinity;
        for (let j = 0; j < pos.count; j++)
          if (pos.getX(j) > max) {
            max = pos.getX(j);
            this.outerHingeIndex = j;
          }
      }
    }
    this.mixer = new THREE.AnimationMixer(this.model);
    const clip = gltf.animations.find((a) => a.name === 'Slider');
    if (!clip) throw new Error(t('errors.deviceClip'));
    this.action = this.mixer.clipAction(clip);
    this.action.setLoop(THREE.LoopOnce, 1);
    this.action.clampWhenFinished = true;
    this.action.play();
  }
  async prepare(project: Project, page: Page) {
    if (this.disposed) return;
    await (this.ready ??= this.loadModel());
    if (this.disposed) return;
    const background = project.view.backgroundImage?.data ?? '';
    if (background !== this.backgroundKey) {
      const image = background ? await decodeImage(background) : null;
      if (this.disposed) return;
      this.backgroundKey = background;
      this.backgroundImage = image;
    }
    const { inner: innerSlot, outer: outerSlot } = screenSlots(project.scene);
    const outerContent = resolveSlot(page, outerSlot);
    const key = JSON.stringify([
      page.slots[innerSlot],
      outerContent,
      innerSlot,
      outerSlot,
      project.demo,
    ]);
    if (key === this.assetKey) return;
    const serial = ++this.serial;
    const [inner, outer] = await Promise.all([
      screenCanvas(innerSlot, page.slots[innerSlot], project.demo, this.textureLimit),
      screenCanvas(
        outerSlot,
        outerContent.data,
        project.demo,
        this.textureLimit,
        outerContent.leftHalf,
      ),
    ]);
    if (this.disposed || serial !== this.serial) return;
    this.projections[0].setArtwork(
      artwork(inner, innerSlot === 'landscape' ? 0 : innerSlot === 'seated' ? -1 : 1),
    );
    this.projections[1].setArtwork(artwork(outer, outerSlot === 'standing' ? -1 : 0));
    this.screens.forEach((m, i) => {
      m.emissiveMap = this.projections[i].texture;
      m.needsUpdate = true;
    });
    this.assetKey = key;
  }
  draw(p: Project, width: number, height: number) {
    if (this.disposed) throw new Error(t('errors.rendererDisposed'));
    if (!this.model || !this.mixer || !this.action) throw new Error(t('errors.rendererNotReady'));
    if (this.renderer.domElement.width !== width || this.renderer.domElement.height !== height)
      this.renderer.setSize(width, height, false);
    const open = THREE.MathUtils.clamp(p.view.open, 0, 1);
    this.action.paused = false;
    this.action.enabled = true;
    this.mixer.setTime(open * 2);
    this.root.rotation.set(-Math.PI / 2, Math.PI, 0);
    this.orientation.rotation.set(0, 0, 0);
    this.tilt.rotation.set(0, 0, 0);
    this.view.rotation.set(p.view.pitch, p.view.yaw, 0);
    if (p.scene === 'portrait') this.orientation.rotation.y = Math.PI / 2;
    if (p.scene === 'seated') {
      this.orientation.rotation.set(0, Math.PI / 2, -Math.PI / 2);
      this.view.rotation.x -= 0.5;
      this.view.rotation.y += Math.PI + 0.32;
    }
    if (p.scene === 'standing') {
      this.tilt.rotation.set(0, -Math.PI / 2, -Math.PI / 8);
      this.view.rotation.y += 0.32;
    }
    this.center.position.set(0, 0, 0);
    this.center.updateMatrixWorld(true);
    this.model.traverse((o) => {
      if (o instanceof THREE.SkinnedMesh) {
        o.skeleton.update();
        o.computeBoundingBox();
        o.computeBoundingSphere();
      }
    });
    const box = new THREE.Box3().setFromObject(this.view);
    // Fold mode is framed against the fixed unfolded model origin.
    // Recentring the animated Box3 translates the otherwise stationary right leaf.
    if (p.scene !== 'fold') this.center.position.copy(box.getCenter(new THREE.Vector3()).negate());
    this.center.updateMatrixWorld(true);
    const aspect = width / height,
      h = Math.max(p.scene === 'portrait' ? 7.3 : 6, 7.4 / aspect) / p.view.scale;
    this.camera.aspect = aspect;
    this.camera.position.z = -h / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2));
    this.camera.updateProjectionMatrix();
    for (const f of this.finishes)
      f.material.color.copy(f.color).multiplyScalar(p.view.body === 'dark' ? 0.2 : 1);
    const localEye = this.camera.position
      .clone()
      .applyMatrix4(this.outerMesh!.matrixWorld.clone().invert());
    const hinge = this.outerMesh!.getVertexPosition(this.outerHingeIndex, new THREE.Vector3());
    this.projections.forEach((projection, i) => {
      projection.update(p.scene === 'fold', open, localEye, hinge);
      this.screens[i].emissiveMap = projection.texture;
    });
    this.screens[0].emissiveIntensity =
      p.scene === 'fold' ? 0.55 + 0.45 * THREE.MathUtils.smoothstep(open, 0.4, 1) : 1;
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement;
  }
  browserSurfaces(p: Project, width: number, height: number) {
    if (!this.model) return [];
    const inner = this.model.getObjectByName('skeleton_0_3_screenTexture_geo') as THREE.SkinnedMesh;
    const split = p.scene !== 'fold' && p.view.open < 0.99;
    const surfaces = [
      screenSurface(
        inner,
        this.camera,
        this.projections[0].frame,
        p,
        width,
        height,
        true,
        split ? 1 : undefined,
      ),
      screenSurface(
        this.outerMesh!,
        this.camera,
        this.projections[1].frame,
        p,
        width,
        height,
        false,
      ),
    ];
    if (split)
      surfaces.unshift(
        screenSurface(inner, this.camera, this.projections[0].frame, p, width, height, true, 0),
      );
    const masks = (this.visibility ??= new ScreenVisibility()).render(
      this.renderer,
      this.scene,
      this.model,
      this.camera,
      width,
      height,
      split,
    );
    for (const surface of surfaces) {
      surface.mask = masks[surface.id].mask;
      surface.maskMode = 'alpha';
      surface.clip = masks[surface.id].clip;
      surface.visible = surface.visible && masks[surface.id].visible;
    }
    return surfaces;
  }

  private releaseModel() {
    const textures = new Set<THREE.Texture>(),
      materials = new Set<THREE.Material>(),
      geometries = new Set<THREE.BufferGeometry>();
    this.model?.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        geometries.add(o.geometry);
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          materials.add(m);
          Object.values(m).forEach((v) => {
            if (v instanceof THREE.Texture) textures.add(v);
          });
        }
        if (o instanceof THREE.SkinnedMesh) o.skeleton.dispose();
      }
    });
    textures.forEach((t) => t.dispose());
    materials.forEach((m) => m.dispose());
    geometries.forEach((g) => g.dispose());
    this.projections.forEach((w) => w.dispose());
    this.environment?.dispose();
    this.model = undefined;
    this.mixer?.stopAllAction();
  }
  dispose() {
    this.disposed = true;
    this.visibility?.dispose();
    this.serial++;
    this.releaseModel();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
export function exportedSlot(p: Project) {
  return sceneSlot(p.scene);
}
