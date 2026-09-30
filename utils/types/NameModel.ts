import { RefObject } from 'react'
import * as THREE from "three"

export interface TroikaTextRenderInfo {
    blockBounds: [number, number, number, number]; // [minX, minY, maxX, maxY]
}

export interface TroikaTextMesh extends THREE.Mesh {
    textRenderInfo?: TroikaTextRenderInfo;
}

export interface BendUniforms {
    uProgress: { value: number };
    uMinX: { value: number };
    uMaxX: { value: number };
    uCenterX: { value: number };
    uMinScale: { value: number };
    uWaveWidth: { value: number };
}

export interface ShrinkingTextProps {
    texts: string[];
    progressRef: RefObject<number>;
    minScales: number[];
    waveWidth?: number; // 0–1
    lift?: number;      // height of the text's anchor above the ground
    flip?: boolean;     // read/face the opposite side
    fontSizes: number[];
    color?: string;
    maxWidth: number[];
    lineHeight?: number;
    font?: string;
    anchorX?: number | "center" | "left" | "right" | undefined;
    anchorY?: number | "top" | "top-baseline" | "middle" | "bottom-baseline" | "bottom" | undefined;
    [key: string]: unknown;
}