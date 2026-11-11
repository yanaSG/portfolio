import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// export function useScrollAnimate(
//     scroll: { offset: number; pages: number }, 
//     action: THREE.AnimationAction,
//     start: number,
//     end: number
// ): void;


export function useScrollAnimate(
    scroll: { offset: number; pages: number },
    action: THREE.AnimationAction,
    start: number,
    end: number,
    clamp: boolean = true
) {
    if (!action) return;

    if (scroll.offset >= start && scroll.offset < end) {

        action.enabled = true;

        action.setLoop(THREE.LoopOnce, 0);
        action.clampWhenFinished = clamp;

        action.play();

        action.paused = true;

        const progress = THREE.MathUtils.clamp(
            (scroll.offset - start) / (end - start),
            0,
            1
        );

        action.time = progress * action.getClip().duration;
    }
}
