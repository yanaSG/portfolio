import { Text, useScroll } from "@react-three/drei";
import { useRef, useMemo, RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as TYPE from '@/utils/types/NameModel'

const PATH_SAMPLES = 128;

function makeLPath(type: "name" | "role") {
    const path = new THREE.CurvePath<THREE.Vector3>()
    let yPos = 0.45;
    // if (type == "name") yPos += 0.1;

    path.add(new THREE.LineCurve3(
        new THREE.Vector3(0.5, yPos, -0.5),
        new THREE.Vector3(0, yPos, -0.5)
    ))
    path.add(new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, yPos, -0.5),
        new THREE.Vector3(-1, yPos, -0.5),
        new THREE.Vector3(-1, yPos, 0)
    ))
    path.add(new THREE.LineCurve3(
        new THREE.Vector3(-1, yPos, 0),
        new THREE.Vector3(-1, yPos, 5)
    ))
    return path
}

export function NameModel({
    texts,
    progressRef,
    minScales,
    waveWidth = 1,
    maxWidth,
    fontSizes,
    lift = 0,
    flip = true, // matches your previous tmp.x.negate()
    ...props
}: TYPE.ShrinkingTextProps) {
    const textRefs = useRef<(TYPE.TroikaTextMesh)[]>([]);
    const shaderRefs = useRef<{ uniforms: TYPE.BendUniforms }[]>([]);
    const boundsRefs = useRef<[number, number, number, number][]>([]);

    const paths = useMemo(
        () => [
            makeLPath("name"),
            makeLPath("role"),
        ],
        []
    );

    // Sample the path once (evenly spaced by arc length) so the shader can look it up
    const pathData = useMemo(() => {
        return paths.map((path) => {
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
        });
    }, [paths]);

    const materials = minScales.map((minScale, i) => useMemo(() => {
        const mat = new THREE.MeshBasicMaterial();

        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uProgress = { value: 0 };
            shader.uniforms.uMinX = { value: 0 };
            shader.uniforms.uMaxX = { value: 1 };
            shader.uniforms.uCenterX = { value: 0 };
            shader.uniforms.uMinScale = { value: minScale };
            shader.uniforms.uWaveWidth = { value: waveWidth };
            shader.uniforms.uLift = { value: lift };
            shader.uniforms.uDir = { value: flip ? -1 : 1 };
            shader.uniforms.uPathLength = { value: pathData[i].length };
            shader.uniforms.uPts = { value: pathData[i].pts };
            shader.uniforms.uTans = { value: pathData[i].tans };

            shaderRefs.current[i] = shader as unknown as { uniforms: TYPE.BendUniforms };

            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `
        #include <common>
        #define PATH_N ${PATH_SAMPLES}
        uniform float uProgress;
        uniform float uMinX;
        uniform float uMaxX;
        uniform float uCenterX;
        uniform float uMinScale;
        uniform float uWaveWidth;
        uniform float uLift;
        uniform float uDir;
        uniform float uPathLength;
        uniform vec3 uPts[PATH_N];
        uniform vec3 uTans[PATH_N];

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
                '#include <begin_vertex>',
                `
        #include <begin_vertex>

        // ---- shrink (unchanged) ----
        // float t = smoothstep(uMinX, uMaxX, position.x);
        // float localProgress = clamp((uProgress * uWaveWidth) / (1.0 - uWaveWidth), 0.0, 1.0);
        // float scaleY = mix(1.0, uMinScale, localProgress);
        // transformed.y *= scaleY;

        // ---- bend along the path ----
        // text centre sits at the current progress; each vertex is offset along the path by its x
        float s = uProgress * uPathLength + uDir * (position.x - uCenterX);
        vec3 P;
        vec3 T;
        samplePath(s, P, T);

        vec3 up = vec3(0.0, 1.0, 0.0);
        vec3 X = uDir * T;             // reading direction
        vec3 Z = cross(X, up);         // face direction (sideways)

        // output is already in the parent's space, so the mesh keeps an identity transform
        transformed = vec3(P.x, uLift, P.z) + up * transformed.y + Z * transformed.z;
        `
            );
        };

        return mat;
    }, [minScale, waveWidth, lift, flip, pathData]));

    const handleSync = (troikaMesh: THREE.Object3D) => {
        const mesh = troikaMesh as TYPE.TroikaTextMesh;
        const bounds = mesh.textRenderInfo?.blockBounds;
        if (bounds) boundsRefs.current.forEach((boundRef) => {
            boundRef = bounds;
        });
    };

    const scroll = useScroll();
    const maxPageOffset = 1 / scroll.pages;

    useFrame(() => {
        const u = shaderRefs.current.map((shaderRef) => shaderRef.uniforms);
        if (!u) return;

        const currentScroll = progressRef.current ?? 0;;

        const progress = THREE.MathUtils.clamp(
            currentScroll / maxPageOffset,
            0,
            1
        );

        u.map((uVal) => uVal.uProgress.value = progress);

        const bs = boundsRefs.current;
        bs.forEach((b, i) => {
            if (b) {
                u[i].uMinX.value = b[0];
                u[i].uMaxX.value = b[2];
                u[i].uCenterX.value = (b[0] + b[2]) / 2;
            }
        })

    });

    return (
        <>
            {texts.map((t, i) => (
                <Text
                    key={i}
                    ref={(el) => {
                        textRefs.current[i] = el;
                    }}
                    material={materials[i]}
                    onSync={handleSync}
                    frustumCulled={false}
                    fontSize={fontSizes[i]}
                    maxWidth={maxWidth[i]}
                    position={[-0.5, i ? 0.1 : 0.55, -0.7]}
                    {...props}
                >
                    {t}
                </Text>
            ))}
        </>
    );
}