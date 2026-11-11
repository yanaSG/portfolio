import { useThree } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";

export function useCameraControls() {
  return useThree(
    (state) => state.controls
  ) as CameraControls;
}