"use client";

import { Canvas } from "@react-three/fiber";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import DeskScene from "./scenes/DeskScene";
import ToolsScene from "./scenes/ToolsScene";
import * as THREE from "three";
import { PerspectiveCamera, CameraControls, ScrollControls, SoftShadows } from "@react-three/drei";
import { degToRad } from "three/src/math/MathUtils.js";

gsap.registerPlugin(ScrollTrigger);

const Hero = () => {
  const SCROLL_PAGES = 10;

  return (
    <div className="relative w-full h-screen">
      <Canvas shadows
        gl={{
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.AgXToneMapping, // Matches modern Blender default (AgX)
          toneMappingExposure: 1.0,
        }}>
        {/* <PerspectiveCamera fov={6} near={0.1} far={10000} makeDefault position={[5, 2.5, 8]} /> */}
        <PerspectiveCamera fov={6} near={0.1} far={10000} makeDefault position={[5, 2.5, 8]} />
        <CameraControls
          makeDefault
          // enabled={true} // Explicitly set to true to ensure it's unlocked
          maxDistance={100} // was 8: with fov=6 the camera sits ~50 units away, and it got clamped to 8
          minDistance={1}
          mouseButtons-wheel={0} // 0 = ACTION.NONE, so the wheel scrolls the page (ScrollControls) instead of zooming
          minPolarAngle={0}
          maxPolarAngle={degToRad(80)}
        />
        <SoftShadows size={20} samples={16} focus={1.5} />
        <ScrollControls pages={SCROLL_PAGES} damping={0.25}>
          <DeskScene />
          <ToolsScene />
        </ScrollControls>
      </Canvas>
    </div>
  )
}

export default Hero