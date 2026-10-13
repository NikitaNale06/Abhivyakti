import * as THREE from 'three';

export interface JointRotation {
  x?: number;
  y?: number;
  z?: number;
}

export interface FingerJoints {
  mcp?: JointRotation; // 01
  pip?: JointRotation; // 02
  dip?: JointRotation; // 03
}

export interface HandPoseDefinition {
  wrist?: JointRotation;
  thumb?: {
    cmc?: JointRotation; // thumb_01_r
    mcp?: JointRotation; // thumb_02_r
    ip?: JointRotation;  // thumb_03_r
  };
  index?: FingerJoints;
  middle?: FingerJoints;
  ring?: FingerJoints;
  pinky?: FingerJoints;
}

export interface DiscoveredHandRig {
  wrist: THREE.Bone | null;
  thumb: [THREE.Bone | null, THREE.Bone | null, THREE.Bone | null];
  index: [THREE.Bone | null, THREE.Bone | null, THREE.Bone | null];
  middle: [THREE.Bone | null, THREE.Bone | null, THREE.Bone | null];
  ring: [THREE.Bone | null, THREE.Bone | null, THREE.Bone | null];
  pinky: [THREE.Bone | null, THREE.Bone | null, THREE.Bone | null];
  restQuaternions: Map<string, THREE.Quaternion>;
}

export function discoverHandRig(root: THREE.Object3D): DiscoveredHandRig {
  const rig: DiscoveredHandRig = {
    wrist: null,
    thumb: [null, null, null],
    index: [null, null, null],
    middle: [null, null, null],
    ring: [null, null, null],
    pinky: [null, null, null],
    restQuaternions: new Map(),
  };

  root.traverse((obj) => {
    if ((obj as any).isBone) {
      const bone = obj as THREE.Bone;
      rig.restQuaternions.set(bone.name, bone.quaternion.clone());

      const name = bone.name.toLowerCase();
      if (name.includes('hand_r') || name === 'wrist_r') {
        rig.wrist = bone;
      } else if (name.startsWith('thumb_01')) {
        rig.thumb[0] = bone;
      } else if (name.startsWith('thumb_02')) {
        rig.thumb[1] = bone;
      } else if (name.startsWith('thumb_03')) {
        rig.thumb[2] = bone;
      } else if (name.startsWith('index_01')) {
        rig.index[0] = bone;
      } else if (name.startsWith('index_02')) {
        rig.index[1] = bone;
      } else if (name.startsWith('index_03')) {
        rig.index[2] = bone;
      } else if (name.startsWith('middle_01')) {
        rig.middle[0] = bone;
      } else if (name.startsWith('middle_02')) {
        rig.middle[1] = bone;
      } else if (name.startsWith('middle_03')) {
        rig.middle[2] = bone;
      } else if (name.startsWith('ring_01')) {
        rig.ring[0] = bone;
      } else if (name.startsWith('ring_02')) {
        rig.ring[1] = bone;
      } else if (name.startsWith('ring_03')) {
        rig.ring[2] = bone;
      } else if (name.startsWith('pinky_01')) {
        rig.pinky[0] = bone;
      } else if (name.startsWith('pinky_02')) {
        rig.pinky[1] = bone;
      } else if (name.startsWith('pinky_03')) {
        rig.pinky[2] = bone;
      }
    }
  });

  return rig;
}

export function applyPoseToRig(
  rig: DiscoveredHandRig,
  pose: HandPoseDefinition,
  targetQuaternions: Map<string, THREE.Quaternion>
): void {
  const setTarget = (bone: THREE.Bone | null, rot?: JointRotation) => {
    if (!bone) return;
    const restQ = rig.restQuaternions.get(bone.name);
    if (!restQ) return;

    if (!rot) {
      targetQuaternions.set(bone.name, restQ.clone());
      return;
    }

    const euler = new THREE.Euler(rot.x || 0, rot.y || 0, rot.z || 0, 'XYZ');
    const relQ = new THREE.Quaternion().setFromEuler(euler);
    const targetQ = restQ.clone().multiply(relQ);
    targetQuaternions.set(bone.name, targetQ);
  };

  // Wrist
  setTarget(rig.wrist, pose.wrist);

  // Thumb
  setTarget(rig.thumb[0], pose.thumb?.cmc);
  setTarget(rig.thumb[1], pose.thumb?.mcp);
  setTarget(rig.thumb[2], pose.thumb?.ip);

  // Index
  setTarget(rig.index[0], pose.index?.mcp);
  setTarget(rig.index[1], pose.index?.pip);
  setTarget(rig.index[2], pose.index?.dip);

  // Middle
  setTarget(rig.middle[0], pose.middle?.mcp);
  setTarget(rig.middle[1], pose.middle?.pip);
  setTarget(rig.middle[2], pose.middle?.dip);

  // Ring
  setTarget(rig.ring[0], pose.ring?.mcp);
  setTarget(rig.ring[1], pose.ring?.pip);
  setTarget(rig.ring[2], pose.ring?.dip);

  // Pinky
  setTarget(rig.pinky[0], pose.pinky?.mcp);
  setTarget(rig.pinky[1], pose.pinky?.pip);
  setTarget(rig.pinky[2], pose.pinky?.dip);
}
