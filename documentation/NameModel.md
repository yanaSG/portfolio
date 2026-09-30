# NameModel.tsx explained

`NameModel` renders drei's `<Text>` so that it:

1. **moves along an L-shaped path** as `progressRef` goes from 0 to 1,
2. **bends around the corner** (each letter follows the path at its own position),
3. **shrinks vertically** as it moves, in a wave from left to right.

All three effects happen in the **vertex shader**. The mesh itself never moves. `useFrame` only pushes a few numbers (uniforms) to the GPU each frame.

---

## 1. Imports and constants

```tsx
import { Line, Text } from "@react-three/drei";
import { useRef, useMemo, RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PATH_SAMPLES = 128;
```

| Item | Purpose |
|---|---|
| `Line` | Draws the pink debug line showing the path. |
| `Text` | drei's troika-based text. Its mesh is what we attach the custom material to. |
| `useFrame` | Runs a callback every frame, used to update uniforms. |
| `PATH_SAMPLES` | How many points we sample from the path and send to the shader. More points give a smoother bend but use more GPU uniform space (see [Gotchas](#gotchas)). |

---

## 2. Types

```tsx
interface TroikaTextRenderInfo {
    blockBounds: [number, number, number, number]; // [minX, minY, maxX, maxY]
}

interface TroikaTextMesh extends THREE.Mesh {
    textRenderInfo?: TroikaTextRenderInfo;
}
```

Troika adds a `textRenderInfo` property to its mesh after it lays out the text. drei doesn't type it, so we declare the small part we need: `blockBounds`, the bounding box of the laid-out text in local units. We use `minX` and `maxX` to know how wide the text is.

```tsx
interface BendUniforms {
    uProgress: { value: number };
    uMinX: { value: number };
    uMaxX: { value: number };
    uCenterX: { value: number };
    uMinScale: { value: number };
    uWaveWidth: { value: number };
}
```

The uniforms we update from JavaScript **after** the shader is compiled. (Constants like `uLift`, `uDir`, and the path arrays are set once in `onBeforeCompile` and never touched again, so they aren't listed here.)

```tsx
interface ShrinkingTextProps { ... }
```

The component's props:

| Prop | Meaning |
|---|---|
| `text` | The string to display. |
| `progressRef` | A ref holding a number from 0 to 1. Whatever parent code updates it (scroll, timeline, etc.) drives the animation. A ref is used so changes don't cause React re-renders. |
| `minScale` | The final vertical scale (0.5 = half height). |
| `waveWidth` | 0 to 1. How much of the progress range the left-to-right shrink wave spreads over. |
| `lift` | Height of the text above the ground. |
| `flip` | Reverses the reading direction and the side the text faces. |
| the rest | Passed through to `<Text>` (`fontSize`, `color`, `anchorX`, and so on). |

---

## 3. `makeLPath()`

```tsx
function makeLPath() {
    const path = new THREE.CurvePath<THREE.Vector3>()
    path.add(new THREE.LineCurve3(A, B))              // straight leg 1
    path.add(new THREE.QuadraticBezierCurve3(B, C, D)) // rounded corner
    path.add(new THREE.LineCurve3(D, E))              // straight leg 2
    return path
}
```

Builds the route as three connected pieces inside one `CurvePath`:

| Piece | Type | Vectors | Role |
|---|---|---|---|
| 1 | `LineCurve3` | 2 (start, end) | First straight run, from `(0.3, 0.45, -0.7)` to `(-0.5, 0.45, -0.7)`. |
| 2 | `QuadraticBezierCurve3` | 3 (start, control, end) | Rounded corner. The control point `(-1, 0.45, -0.7)` is the sharp corner of the "L" that the curve is pulled toward. |
| 3 | `LineCurve3` | 2 (start, end) | Second straight run, turning 90° toward `+Z`. |

The end of each piece equals the start of the next, so there are no gaps. The rounded corner is what makes the tangent turn gradually instead of snapping 90° in one step.

`CurvePath` lets us treat all three as one curve with a total length and `getPointAt(t)` / `getTangentAt(t)`, where `t` is 0 to 1 across the whole path.

---

## 4. Component setup

```tsx
export function NameModel({
    text = 'Hello World',
    progressRef,
    minScale = 0.5,
    waveWidth = 0.6,
    lift = 0.6,
    flip = true,
    ...props
}: ShrinkingTextProps) {
```

Destructures the props we handle ourselves and leaves everything else in `props` to forward to `<Text>`.

### Refs

```tsx
const textRef = useRef<TroikaTextMesh>(null);
const shaderRef = useRef<{ uniforms: BendUniforms } | null>(null);
const boundsRef = useRef<[number, number, number, number] | null>(null);
```

| Ref | Holds |
|---|---|
| `textRef` | The text mesh (kept for access if you need it). |
| `shaderRef` | The compiled shader object, so `useFrame` can update its uniforms. Filled in by `onBeforeCompile`. |
| `boundsRef` | The latest text bounds from troika. Stored separately so it doesn't matter whether troika's layout or the shader compile finishes first. |

### The path and sampled data

```tsx
const path = useMemo(makeLPath, []);

const pathData = useMemo(() => {
    const pts = path.getSpacedPoints(PATH_SAMPLES - 1);
    const tans = pts.map((_, i) =>
        path.getTangentAt(i / (PATH_SAMPLES - 1)).setY(0).normalize()
    );
    return { pts, tans, length: path.getLength() };
}, [path]);
```

- `path` is created once.
- **Why sample it?** A shader can't call `path.getPointAt()`. It has no access to three.js curve objects. So we sample the curve into plain arrays and send them as uniforms.
- `getSpacedPoints(127)` returns 128 points **evenly spaced by distance**, so the path is uniformly parameterized.
- `tans[i]` is the direction of travel at each point. `getTangentAt(i / 127)` uses the same arc-length parameterization, so tangents line up with the points. `setY(0).normalize()` flattens the direction so the text stays upright.
- `length` is the total path length, needed to convert "progress" into a distance.

---

## 5. The material

```tsx
const material = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial();
    mat.onBeforeCompile = (shader) => { ... };
    return mat;
}, [minScale, waveWidth, lift, flip, pathData]);
```

A plain `MeshBasicMaterial` whose shader source is patched by `onBeforeCompile`. That hook gives us the shader just before it's compiled, so we can add uniforms and inject GLSL into three's built-in chunks.

`useMemo` means the material is only rebuilt if one of the listed values changes. Rebuilding recompiles the shader, so avoid changing these every frame.

### 5a. Registering uniforms

```tsx
shader.uniforms.uProgress = { value: 0 };
shader.uniforms.uMinX = { value: 0 };
shader.uniforms.uMaxX = { value: 1 };
shader.uniforms.uCenterX = { value: 0 };
shader.uniforms.uMinScale = { value: minScale };
shader.uniforms.uWaveWidth = { value: waveWidth };
shader.uniforms.uLift = { value: lift };
shader.uniforms.uDir = { value: flip ? -1 : 1 };
shader.uniforms.uPathLength = { value: pathData.length };
shader.uniforms.uPts = { value: pathData.pts };
shader.uniforms.uTans = { value: pathData.tans };

shaderRef.current = shader as unknown as { uniforms: BendUniforms };
```

| Uniform | Meaning | Updated |
|---|---|---|
| `uProgress` | Animation progress, 0 to 1. | every frame |
| `uMinX`, `uMaxX` | Left and right edge of the text. | when bounds change |
| `uCenterX` | Middle of the text (`(minX + maxX) / 2`). | when bounds change |
| `uMinScale` | Final vertical scale. | once |
| `uWaveWidth` | Spread of the shrink wave. | once |
| `uLift` | Ground height of the text. | once |
| `uDir` | `+1` or `-1`, from `flip`. | once |
| `uPathLength` | Total length of the path. | once |
| `uPts`, `uTans` | The sampled path positions and directions (128 `vec3` each). | once |

Saving `shader` in `shaderRef` is how `useFrame` gets to these later.

### 5b. Declarations injected at `#include <common>`

```glsl
#define PATH_N 128
uniform float uProgress; ... uniform vec3 uPts[PATH_N]; uniform vec3 uTans[PATH_N];

void samplePath(float s, out vec3 P, out vec3 T) { ... }
```

This puts the uniform declarations and a helper function at the top of the vertex shader.

**`samplePath(s, P, T)`**: given a distance `s` along the path, returns the position `P` and direction `T` there. It has three cases:

| Case | Behavior |
|---|---|
| `s <= 0` (before the start) | Continue in a straight line backward: `P = uPts[0] + uTans[0] * s`. |
| `s >= uPathLength` (past the end) | Continue straight forward from the last point. |
| otherwise | Convert `s` to a fractional index `f`, pick the two neighboring samples `i` and `i+1`, and blend between them with `mix` using fraction `a`. The tangent is blended and re-normalized. |

The extrapolation matters because at `progress = 0` or `1` the text's center is at the path's end, so about half the letters are beyond it. Continuing straight keeps them from collapsing onto one point.

### 5c. Logic injected at `#include <begin_vertex>`

`begin_vertex` is where three defines `vec3 transformed = position;`. Code after it modifies `transformed`, which becomes the vertex's final position.

**Step 1: shrink (your original effect)**

```glsl
float t = smoothstep(uMinX, uMaxX, position.x);
float localProgress = clamp((uProgress - t * uWaveWidth) / (1.0 - uWaveWidth), 0.0, 1.0);
float scaleY = mix(1.0, uMinScale, localProgress);
transformed.y *= scaleY;
```

- `t`: where this vertex sits along the word, 0 (left edge) to 1 (right edge).
- `localProgress`: this vertex's own progress. Vertices further right start shrinking slightly later (delayed by `t * uWaveWidth`), which creates a wave from left to right. It's clamped to 0 to 1.
- `scaleY`: linear blend from full height (1.0) down to `uMinScale`.
- Only `transformed.y` is scaled, so letters get shorter but not narrower.

It uses the **original** `position.x`, so the bend below doesn't affect it.

**Step 2: bend along the path**

```glsl
float s = uProgress * uPathLength + uDir * (position.x - uCenterX);
vec3 P;
vec3 T;
samplePath(s, P, T);
```

`s` is the distance along the path where this vertex should end up:

- `uProgress * uPathLength`: where the **center** of the text is.
- `position.x - uCenterX`: how far this vertex is left or right of the text's center.
- `uDir`: flips which way the text reads along the path.

So each letter lands at a slightly different point on the path. Letters at the front of the word are already around the corner while letters at the back are still on the first leg. That is what produces the bend.

```glsl
vec3 up = vec3(0.0, 1.0, 0.0);
vec3 X = uDir * T;      // reading direction
vec3 Z = cross(X, up);  // direction the text face points (sideways)
```

Builds a local frame at that point on the path: `X` follows the path, `up` stays world-up (so the text stands upright), and `Z` is perpendicular to both, which is the direction the text faces.

```glsl
transformed = vec3(P.x, uLift, P.z) + up * transformed.y + Z * transformed.z;
```

Final position:

- `vec3(P.x, uLift, P.z)`: the point on the path, at ground height `uLift`. The path's own Y values are ignored.
- `up * transformed.y`: the vertex's (already shrunk) height, going straight up.
- `Z * transformed.z`: any thickness/depth the vertex has, going sideways off the path. For flat troika text this is usually 0.

The result is already in the parent's coordinate space, which is why the mesh must keep an identity transform (don't pass `position` or `rotation` to `NameModel`, or they'll offset everything).

---

## 6. `handleSync`

```tsx
const handleSync = (troikaMesh: THREE.Object3D) => {
    const mesh = troikaMesh as TroikaTextMesh;
    const bounds = mesh.textRenderInfo?.blockBounds;
    if (bounds) boundsRef.current = bounds;
};
```

Troika lays out text asynchronously, and `onSync` fires when it finishes (including when `text` or `fontSize` changes). We just store the bounds in `boundsRef`. Nothing is written to the shader here, so it doesn't matter whether the shader compiled yet.

---

## 7. `useFrame`

```tsx
useFrame(() => {
    const u = shaderRef.current?.uniforms;
    if (!u) return;

    u.uProgress.value = progressRef.current ?? 0;

    const b = boundsRef.current;
    if (b) {
        u.uMinX.value = b[0];
        u.uMaxX.value = b[2];
        u.uCenterX.value = (b[0] + b[2]) / 2;
    }
});
```

Each frame:

1. If the shader hasn't compiled yet, do nothing.
2. Copy the current progress into `uProgress`.
3. Copy the latest text bounds into the width-related uniforms.

That's all the CPU does. The GPU does the actual per-vertex work.

---

## 8. JSX

```tsx
<Line points={path.getPoints(50)} color="hotpink" position={[0, 0.01, 0]} />
<Text
    ref={textRef}
    material={material}
    onSync={handleSync}
    frustumCulled={false}
    {...props}
>
    {text}
</Text>
```

| Part | Why |
|---|---|
| `Line` | Debug visualization of the path. Remove it for production. |
| `material={material}` | Uses our patched material. |
| `onSync` | Receives the text bounds when layout finishes. |
| `frustumCulled={false}` | Three decides whether to draw an object using its bounding sphere, which is calculated from the **unbent** text at the origin. Since the shader moves the vertices elsewhere, the mesh could be culled while still visible. This turns culling off. |
| `{...props}` | Forwards `fontSize`, `color`, `anchorX`, and so on. |

---

## Gotchas

- **Uniform limit.** `uPts` and `uTans` use 256 `vec3` uniform slots (each takes a full `vec4` slot). Desktop GPUs allow 1024 or more, but some mobile GPUs allow only 256 vertex uniform vectors, and this uses all of it before counting the other uniforms. On mobile, lower `PATH_SAMPLES` (64 is usually enough) or move the data into a `DataTexture`.
- **No `position` / `rotation` on this component.** The shader writes final positions, so an extra transform on the mesh would shift the text away from the path.
- **Path Y is ignored.** The text height comes from `lift`, not the path's `y` values. The debug `Line`, however, does draw at the path's Y (0.45).
- **Each glyph is a quad.** Troika letters have only 4 vertices each, so an individual letter tilts to follow the path but doesn't curve internally. A large `fontSize` or a tight corner makes wide letters look slightly skewed. For true per-letter bending, use `TextGeometry` with `TessellateModifier` and the same shader logic.
- **Changing `minScale`, `waveWidth`, `lift`, or `flip`** rebuilds the material and recompiles the shader. Fine for occasional changes, but don't animate them every frame. Animate `progressRef` instead.
- **`progressRef` should stay within 0 to 1.** Outside that range the text keeps extrapolating along the straight ends of the path, and the shrink clamps.