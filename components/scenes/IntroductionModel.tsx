import React, { useMemo, useRef } from "react";
import { Text, useScroll, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import * as TYPE from "@/utils/types/IntroductionModel";

const PATH_SAMPLES = 128;

export function IntroductionModel({
  texts,
  progressRef,
  overallHeight,
  heightDistributions,
  maxWidths,
  fonts,
  flip = false,
  ...props
}: TYPE.IntroductionModelProps) {
  const textRefs = useRef<(THREE.Object3D | null)[]>([]);
  const shaderRefs = useRef<{ uniforms: TYPE.BendUniforms }[]>([]);
  const boundsRefs = useRef<[number, number, number, number][]>([]);
  const scroll = useScroll();

  // Sample the path once (evenly spaced by arc length) so the shader can look it up
  const pathData = useMemo(() => {
    const path = new THREE.CurvePath<THREE.Vector3>()
    let yPos = 0.45;

    // path.add(new THREE.LineCurve3(
    //   new THREE.Vector3(1, yPos, 2.1),
    //   new THREE.Vector3(1, yPos, 0)
    // ))
    // path.add(new THREE.QuadraticBezierCurve3(
    //   new THREE.Vector3(1, yPos, 0),
    //   new THREE.Vector3(1, yPos, -0.5),
    //   new THREE.Vector3(2, yPos, -0.5)
    // ))
    // path.add(new THREE.LineCurve3(
    //   new THREE.Vector3(2, yPos, -0.5),
    //   new THREE.Vector3(5, yPos, -0.5)
    // ))

    path.add(new THREE.LineCurve3(
      new THREE.Vector3(-0.5, yPos, 0.05),
      new THREE.Vector3(-0.5, yPos, 4)
    ))
    path.add(new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.5, yPos, 4),
      new THREE.Vector3(-0.5, yPos, 4.5),
      new THREE.Vector3(1, yPos, 4.5)
    ))
    path.add(new THREE.LineCurve3(
      new THREE.Vector3(1, yPos, 4.5),
      new THREE.Vector3(5, yPos, 4.5)
    ))

    const pts = path.getSpacedPoints(PATH_SAMPLES - 1);

    const tans = pts.map((_, i) =>
      path
        .getTangentAt(i / (PATH_SAMPLES - 1))
        .setY(0)
        .normalize()
    );

    return {
      pts,
      tans,
      length: path.getLength(),
    };
  }, []);

  var check = 1;

  const materials = texts.map((_, i) => useMemo(() => {
    const mat = new THREE.MeshBasicMaterial();

    // if (check) {
    //   console.log("First path point:", pathData.pts[0]);
    //   console.log("Point near first bend:", pathData.pts[40]);
    //   console.log("Last path point:", pathData.pts[127]);
    // }
    check = 0;

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uProgress = { value: 0 };
      shader.uniforms.uCenterX = { value: 0 };
      shader.uniforms.uDir = { value: flip ? -1 : 1 };
      shader.uniforms.uPathLength = { value: pathData.length };
      shader.uniforms.uPts = { value: pathData.pts };
      shader.uniforms.uTans = { value: pathData.tans };
      shader.uniforms.uPathBlend = { value: 0 };

      shaderRefs.current[i] = shader as unknown as { uniforms: TYPE.BendUniforms };

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `
          #include <common>
          #define PATH_N ${PATH_SAMPLES}
          uniform float uProgress; // How far the text has progressed along the path, typically from 0.0 to 1.0
          uniform float uCenterX; // The horizontal center of the text's local-space bounding box
          uniform float uDir; // Direction the text travels along the path. Usually 1.0 or -1.0
          uniform float uPathLength; // Total length of the path
          uniform vec3 uPts[PATH_N]; // Array of sampled positions along the path
          uniform vec3 uTans[PATH_N]; // Array of tangent vectors indicating the direction of the path at each sampled position
          uniform float uPathBlend; // Controls blending between the original text shape and the path-deformed shape
  
          // position + tangent at arc-length s (extrapolates straight past both ends)
          void samplePath(float s, out vec3 P, out vec3 T) {
            if (s <= 0.0) {
              P = uPts[0] + uTans[0] * s;
              T = uTans[0];
            } else if (s >= uPathLength) {
              P = uPts[PATH_N - 1] + uTans[PATH_N - 1] * (s - uPathLength);
              T = uTans[PATH_N - 1];
            } else {
              float f = s / uPathLength * float(PATH_N - 1);
              int i = int(min(floor(f), float(PATH_N - 2)));
              float a = f - float(i);
              P = mix(uPts[i], uPts[i + 1], a);
              T = normalize(mix(uTans[i], uTans[i + 1], a));
            }
          }
          `
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
          #include <begin_vertex>

          float s =
              uProgress * uPathLength
              + uDir * (position.x);

          vec3 P;
          vec3 T;
          samplePath(s, P, T);

          T.y = 0.0;
          T = normalize(T);

          vec3 up = vec3(0.0, 1.0, 0.0);
          vec3 forward = uDir * T;
          vec3 side = cross(forward, up);

          // Convert the sampled path position into the Text object's local space.
          vec3 pathPosition = vec3(P.z, 0.0, P.x) + up * transformed.y + side * transformed.z;

          transformed = pathPosition;
          // transformed = mix(transformed, pathPosition, uPathBlend);
        `
      );
    };

    mat.side = THREE.DoubleSide;

    return mat;
  }, [flip, pathData]));

  const handleSync = (
    troikaMesh: THREE.Object3D,
    index: number
  ) => {
    const mesh = troikaMesh as TYPE.TroikaTextMesh;
    const bounds = mesh.textRenderInfo?.blockBounds;

    if (bounds) {
      boundsRefs.current[index] = [
        bounds[0],
        bounds[1],
        bounds[2],
        bounds[3],
      ];
    }
  };

  useFrame(() => {
    const count = textRefs.current.length;
    const currentScroll = scroll.offset;

    // Stage 1: Sequential entrance individually
    const ENTRANCE_START = 1 / scroll.pages;
    const ENTRANCE_END = 1.2 / scroll.pages;

    // Stage 2: L-shaped path movement (shared by all text lines)
    const PATH_START = 1.6 / scroll.pages;
    const PATH_END = 2.5 / scroll.pages;

    textRefs.current.forEach((text, i) => {
      if (!text || count === 0) return;

      const start = new THREE.Vector3(1, getPosY(i), 6);
      const end = new THREE.Vector3(1, getPosY(i), 2.1);

      const lineStart =
        ENTRANCE_START +
        (i / count) * (ENTRANCE_END - ENTRANCE_START);

      const lineDuration =
        (ENTRANCE_END - ENTRANCE_START) / count;

      const entranceProgress = THREE.MathUtils.clamp(
        (currentScroll - lineStart) / lineDuration,
        0,
        1
      );

      text.position.lerpVectors(start, end, entranceProgress);
    });

    // Stage 2 progress computation
    const pathProgress = THREE.MathUtils.clamp(
      (currentScroll - PATH_START) /
      (PATH_END - PATH_START),
      0,
      1
    );

    shaderRefs.current.forEach((shaderRef, i) => {
      if (!shaderRef) return;

      const u = shaderRef.uniforms;
      u.uProgress.value = pathProgress;
      u.uPathBlend.value = pathProgress;

      const bounds = boundsRefs.current[i];

      if (bounds) {
        u.uCenterX.value = (bounds[0] + bounds[2]) / 2;
      }
    });

    // console.log({
    //   currentScroll,
    //   pathProgress,
    //   centerX: shaderRefs.current.map(
    //     (shader) => shader?.uniforms.uCenterX.value
    //   ),
    // });
    // console.log("First point:", pathData.pts[0].toArray());
    // console.log("First tangent:", pathData.tans[0].toArray());
    // console.log(
    //   "Last point:",
    //   pathData.pts[PATH_SAMPLES - 1].toArray()
    // );
    // console.log(
    //   "Last tangent:",
    //   pathData.tans[PATH_SAMPLES - 1].toArray()
    // );
  });

  function getFontSize(dist: number) {
    return dist * overallHeight;
  }

  function getPosY(index: number) {
    let sum = 0;
    heightDistributions.forEach((dist, i) => {
      if (index < i) sum += getFontSize(dist);
      switch (index < heightDistributions.length) {
        case index == 3: sum += 0.02;
          break;
        case index == 2: sum += 0.035;
          break;
        case index == 1: sum += 0.06;
          break;
        case index == 0: sum += 0.06;
          break;
      }
    });
    return 0.2 + sum;
  }

  return (
    <>
      {/* <Line points={pathData.pts} color="hotpink" lineWidth={3} />; */}
      {texts.map((t, i) => (
        <Text
          key={i}
          ref={(el) => {
            textRefs.current[i] = el;
          }}
          material={materials[i]}
          onSync={(mesh) => handleSync(mesh, i)}
          frustumCulled={false}
          fontSize={getFontSize(heightDistributions[i])}
          maxWidth={maxWidths[i]}
          font={i == 0 || i == 2 ? fonts[1] : fonts[0]}
          position={[1, getPosY(i), 6]}
          {...props}
        >
          {t}
        </Text>
      ))}
    </>
  );
}