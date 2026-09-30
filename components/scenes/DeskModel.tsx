import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { type ThreeElements } from "@react-three/fiber";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js"; 

type GLTFResult = GLTF & {
  nodes: {
    Circle: THREE.Mesh;
    Cube: THREE.Mesh;
    Cube001: THREE.Mesh;
    Cube002: THREE.Mesh;
    Cube003: THREE.Mesh;
    Cube004: THREE.Mesh;
    Cube005: THREE.Mesh;
    Cube006: THREE.Mesh;
    Cube008: THREE.Mesh;
    Cube009: THREE.Mesh;
    Cube010: THREE.Mesh;
    Cube012: THREE.Mesh;
  };
  materials: {
    Material: THREE.MeshStandardMaterial;
    "Material.002": THREE.MeshStandardMaterial;
    KeyboardBaseColor: THREE.MeshStandardMaterial;
    "KeyboardGrayCaps.001": THREE.MeshStandardMaterial;
    "KeyboardBlackCaps.001": THREE.MeshStandardMaterial;
    Screen: THREE.MeshStandardMaterial;
    "Screen.001": THREE.MeshStandardMaterial;
    "PainterlyTexture.001": THREE.MeshStandardMaterial;
    "PainterlyTexture.002": THREE.MeshStandardMaterial;
    "PainterlyTexture.003": THREE.MeshStandardMaterial;
    "PainterlyTexture.006": THREE.MeshStandardMaterial;
  };
};

export function DeskModel(props: ThreeElements["group"]) {
  const { nodes, materials } = useGLTF('/desk-model/baked-setup.glb') as unknown as GLTFResult

  const bakedTextures = {
    chair: useTexture("/desk-model/BakeL_Chair.png"),
    ground: useTexture("/desk-model/BakeL_Ground.png"),
    keyboard: useTexture("/desk-model/BakeL_Keyboard.png"),
    laptop: useTexture("/desk-model/BakeL_Laptop.png"),
    monitor: useTexture("/desk-model/BakeL_Monitor.png"),
    mouse: useTexture("/desk-model/BakeL_Mouse.png"),
    table: useTexture("/desk-model/BakeL_Table.png"),
  }

  function initBakedTextures() {
    Object.values(bakedTextures).forEach((texture) => {
      texture.colorSpace = THREE.NoColorSpace;
      texture.flipY = false;
    });
  }
  
  initBakedTextures();

  RectAreaLightUniformsLib.init();

  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.Circle.geometry}
        material={materials.Material}
      >
        <meshStandardMaterial
          map={bakedTextures.ground}
        />
      </mesh>
      <mesh
        geometry={nodes.Cube003.geometry}
      // material={materials['Material.002']}
      >
        <meshStandardMaterial
          map={bakedTextures.table}
        />
      </mesh>
      <mesh
        geometry={nodes.Cube004.geometry}
      // material={materials['PainterlyTexture.001']}
      >
        <meshStandardMaterial
          map={bakedTextures.chair}
        />
      </mesh>
      <mesh
        geometry={nodes.Cube005.geometry}
      // material={materials.Screen}
      >
        <meshStandardMaterial
          map={bakedTextures.laptop}
        />
      </mesh>
      <mesh
        geometry={nodes.Cube006.geometry}
      // material={materials['Screen.001']}
      >
        <meshStandardMaterial
          map={bakedTextures.monitor}
        />
      </mesh>
      <mesh
        geometry={nodes.Cube009.geometry}
      // material={materials['PainterlyTexture.003']}
      >
        <meshStandardMaterial
          map={bakedTextures.mouse}
        />
      </mesh>
      <mesh
        geometry={nodes.Cube010.geometry}
      // material={materials.KeyboardBaseColor}
      >
        <meshStandardMaterial
          map={bakedTextures.keyboard}
        />
      </mesh>
      <ambientLight intensity={0.0005} />
    </group>
  )
}

useGLTF.preload('/desk-model/baked-setup.glb')