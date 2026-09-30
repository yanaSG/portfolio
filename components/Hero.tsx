"use client";

import { Canvas } from "@react-three/fiber";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import DeskScene from "./scenes/DeskScene";
import * as THREE from "three";
import { ScrollControls, SoftShadows } from "@react-three/drei";

gsap.registerPlugin(ScrollTrigger);

const Hero = () => {
  const SCROLL_PAGES = 2;

  return (
    <div className="relative w-full h-screen">
      <Canvas shadows
        gl={{
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.AgXToneMapping, // Matches modern Blender default (AgX)
          toneMappingExposure: 1.0,
        }}>
        <SoftShadows size={20} samples={16} focus={1.5} />
        <ScrollControls pages={SCROLL_PAGES} damping={0.25}>
          <DeskScene scrollPages={2} />
        </ScrollControls>
      </Canvas>
    </div>
  )
}

export default Hero