import React, { useRef, useEffect } from "react";
import { useHelper, CameraControls, useScroll } from "@react-three/drei";
import { useFrame, useThree } from '@react-three/fiber';
import { BookModel } from "./BookModel";
import * as THREE from "three";
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js'

const ToolsScene = () => {
  const spotlightToolsRef = useRef<THREE.SpotLight>(null!)
  const arealightToolsRef = useRef<THREE.RectAreaLight>(null!)

  const scroll = useScroll();

  useHelper(spotlightToolsRef, THREE.SpotLightHelper, 'pink')
  useHelper(arealightToolsRef, RectAreaLightHelper, 'green')

  const progressRef = useRef<number>(0);
  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();

//   useFrame(() => {
//     progressRef.current = scroll.offset;

//     if (progressRef.current) {
//       camPos.lerpVectors(
//         new THREE.Vector3(5, 3.7, 13),
//         new THREE.Vector3(15, 1, 0.65),
//         scroll.range(0, 1 / scroll.pages)
//       )

//       camTarget.lerpVectors(
//         new THREE.Vector3(0, 0, -2),
//         new THREE.Vector3(0, 0.5, 0.65),
//         scroll.range(0, 1 / scroll.pages)
//       )

//       controls.setLookAt(
//         camPos.x, camPos.y, camPos.z,
//         camTarget.x, camTarget.y, camTarget.z,
//         false
//       )
//     }
//   })

  const controls = useThree((state) => state.controls) as CameraControls;

  

  return (
    <> 
      <rectAreaLight
        ref={arealightToolsRef}
        color={0xffffff}
        intensity={5}
        width={0.4}
        height={0.5}
        position={[1.5, 0.5, -1]}
        rotation={[-Math.PI, -Math.PI, -Math.PI / 2]}
      />
      <spotLight
        ref={spotlightToolsRef}
        position={[1.5, 2.5, -2]}
        target-position={[1.516, 0, -2.202]}
        angle={0.6}
        distance={10}
        decay={2}
        penumbra={0.5}
        intensity={8}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      />
      <BookModel />
    </>
  );
};

export default ToolsScene;