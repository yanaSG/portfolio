import React, { useRef } from "react";
import { Text, useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import * as TYPE from "@/utils/types/IntroductionModel";
import { clamp } from "three/src/math/MathUtils.js";

export function IntroductionModel({
  texts,
  progressRef,
  overallHeight,
  heightDistributions,
  maxWidths,
  fonts,
  ...props
}: TYPE.IntroductionModelProps) {

  const textRefs = useRef<(THREE.Object3D | null)[]>([]);
  const scroll = useScroll();

  useFrame(() => {
    const count = textRefs.current.length;
    const maxPageOffset = 1 / scroll.pages;

    textRefs.current.forEach((text, i) => {
      if (!text) return;

      if (progressRef.current) {
        let start = new THREE.Vector3(1, getPosY(i), 6)
        let end = new THREE.Vector3(1, getPosY(i), 2.1)
        const t = scroll.range((i / count) * maxPageOffset + maxPageOffset, maxPageOffset / count);
        console.log("[ " + i + " ] " + ((i / count) * maxPageOffset + maxPageOffset))
        text.position.lerpVectors(start, end, t);
      }
    });
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
      {texts.map((t, i) => (
        <Text
          key={i}
          ref={(el) => {
            textRefs.current[i] = el;
          }}
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