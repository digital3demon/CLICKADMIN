"use client";

import { useEffect, useRef } from "react";
import { workExampleMeshKind } from "@/lib/work-examples/mesh-file";

export type WorkExampleMeshSource = {
  url: string;
  fileName: string;
};

type Props = {
  meshes: WorkExampleMeshSource[];
  className?: string;
};

/** Свет и материал как в 3d viever (Scene + viewportMeshLook). */
const KEY_LIGHT_OFFSET = { x: 62, y: 48, z: 22 };
const FILL_LIGHT_OFFSET = { x: -52, y: 22, z: 38 };
const MESH_COLOR = 0xe6c8a8;
const VIEWPORT_BG = 0x2a2a30;

export function WorkExampleMeshViewer({ meshes, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const key = meshes.map((m) => `${m.url}\0${m.fileName}`).join("|");

  useEffect(() => {
    const host = hostRef.current;
    if (!host || meshes.length === 0) return;

    let disposed = false;
    let animId = 0;
    const cleanups: Array<() => void> = [];

    void (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import(
        "three/examples/jsm/controls/OrbitControls.js"
      );
      const { STLLoader } = await import(
        "three/examples/jsm/loaders/STLLoader.js"
      );
      const { PLYLoader } = await import(
        "three/examples/jsm/loaders/PLYLoader.js"
      );
      const { OBJLoader } = await import(
        "three/examples/jsm/loaders/OBJLoader.js"
      );
      if (disposed) return;

      const width = host.clientWidth || 640;
      const height = host.clientHeight || 360;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(VIEWPORT_BG);

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100_000);
      camera.position.set(80, 60, 100);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.LinearToneMapping;
      renderer.toneMappingExposure = 1;
      host.replaceChildren(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.12;

      scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      scene.add(new THREE.HemisphereLight(0xffffff, 0xffffff, 0.06));
      const keyLight = new THREE.DirectionalLight(0xffffff, 0.68);
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.26);
      keyLight.position.set(KEY_LIGHT_OFFSET.x, KEY_LIGHT_OFFSET.y, KEY_LIGHT_OFFSET.z);
      fillLight.position.set(FILL_LIGHT_OFFSET.x, FILL_LIGHT_OFFSET.y, FILL_LIGHT_OFFSET.z);
      camera.add(keyLight);
      camera.add(fillLight);
      scene.add(camera);
      scene.add(keyLight.target);
      scene.add(fillLight.target);

      const group = new THREE.Group();
      scene.add(group);

      const makeMaterial = (vertexColors: boolean) =>
        new THREE.MeshPhongMaterial({
          color: vertexColors ? 0xffffff : MESH_COLOR,
          specular: vertexColors ? 0x000000 : 0x0a0a0a,
          shininess: vertexColors ? 1 : 22,
          flatShading: true,
          side: THREE.DoubleSide,
          vertexColors,
          toneMapped: false,
        });

      const applyGeoMesh = (geo: import("three").BufferGeometry) => {
        geo.computeVertexNormals();
        const hasVc = Boolean(geo.getAttribute("color"));
        return new THREE.Mesh(geo, makeMaterial(hasVc));
      };

      for (const src of meshes) {
        const kind = workExampleMeshKind(src.fileName);
        if (!kind) continue;
        try {
          if (kind === "stl") {
            group.add(applyGeoMesh(await new STLLoader().loadAsync(src.url)));
          } else if (kind === "ply") {
            group.add(applyGeoMesh(await new PLYLoader().loadAsync(src.url)));
          } else {
            const obj = await new OBJLoader().loadAsync(src.url);
            obj.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                const geo = child.geometry;
                geo.computeVertexNormals();
                child.material = makeMaterial(Boolean(geo.getAttribute("color")));
              }
            });
            group.add(obj);
          }
        } catch {
          /* битый файл — пропускаем */
        }
        if (disposed) return;
      }

      const box = new THREE.Box3().setFromObject(group);
      if (!box.isEmpty()) {
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        group.position.sub(center);
        const maxDim = Math.max(size.x, size.y, size.z, 1);
        camera.position.set(maxDim * 1.15, maxDim * 0.75, maxDim * 1.35);
        controls.target.set(0, 0, 0);
        keyLight.target.position.set(0, 0, 0);
        fillLight.target.position.set(0, 0, 0);
        controls.update();
      }

      const onResize = () => {
        const w = host.clientWidth || width;
        const h = host.clientHeight || height;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      const ro = new ResizeObserver(onResize);
      ro.observe(host);

      const tick = () => {
        if (disposed) return;
        controls.update();
        renderer.render(scene, camera);
        animId = requestAnimationFrame(tick);
      };
      tick();

      cleanups.push(() => {
        ro.disconnect();
        controls.dispose();
        group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            const mat = child.material;
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
            else mat.dispose();
          }
        });
        renderer.dispose();
        renderer.domElement.remove();
      });
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      for (const fn of cleanups) fn();
      host.replaceChildren();
    };
    // key = urls+имена; meshes из этого же рендера
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (meshes.length === 0) return null;

  return (
    <div
      ref={hostRef}
      className={`overflow-hidden rounded-2xl border border-white/10 bg-[#2a2a30] ${className ?? ""}`}
      style={{ minHeight: 360, width: "100%" }}
    />
  );
}
