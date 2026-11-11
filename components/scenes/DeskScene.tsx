import React, { useRef, useEffect } from "react";
import { useHelper, CameraControls, useScroll } from "@react-three/drei";
import { useFrame, useThree } from '@react-three/fiber';
import { DeskModel } from "./DeskModel";
import { NameModel } from "./NameModel";
import { IntroductionModel } from "./IntroductionModel";
import * as THREE from "three";
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js'
import { useCameraControls } from "@/hooks/useCameraControls";

const DeskScene = () => {
  const spotlightRef = useRef<THREE.SpotLight>(null!)
  const arealightRef = useRef<THREE.RectAreaLight>(null!)

  const scroll = useScroll();

  useHelper(spotlightRef, THREE.SpotLightHelper, 'cyan')
  useHelper(arealightRef, RectAreaLightHelper, 'green')

  const progressRef = useRef<number>(0);
  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();

  // this is if you want to animate the progress value over time
  // useFrame((state) => {
  //   progressRef.current = (Math.sin(state.clock.elapsedTime) + 1) / 2;
  // });

  useFrame(() => {
    progressRef.current = scroll.offset;
    const TRANSITION_START = 1.6 / scroll.pages;
    const TRANSITION_END = 2 / scroll.pages;

    if (progressRef.current) {
      camPos.lerpVectors(
        new THREE.Vector3(5, 3.7, 13),
        new THREE.Vector3(15, 1, 0.65),
        scroll.range(0, 1 / scroll.pages)
      )

      camTarget.lerpVectors(
        new THREE.Vector3(0, 0, -2),
        new THREE.Vector3(0, 0.5, 0.65),
        scroll.range(0, 1 / scroll.pages)
      )

      controls.setLookAt(
        camPos.x, camPos.y, camPos.z,
        camTarget.x, camTarget.y, camTarget.z,
        false
      )
    }

    const pathProgress = THREE.MathUtils.clamp(
      (progressRef.current - TRANSITION_START) /
      (TRANSITION_END - TRANSITION_START),
      0,
      1
    );

    // Moving camera to page 3 transition
    if (pathProgress > 0) {
      // camPos.lerpVectors(
      //   new THREE.Vector3(15, 1, 0.65),
      //   new THREE.Vector3(1.472, 0.8, 13),
      //   pathProgress
      // )
      camPos.lerpVectors(
        new THREE.Vector3(15, 1, 0.65),
        new THREE.Vector3(4, 15, 13),
        pathProgress
      )

      camTarget.lerpVectors(
        new THREE.Vector3(0, 0.5, 0.65),
        new THREE.Vector3(1.472, 0.5, -2.136),
        pathProgress
      )

      controls.setLookAt(
        camPos.x, camPos.y, camPos.z,
        camTarget.x, camTarget.y, camTarget.z,
        false
      )
    }
  })

  const controls = useCameraControls();

  const animate = async (): Promise<void> => {
    controls.setLookAt(8, 8, 8, 0, 0.25, 0, false);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));

    controls.smoothTime = 0.6;
    await controls.setLookAt(5, 3.7, 13, 0, 0, -2, true);
  };

  useEffect(() => {
    if (!controls) {
      return;
    }
    animate();
  }, [controls]);

  return (
    <>
      <rectAreaLight
        ref={arealightRef}
        color={0xffffff}
        intensity={5}
        width={0.1}
        height={0.4}
        position={[-0.2, 0.9, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <spotLight
        ref={spotlightRef}
        position={[0, 1.5, 0]}
        target-position={[0, 0, 0]}
        angle={0.7}
        distance={10}
        decay={2}
        penumbra={0.5}
        intensity={3.5}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      />
      <DeskModel />
      <NameModel
        texts={["ALLIYANA ROSE GARCIA", "Full Stack Development | AI Automation"]}
        progressRef={progressRef}
        minScales={[0.2, 0.08]}
        waveWidth={0.6}
        fontSizes={[0.25, 0.08]}
        maxWidth={[0.6, 3]}
        lineHeight={1}
        color="white"
        font="/fonts/Poppins-Black.ttf"
        anchorX="left"
        anchorY="middle"
      />
      <IntroductionModel
        texts={[
          "Bachelor of Science in",
          "Computer Science",
          "Major in",
          "Artificial Intelligence",
          "Web Development"
        ]}
        progressRef={progressRef}
        lineHeight={1}
        overallHeight={1}
        heightDistributions={[0.085, 0.13, 0.085, 0.16, 0.16]}
        maxWidths={[1.5, 2, 0.6, 0.6, 2]}
        color="white"
        fonts={["/fonts/Poppins-Black.ttf", "/fonts/Poppins-BoldItalic.ttf"]}
        anchorX="left"
        anchorY="middle"
        rotation={[0, Math.PI / 2, 0]}
      />
      <axesHelper args={[500]} />
    </>
  );
};

export default DeskScene;