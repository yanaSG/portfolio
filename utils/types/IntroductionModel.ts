import { RefObject } from 'react'
import * as THREE from "three"

export interface IntroductionModelProps {
    texts: string[];
    progressRef: RefObject<number>;
    color?: string;
    fonts: string[];
    overallHeight: number;
    heightDistributions: number[];
    maxWidths: number[];
    anchorX?: number | "center" | "left" | "right" | undefined;
    anchorY?: number | "top" | "top-baseline" | "middle" | "bottom-baseline" | "bottom" | undefined;
    [key: string]: unknown;
}

export interface TroikaTextRenderInfo {
    blockBounds: [number, number, number, number]; // [minX, minY, maxX, maxY]
}

export interface TroikaTextMesh extends THREE.Mesh {
    textRenderInfo?: TroikaTextRenderInfo;
}

export interface BendUniforms {
    uProgress: { value: number };
    uCenterX: { value: number };
    uDir: { value: number };
    uTextHalfWidth: { value: number };
    uPathBlend: { value: number };
    uObjectPosition: { value: THREE.Vector3 };
}