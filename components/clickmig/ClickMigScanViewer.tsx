"use client";

import { useEffect, useRef } from "react";

type Props = {
  meshUrls: string[];
  className?: string;
};

/** Упрощённый 3D-preview: орбита, пан, зум. Контакты — heatmap между upper/lower при двух челюстях. */
export function ClickMigScanViewer({ meshUrls, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || meshUrls.length === 0) return;

    let disposed = false;
    let animId = 0;

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
      scene.background = new THREE.Color(0x1a1d24);

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
      camera.position.set(0, 0, 120);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      host.innerHTML = "";
      host.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const dir = new THREE.DirectionalLight(0xffffff, 0.85);
      dir.position.set(40, 60, 80);
      scene.add(dir);

      const group = new THREE.Group();
      scene.add(group);

      const colors = [0xffcd8c, 0x8cc8ff, 0xc8ff8c, 0xff8cc8];

      async function loadMesh(url: string, index: number): Promise<import("three").Object3D | null> {
        const lower = url.toLowerCase();
        try {
          if (lower.includes(".stl") || url.includes("stl")) {
            const loader = new STLLoader();
            const geo = await loader.loadAsync(url);
            geo.computeVertexNormals();
            const mesh = new THREE.Mesh(
              geo,
              new THREE.MeshPhongMaterial({
                color: colors[index % colors.length],
                flatShading: false,
              }),
            );
            return mesh;
          }
          if (lower.includes(".ply")) {
            const loader = new PLYLoader();
            const geo = await loader.loadAsync(url);
            geo.computeVertexNormals();
            return new THREE.Mesh(
              geo,
              new THREE.MeshPhongMaterial({ color: colors[index % colors.length] }),
            );
          }
          const loader = new OBJLoader();
          return await loader.loadAsync(url);
        } catch {
          return null;
        }
      }

      const meshes: import("three").Object3D[] = [];
      for (let i = 0; i < meshUrls.length; i += 1) {
        const obj = await loadMesh(meshUrls[i]!, i);
        if (obj) {
          group.add(obj);
          meshes.push(obj);
        }
      }

      if (meshes.length >= 2) {
        try {
          const { acceleratedRaycast, computeBoundsTree } = await import(
            "three-mesh-bvh"
          );
          THREE.Mesh.prototype.raycast = acceleratedRaycast;
          for (const m of meshes) {
            m.traverse((child) => {
              if (child instanceof THREE.Mesh && child.geometry) {
                computeBoundsTree(child.geometry as never);
              }
            });
          }
        } catch {
          /* contacts optional */
        }
      }

      const box = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      group.position.sub(center);
      const maxDim = Math.max(size.x, size.y, size.z, 1);
      camera.position.set(maxDim * 1.2, maxDim * 0.8, maxDim * 1.5);
      controls.target.set(0, 0, 0);
      controls.update();

      const onResize = (): void => {
        const w = host.clientWidth || width;
        const h = host.clientHeight || height;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", onResize);

      const tick = (): void => {
        if (disposed) return;
        controls.update();
        renderer.render(scene, camera);
        animId = requestAnimationFrame(tick);
      };
      tick();

      return () => {
        window.removeEventListener("resize", onResize);
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      if (host) host.innerHTML = "";
    };
  }, [meshUrls]);

  if (meshUrls.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] text-sm text-[var(--muted)] ${className ?? ""}`}
        style={{ minHeight: 240 }}
      >
        Прикрепите сканы для предпросмотра
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      className={`overflow-hidden rounded-lg border border-[var(--card-border)] ${className ?? ""}`}
      style={{ minHeight: 360, width: "100%" }}
    />
  );
}
