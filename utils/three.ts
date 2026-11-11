import * as THREE from "three";

// PURPOSE:
// This function takes an existing THREE.AnimationClip and a THREE.Skeleton, and creates a new AnimationClip that only contains the tracks relevant to the provided skeleton.
// In simple words, this is for an object that has multiple bones,
// and we want to create an animation that only affects the bones
// of a specific part of that object (like a page of a book),
// ignoring the rest of the bones.
export function createPageClip(
  sourceClip: THREE.AnimationClip,
  skeleton: THREE.Skeleton,
  clipName: string
) {
  const boneNames = new Set(
    skeleton.bones.map((bone) => bone.name)
  );

  const tracks = sourceClip.tracks.filter((track) => {
    try {
      const parsed = THREE.PropertyBinding.parseTrackName(
        track.name
      );

      // Handles tracks such as:
      // Bone.quaternion
      // Armature.bones[Bone].quaternion
      const targetNames = [
        parsed.nodeName,
        parsed.objectName === "bones"
          ? parsed.objectIndex
          : undefined,
      ];

      return targetNames.some(
        (name) => name != null && boneNames.has(name)
      );
    } catch {
      return false;
    }
  });

  if (tracks.length === 0) {
    console.warn(`No matching tracks for ${clipName}`);
    return null;
  }

  return new THREE.AnimationClip(
    clipName,
    sourceClip.duration,
    tracks
  );
}