import { HandPoseDefinition } from './handBoneMapper';

export type HandCount = 'one' | 'two';

export interface HandTransform {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export interface HandConfiguration {
  transform?: HandTransform;
  pose: HandPoseDefinition;
}

export interface ISLSignPose {
  handsRequired: HandCount;
  rightHand: HandConfiguration;
  leftHand?: HandConfiguration;
}

export interface ISLCameraPreset {
  position: [number, number, number];
  target: [number, number, number];
}

export interface ISLSignDefinition {
  id: string;
  label: string;
  name: string;
  category: 'alphabet' | 'number';
  handsRequired: HandCount;
  poseId: string;
  referenceSource: string;
  verified: boolean;
  description: string;
  instructions: string[];
  tips: string;
  isDynamic: boolean;
  dynamicPath?: 'J_SWOOP' | 'Z_ZIGZAG';
  camera?: ISLCameraPreset;
  fullPose: ISLSignPose;
  pose: HandPoseDefinition; // backwards-compatible reference
}

// Finger poses for single and multi-joint kinematics:
// - Joint 01 (MCP), 02 (PIP), 03 (DIP) curl along local -Z:
//   - Straight extended: 0
//   - Partial bend: -0.5 to -0.8
//   - Full curl into palm: -1.2 to -1.5
// - Thumb:
//   - CMC (01): across palm (+X: swings into palm, -Z: swings away)
//   - MCP (02): curl (+X, +Z)
//   - IP (03): tip curl (+X)

const FINGER_OPEN = { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } };
const FINGER_CURLED = { mcp: { z: -1.35 }, pip: { z: -1.45 }, dip: { z: -1.15 } };
const FINGER_HOOK = { mcp: { z: -0.2 }, pip: { z: -1.35 }, dip: { z: -1.05 } };

// Left hand neutral open palm (used as passive base for vowels and two-handed signs)
const LEFT_HAND_OPEN_PALM: HandPoseDefinition = {
  thumb: { cmc: { x: -0.3, z: -0.5 }, mcp: { x: 0 }, ip: { x: 0 } },
  index: { mcp: { x: -0.1, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
  middle: { mcp: { x: 0, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
  ring: { mcp: { x: 0.1, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
  pinky: { mcp: { x: 0.2, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
};

// Dominant right hand index pointer pose (used for vowels A, E, I, O, U)
const RIGHT_HAND_POINTER: HandPoseDefinition = {
  index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
  middle: FINGER_CURLED,
  ring: FINGER_CURLED,
  pinky: FINGER_CURLED,
  thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
};

// B Pose loop definition: Index curves down, thumb curves up meeting tips with sub-mm contact
const B_LOOP_INDEX = { mcp: { z: -1.1 }, pip: { z: -1.0 }, dip: { z: -0.3 } };
const B_LOOP_THUMB = { cmc: { x: 0.5, z: -0.2 }, mcp: { x: 0.3 }, ip: { x: 0.3 } };
const B_HAND_POSE: HandPoseDefinition = {
  index: B_LOOP_INDEX,
  thumb: B_LOOP_THUMB,
  middle: FINGER_CURLED,
  ring: FINGER_CURLED,
  pinky: FINGER_CURLED,
};

// ISLRTC / AYJNISHD National Standard Reference Source
const ISL_REF = 'ISLRTC / AYJNISHD Indian Sign Language Manual Alphabet & Numerals Standard';

export const ISL_ALPHABET_DATA: ISLSignDefinition[] = [
  {
    id: 'A',
    label: 'A',
    name: 'Letter A',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_A_TWO_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed sign: Left hand holds open palm with thumb extended; Right index finger touches left thumb tip.',
    instructions: [
      'Hold left hand open in front of your chest with palm facing forward and thumb extended.',
      'With your right hand, point your index finger like a pointer, with other fingers curled in a fist.',
      'Touch the tip of your right index finger directly to the tip of your left thumb.',
    ],
    tips: 'A is the first vowel — touching the thumb, which is the 1st digit of the non-dominant hand.',
    isDynamic: false,
    camera: { position: [0, 0.03, -0.46], target: [0, 0.01, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [-0.04, -0.01, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: LEFT_HAND_OPEN_PALM,
      },
      rightHand: {
        transform: { position: [-0.126, -0.113, -0.064], rotation: [Math.PI / 2, -0.2, 0.4] },
        pose: RIGHT_HAND_POINTER,
      },
    },
    pose: RIGHT_HAND_POINTER,
  },
  {
    id: 'B',
    label: 'B',
    name: 'Letter B',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_B_TWO_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed sign: Both hands form curved loops touching thumbs and fingertips together, forming two circular loops ("B" shape).',
    instructions: [
      'Curve the index finger and thumb of your left hand into a loop, with other fingers curled into a fist.',
      'Curve the index finger and thumb of your right hand into a matching loop, with other fingers curled into a fist.',
      'Bring both hands together so the index tips and thumb tips touch at the midline, forming the double loop of "B".',
    ],
    tips: 'The two loops formed by both hands create the upper and lower lobes of a capital "B".',
    isDynamic: false,
    camera: { position: [0, 0.02, -0.43], target: [0, 0.0, -0.01] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [0.020, 0, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: B_HAND_POSE,
      },
      rightHand: {
        transform: { position: [-0.020, 0, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: B_HAND_POSE,
      },
    },
    pose: B_HAND_POSE,
  },
  {
    id: 'C',
    label: 'C',
    name: 'Letter C',
    category: 'alphabet',
    handsRequired: 'one',
    poseId: 'ISL_ALPHA_C_ONE_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Single-handed sign: Right hand curves all fingers together and thumb opposed to form a "C" shape.',
    instructions: [
      'Curve your right fingers together in a smooth gentle arch.',
      'Curve your right thumb forward facing the fingertips.',
      'Turn hand slightly to the side so the open "C" is visible.',
    ],
    tips: 'Hold your fingers as if grasping a cup.',
    isDynamic: false,
    camera: { position: [-0.20, 0.035, -0.34], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'one',
      rightHand: {
        transform: { position: [0, 0, 0], rotation: [Math.PI / 2, 0.4, 0] },
        pose: {
          index: { mcp: { z: -0.65 }, pip: { z: -0.65 }, dip: { z: -0.45 } },
          middle: { mcp: { z: -0.65 }, pip: { z: -0.65 }, dip: { z: -0.45 } },
          ring: { mcp: { z: -0.65 }, pip: { z: -0.65 }, dip: { z: -0.45 } },
          pinky: { mcp: { z: -0.65 }, pip: { z: -0.65 }, dip: { z: -0.45 } },
          thumb: { cmc: { x: 0.45, z: -0.25 }, mcp: { x: 0.45, z: 0.3 }, ip: { x: 0.3 } },
        },
      },
    },
    pose: {
      index: { mcp: { z: -0.65 }, pip: { z: -0.65 }, dip: { z: -0.45 } },
      middle: { mcp: { z: -0.65 }, pip: { z: -0.65 }, dip: { z: -0.45 } },
      ring: { mcp: { z: -0.65 }, pip: { z: -0.65 }, dip: { z: -0.45 } },
      pinky: { mcp: { z: -0.65 }, pip: { z: -0.65 }, dip: { z: -0.45 } },
      thumb: { cmc: { x: 0.45, z: -0.25 }, mcp: { x: 0.45, z: 0.3 }, ip: { x: 0.3 } },
    },
  },
  {
    id: 'D',
    label: 'D',
    name: 'Letter D',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_D_TWO_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed sign: Left index finger points straight UP (stem of D); Right thumb and index curve touching left index to form "D".',
    instructions: [
      'Point your left index finger straight up like a vertical pole.',
      'With your right hand, curve your thumb and index finger into a "C" arc.',
      'Touch your right index tip to the top of your left index, and your right thumb to the base of your left index.',
    ],
    tips: 'The left index forms the vertical spine of D; the right hand forms the curved loop.',
    isDynamic: false,
    camera: { position: [-0.12, 0.035, -0.44], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [-0.025, 0, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: {
          index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          middle: FINGER_CURLED,
          ring: FINGER_CURLED,
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
        },
      },
      rightHand: {
        transform: { position: [0.015, 0, 0], rotation: [Math.PI / 2, -0.15, 0] },
        pose: {
          index: { mcp: { z: -0.7 }, pip: { z: -0.8 }, dip: { z: -0.6 } },
          middle: FINGER_CURLED,
          ring: FINGER_CURLED,
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: 0.65, z: 0.1 }, mcp: { x: 0.55, z: 0.2 }, ip: { x: 0.35 } },
        },
      },
    },
    pose: {
      index: { mcp: { z: -0.7 }, pip: { z: -0.8 }, dip: { z: -0.6 } },
      middle: FINGER_CURLED,
      ring: FINGER_CURLED,
      pinky: FINGER_CURLED,
      thumb: { cmc: { x: 0.65, z: 0.1 }, mcp: { x: 0.55, z: 0.2 }, ip: { x: 0.35 } },
    },
  },
  {
    id: 'E',
    label: 'E',
    name: 'Letter E',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_E_TWO_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed sign: Left hand holds open palm; Right index finger touches left index finger tip.',
    instructions: [
      'Hold left hand open with palm facing forward and fingers spread.',
      'Extend right index finger like a pointer, other fingers curled.',
      'Touch the tip of your right index finger to the tip of your left index finger.',
    ],
    tips: 'E is the second vowel — pointing to the 2nd digit (index finger) of the left hand.',
    isDynamic: false,
    camera: { position: [0, 0.03, -0.46], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [-0.04, 0, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: LEFT_HAND_OPEN_PALM,
      },
      rightHand: {
        transform: { position: [-0.123, 0.008, -0.014], rotation: [Math.PI / 2, -0.2, 0.4] },
        pose: RIGHT_HAND_POINTER,
      },
    },
    pose: RIGHT_HAND_POINTER,
  },
  {
    id: 'F',
    label: 'F',
    name: 'Letter F',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_F_TWO_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed sign: Left index and middle fingers held together horizontally; Right index and middle fingers placed across them forming a cross ("#").',
    instructions: [
      'Hold left hand with index and middle fingers extended together horizontally.',
      'Hold right hand with index and middle fingers extended together.',
      'Place right two fingers horizontally across top of left two fingers, forming a cross/hash.',
    ],
    tips: 'Two fingers crossing two fingers like a hash or grid symbol.',
    isDynamic: false,
    camera: { position: [0, 0.035, -0.45], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [-0.035, 0, 0], rotation: [Math.PI / 2, 0, -Math.PI / 3] },
        pose: {
          index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          middle: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          ring: FINGER_CURLED,
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
        },
      },
      rightHand: {
        transform: { position: [0.035, 0, 0.015], rotation: [Math.PI / 2, 0, Math.PI / 3] },
        pose: {
          index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          middle: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          ring: FINGER_CURLED,
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
        },
      },
    },
    pose: {
      index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      middle: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      ring: FINGER_CURLED,
      pinky: FINGER_CURLED,
      thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
    },
  },
  {
    id: 'G',
    label: 'G',
    name: 'Letter G',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_G_TWO_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed sign: Both hands form closed fists, right fist placed directly on top of left fist.',
    instructions: [
      'Make a firm fist with your left hand, thumb folded across front.',
      'Make a firm fist with your right hand.',
      'Place your right fist directly on top of your left fist.',
    ],
    tips: 'Two fists stacked vertically like blocks.',
    isDynamic: false,
    camera: { position: [0, 0.035, -0.44], target: [0, 0, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [0, -0.04, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: {
          index: FINGER_CURLED,
          middle: FINGER_CURLED,
          ring: FINGER_CURLED,
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: 0.85, z: 0.35 }, mcp: { x: 0.65 }, ip: { x: 0.35 } },
        },
      },
      rightHand: {
        transform: { position: [0, 0.04, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: {
          index: FINGER_CURLED,
          middle: FINGER_CURLED,
          ring: FINGER_CURLED,
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: 0.85, z: 0.35 }, mcp: { x: 0.65 }, ip: { x: 0.35 } },
        },
      },
    },
    pose: {
      index: FINGER_CURLED,
      middle: FINGER_CURLED,
      ring: FINGER_CURLED,
      pinky: FINGER_CURLED,
      thumb: { cmc: { x: 0.85, z: 0.35 }, mcp: { x: 0.65 }, ip: { x: 0.35 } },
    },
  },
  {
    id: 'H',
    label: 'H',
    name: 'Letter H',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_H_TWO_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed sign: Left hand holds open flat palm facing up; Right hand slides flat palm horizontally across left palm.',
    instructions: [
      'Hold left hand flat horizontally with palm facing up.',
      'Hold right hand flat with fingers together.',
      'Slide your right hand flat across the palm of your left hand from wrist to fingertips.',
    ],
    tips: 'Right hand sweeps flat across the left palm.',
    isDynamic: false,
    camera: { position: [0, 0.13, -0.44], target: [0, 0.01, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [-0.04, -0.02, 0], rotation: [Math.PI / 2, 0, -Math.PI / 4] },
        pose: LEFT_HAND_OPEN_PALM,
      },
      rightHand: {
        transform: { position: [0.03, 0.02, 0.01], rotation: [Math.PI / 2, 0, Math.PI / 4] },
        pose: {
          index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          middle: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          ring: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          pinky: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          thumb: { cmc: { x: 0.85, z: 0.35 }, mcp: { x: 0.65 }, ip: { x: 0.35 } },
        },
      },
    },
    pose: {
      index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      middle: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      ring: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      pinky: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      thumb: { cmc: { x: 0.85, z: 0.35 }, mcp: { x: 0.65 }, ip: { x: 0.35 } },
    },
  },
  {
    id: 'I',
    label: 'I',
    name: 'Letter I',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_I_TWO_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed sign: Left hand holds open palm; Right index finger touches left middle finger tip.',
    instructions: [
      'Hold left hand open with palm facing forward and fingers spread.',
      'Extend right index finger like a pointer, other fingers curled.',
      'Touch the tip of your right index finger to the tip of your left middle finger.',
    ],
    tips: 'I is the 3rd vowel — pointing to the 3rd digit (middle finger) of the left hand.',
    isDynamic: false,
    camera: { position: [0, 0.03, -0.46], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [-0.04, 0, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: LEFT_HAND_OPEN_PALM,
      },
      rightHand: {
        transform: { position: [-0.084, 0.020, -0.013], rotation: [Math.PI / 2, -0.2, 0.4] },
        pose: RIGHT_HAND_POINTER,
      },
    },
    pose: RIGHT_HAND_POINTER,
  },
  {
    id: 'J',
    label: 'J',
    name: 'Letter J',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_J_TWO_HAND_DYNAMIC',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed dynamic sign: Left hand holds open palm; Right index touches left middle finger and swoops down and curves up the thumb.',
    instructions: [
      'Hold left hand open in front with palm facing you.',
      'Start with right index finger touching left middle finger tip (as in "I").',
      'Trace downward along the palm and curve up onto the thumb, drawing a "J" stroke.',
    ],
    tips: 'Dynamic movement: watch the right index trace the letter J onto the left palm.',
    isDynamic: true,
    dynamicPath: 'J_SWOOP',
    camera: { position: [0, 0.03, -0.46], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [-0.04, 0, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: LEFT_HAND_OPEN_PALM,
      },
      rightHand: {
        transform: { position: [-0.084, 0.020, -0.013], rotation: [Math.PI / 2, -0.2, 0.4] },
        pose: RIGHT_HAND_POINTER,
      },
    },
    pose: RIGHT_HAND_POINTER,
  },
  {
    id: 'K',
    label: 'K',
    name: 'Letter K',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_K_TWO_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed sign: Left index points straight UP; Right hooked index touches left index middle knuckle to form "K".',
    instructions: [
      'Point left index finger straight up like a vertical stem.',
      'Hook your right index finger at a 45-degree angle.',
      'Touch the knuckle of your right hooked index to the middle of the left index finger.',
    ],
    tips: 'Together they form the vertical spine and diagonal arms of "K".',
    isDynamic: false,
    camera: { position: [-0.10, 0.035, -0.44], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [-0.025, 0, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: {
          index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          middle: FINGER_CURLED,
          ring: FINGER_CURLED,
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
        },
      },
      rightHand: {
        transform: { position: [0.025, 0, 0], rotation: [Math.PI / 2, -0.2, 0] },
        pose: {
          index: FINGER_HOOK,
          middle: FINGER_CURLED,
          ring: FINGER_CURLED,
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
        },
      },
    },
    pose: {
      index: FINGER_HOOK,
      middle: FINGER_CURLED,
      ring: FINGER_CURLED,
      pinky: FINGER_CURLED,
      thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
    },
  },
  {
    id: 'L',
    label: 'L',
    name: 'Letter L',
    category: 'alphabet',
    handsRequired: 'one',
    poseId: 'ISL_ALPHA_L_ONE_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Single-handed sign: Right index finger points straight UP, thumb extends horizontally at 90° forming an "L".',
    instructions: [
      'Extend right index finger straight up.',
      'Extend right thumb horizontally out to the side at a right angle.',
      'Curl middle, ring, and pinky fingers tightly into palm.',
    ],
    tips: 'The index finger and thumb form a clear capital "L".',
    isDynamic: false,
    camera: { position: [0, 0.035, -0.38], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'one',
      rightHand: {
        transform: { position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: {
          index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          middle: FINGER_CURLED,
          ring: FINGER_CURLED,
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: -0.35, z: -0.65 }, mcp: { x: 0 }, ip: { x: 0 } },
        },
      },
    },
    pose: {
      index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      middle: FINGER_CURLED,
      ring: FINGER_CURLED,
      pinky: FINGER_CURLED,
      thumb: { cmc: { x: -0.35, z: -0.65 }, mcp: { x: 0 }, ip: { x: 0 } },
    },
  },
  {
    id: 'M',
    label: 'M',
    name: 'Letter M',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_M_TWO_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed sign: Left hand flat palm up; Right hand places three fingers (index, middle, ring) on the left palm.',
    instructions: [
      'Hold left hand open with palm facing upward.',
      'Extend index, middle, and ring fingers of right hand downwards.',
      'Rest the tips of your three right fingers onto the center of your left palm.',
    ],
    tips: 'Three fingers represent the three vertical legs of the letter "M".',
    isDynamic: false,
    camera: { position: [0, 0.15, -0.44], target: [0, 0.01, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [-0.04, -0.03, 0], rotation: [Math.PI / 2, 0, -Math.PI / 4] },
        pose: LEFT_HAND_OPEN_PALM,
      },
      rightHand: {
        transform: { position: [0.03, 0.03, 0.015], rotation: [Math.PI / 2, -0.3, Math.PI / 4] },
        pose: {
          index: { mcp: { z: -0.7 }, pip: { z: -0.5 }, dip: { z: 0 } },
          middle: { mcp: { z: -0.7 }, pip: { z: -0.5 }, dip: { z: 0 } },
          ring: { mcp: { z: -0.7 }, pip: { z: -0.5 }, dip: { z: 0 } },
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: 0.85, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
        },
      },
    },
    pose: {
      index: { mcp: { z: -0.7 }, pip: { z: -0.5 }, dip: { z: 0 } },
      middle: { mcp: { z: -0.7 }, pip: { z: -0.5 }, dip: { z: 0 } },
      ring: { mcp: { z: -0.7 }, pip: { z: -0.5 }, dip: { z: 0 } },
      pinky: FINGER_CURLED,
      thumb: { cmc: { x: 0.85, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
    },
  },
  {
    id: 'N',
    label: 'N',
    name: 'Letter N',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_N_TWO_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed sign: Left hand flat palm up; Right hand places two fingers (index, middle) on the left palm.',
    instructions: [
      'Hold left hand open with palm facing upward.',
      'Extend index and middle fingers of right hand downwards.',
      'Rest the tips of your two right fingers onto the center of your left palm.',
    ],
    tips: 'Two fingers represent the two vertical legs of the letter "N".',
    isDynamic: false,
    camera: { position: [0, 0.15, -0.44], target: [0, 0.01, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [-0.04, -0.03, 0], rotation: [Math.PI / 2, 0, -Math.PI / 4] },
        pose: LEFT_HAND_OPEN_PALM,
      },
      rightHand: {
        transform: { position: [0.03, 0.03, 0.015], rotation: [Math.PI / 2, -0.3, Math.PI / 4] },
        pose: {
          index: { mcp: { z: -0.7 }, pip: { z: -0.5 }, dip: { z: 0 } },
          middle: { mcp: { z: -0.7 }, pip: { z: -0.5 }, dip: { z: 0 } },
          ring: FINGER_CURLED,
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: 0.85, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
        },
      },
    },
    pose: {
      index: { mcp: { z: -0.7 }, pip: { z: -0.5 }, dip: { z: 0 } },
      middle: { mcp: { z: -0.7 }, pip: { z: -0.5 }, dip: { z: 0 } },
      ring: FINGER_CURLED,
      pinky: FINGER_CURLED,
      thumb: { cmc: { x: 0.85, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
    },
  },
  {
    id: 'O',
    label: 'O',
    name: 'Letter O',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_O_TWO_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed sign: Left hand holds open palm; Right index finger touches left ring finger tip.',
    instructions: [
      'Hold left hand open with palm facing forward and fingers spread.',
      'Extend right index finger like a pointer, other fingers curled.',
      'Touch the tip of your right index finger to the tip of your left ring finger.',
    ],
    tips: 'O is the 4th vowel — pointing to the 4th digit (ring finger) of the left hand.',
    isDynamic: false,
    camera: { position: [0, 0.03, -0.46], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [-0.04, 0, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: LEFT_HAND_OPEN_PALM,
      },
      rightHand: {
        transform: { position: [-0.053, 0.007, -0.009], rotation: [Math.PI / 2, -0.2, 0.4] },
        pose: RIGHT_HAND_POINTER,
      },
    },
    pose: RIGHT_HAND_POINTER,
  },
  {
    id: 'P',
    label: 'P',
    name: 'Letter P',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_P_TWO_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed sign: Left index finger points straight UP; Right thumb and index form a loop touching the top of the left index.',
    instructions: [
      'Point left index finger straight up.',
      'Curve right thumb and index finger into a circular loop.',
      'Touch the loop against the upper portion of the left index finger to form a "P".',
    ],
    tips: 'The left index is the vertical stem; the right loop forms the head of "P".',
    isDynamic: false,
    camera: { position: [-0.10, 0.035, -0.44], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [-0.025, 0, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: {
          index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          middle: FINGER_CURLED,
          ring: FINGER_CURLED,
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
        },
      },
      rightHand: {
        transform: { position: [0.025, 0.04, 0], rotation: [Math.PI / 2, -0.2, 0] },
        pose: {
          index: { mcp: { z: -0.7 }, pip: { z: -0.8 }, dip: { z: -0.6 } },
          middle: FINGER_CURLED,
          ring: FINGER_CURLED,
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: 0.65, z: 0.1 }, mcp: { x: 0.55, z: 0.2 }, ip: { x: 0.35 } },
        },
      },
    },
    pose: {
      index: { mcp: { z: -0.7 }, pip: { z: -0.8 }, dip: { z: -0.6 } },
      middle: FINGER_CURLED,
      ring: FINGER_CURLED,
      pinky: FINGER_CURLED,
      thumb: { cmc: { x: 0.65, z: 0.1 }, mcp: { x: 0.55, z: 0.2 }, ip: { x: 0.35 } },
    },
  },
  {
    id: 'Q',
    label: 'Q',
    name: 'Letter Q',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_Q_TWO_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed sign: Left thumb and index form a circle; Right index finger hooks into the circle from above.',
    instructions: [
      'With your left hand, touch your thumb and index finger to form a round circle.',
      'Extend your right index finger pointing downwards.',
      'Place your right index tip inside the left circle to form the tail of "Q".',
    ],
    tips: 'Left hand forms the circle of Q; right index creates the tail.',
    isDynamic: false,
    camera: { position: [0, 0.035, -0.44], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [-0.035, -0.02, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: {
          index: { mcp: { z: -0.85 }, pip: { z: -0.95 }, dip: { z: -0.75 } },
          middle: FINGER_CURLED,
          ring: FINGER_CURLED,
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: 0.75, z: 0.15 }, mcp: { x: 0.65, z: 0.25 }, ip: { x: 0.45 } },
        },
      },
      rightHand: {
        transform: { position: [0.02, 0.04, 0.015], rotation: [Math.PI / 2, -0.2, Math.PI / 6] },
        pose: RIGHT_HAND_POINTER,
      },
    },
    pose: RIGHT_HAND_POINTER,
  },
  {
    id: 'R',
    label: 'R',
    name: 'Letter R',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_R_TWO_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed sign: Left hand holds open flat palm; Right hooked index finger rests in the center of the left palm.',
    instructions: [
      'Hold left hand flat with palm facing upward.',
      'Hook your right index finger at the middle joint.',
      'Rest the pad of your right hooked index directly on the center of the left palm.',
    ],
    tips: 'Right hooked finger rests on the open left palm.',
    isDynamic: false,
    camera: { position: [0, 0.12, -0.44], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [-0.04, -0.02, 0], rotation: [Math.PI / 2, 0, -Math.PI / 4] },
        pose: LEFT_HAND_OPEN_PALM,
      },
      rightHand: {
        transform: { position: [0.03, 0.02, 0.015], rotation: [Math.PI / 2, -0.2, Math.PI / 4] },
        pose: {
          index: FINGER_HOOK,
          middle: FINGER_CURLED,
          ring: FINGER_CURLED,
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
        },
      },
    },
    pose: {
      index: FINGER_HOOK,
      middle: FINGER_CURLED,
      ring: FINGER_CURLED,
      pinky: FINGER_CURLED,
      thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
    },
  },
  {
    id: 'S',
    label: 'S',
    name: 'Letter S',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_S_TWO_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed sign: Pinky fingers of both hands extended and hooked together in a clasp.',
    instructions: [
      'Extend the pinky finger of your left hand, curling all other fingers into a fist.',
      'Extend the pinky finger of your right hand, curling all other fingers into a fist.',
      'Hook the two pinky fingers together in a firm clasp (pinky promise).',
    ],
    tips: 'Linked pinkies form the curves of the letter "S".',
    isDynamic: false,
    camera: { position: [0, 0.035, -0.44], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [-0.025, 0, 0], rotation: [Math.PI / 2, 0.2, 0] },
        pose: {
          index: FINGER_CURLED,
          middle: FINGER_CURLED,
          ring: FINGER_CURLED,
          pinky: FINGER_HOOK,
          thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.65 }, ip: { x: 0.35 } },
        },
      },
      rightHand: {
        transform: { position: [0.025, 0, 0.01], rotation: [Math.PI / 2, -0.2, 0] },
        pose: {
          index: FINGER_CURLED,
          middle: FINGER_CURLED,
          ring: FINGER_CURLED,
          pinky: FINGER_HOOK,
          thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.65 }, ip: { x: 0.35 } },
        },
      },
    },
    pose: {
      index: FINGER_CURLED,
      middle: FINGER_CURLED,
      ring: FINGER_CURLED,
      pinky: FINGER_HOOK,
      thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.65 }, ip: { x: 0.35 } },
    },
  },
  {
    id: 'T',
    label: 'T',
    name: 'Letter T',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_T_TWO_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed sign: Left index finger points straight UP; Right index finger placed horizontally across the top forming a "T".',
    instructions: [
      'Point your left index finger straight up.',
      'Extend your right index finger horizontally.',
      'Touch the center of your right index finger to the very tip of your left index finger, forming a "T".',
    ],
    tips: 'A vertical finger and horizontal finger meeting at the top form a capital "T".',
    isDynamic: false,
    camera: { position: [0, 0.035, -0.44], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [-0.035, -0.01, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: {
          index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          middle: FINGER_CURLED,
          ring: FINGER_CURLED,
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
        },
      },
      rightHand: {
        transform: { position: [0.02, 0.055, 0.01], rotation: [Math.PI / 2, 0, Math.PI / 2] },
        pose: RIGHT_HAND_POINTER,
      },
    },
    pose: RIGHT_HAND_POINTER,
  },
  {
    id: 'U',
    label: 'U',
    name: 'Letter U',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_U_TWO_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed sign: Left hand holds open palm; Right index finger touches left pinky finger tip.',
    instructions: [
      'Hold left hand open with palm facing forward and fingers spread.',
      'Extend right index finger like a pointer, other fingers curled.',
      'Touch the tip of your right index finger to the tip of your left pinky finger.',
    ],
    tips: 'U is the 5th vowel — pointing to the 5th digit (pinky finger) of the left hand.',
    isDynamic: false,
    camera: { position: [0, 0.03, -0.46], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [-0.04, 0, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: LEFT_HAND_OPEN_PALM,
      },
      rightHand: {
        transform: { position: [-0.028, -0.023, -0.013], rotation: [Math.PI / 2, -0.2, 0.4] },
        pose: RIGHT_HAND_POINTER,
      },
    },
    pose: RIGHT_HAND_POINTER,
  },
  {
    id: 'V',
    label: 'V',
    name: 'Letter V',
    category: 'alphabet',
    handsRequired: 'one',
    poseId: 'ISL_ALPHA_V_ONE_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Single-handed sign: Right hand extends index and middle fingers straight UP, spread apart in a "V" (peace sign).',
    instructions: [
      'Extend index and middle fingers straight upwards.',
      'Spread them apart in a distinct "V" shape.',
      'Curl ring and pinky fingers into palm, holding them down with thumb.',
    ],
    tips: 'The classic peace or victory sign.',
    isDynamic: false,
    camera: { position: [0, 0.035, -0.38], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'one',
      rightHand: {
        transform: { position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: {
          index: { mcp: { x: -0.28, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          middle: { mcp: { x: 0.28, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          ring: FINGER_CURLED,
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
        },
      },
    },
    pose: {
      index: { mcp: { x: -0.28, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      middle: { mcp: { x: 0.28, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      ring: FINGER_CURLED,
      pinky: FINGER_CURLED,
      thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
    },
  },
  {
    id: 'W',
    label: 'W',
    name: 'Letter W',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_W_TWO_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed sign: Fingers of both hands held upright with fingers interlocked and palms facing together to form a "W".',
    instructions: [
      'Spread the fingers of both hands pointing upwards.',
      'Interlock the fingers of both hands side by side.',
      'The multiple upright fingers form the peaks of "W".',
    ],
    tips: 'Interlocking upright fingers clearly form "W".',
    isDynamic: false,
    camera: { position: [0, 0.035, -0.46], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [-0.035, 0, 0], rotation: [Math.PI / 2, 0.15, 0] },
        pose: LEFT_HAND_OPEN_PALM,
      },
      rightHand: {
        transform: { position: [0.035, 0, 0.015], rotation: [Math.PI / 2, -0.15, 0] },
        pose: {
          thumb: { cmc: { x: -0.3, z: -0.5 }, mcp: { x: 0 }, ip: { x: 0 } },
          index: { mcp: { x: -0.1, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          middle: { mcp: { x: 0, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          ring: { mcp: { x: 0.1, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          pinky: { mcp: { x: 0.2, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
        },
      },
    },
    pose: {
      thumb: { cmc: { x: -0.3, z: -0.5 }, mcp: { x: 0 }, ip: { x: 0 } },
      index: { mcp: { x: -0.1, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      middle: { mcp: { x: 0, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      ring: { mcp: { x: 0.1, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      pinky: { mcp: { x: 0.2, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
    },
  },
  {
    id: 'X',
    label: 'X',
    name: 'Letter X',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_X_TWO_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed sign: Index fingers of both hands extended and crossed directly over each other in an "X".',
    instructions: [
      'Extend your left index finger, curling other fingers into a fist.',
      'Extend your right index finger, curling other fingers into a fist.',
      'Cross your right index finger directly over your left index finger to form an "X".',
    ],
    tips: 'Two index fingers crossed like two swords.',
    isDynamic: false,
    camera: { position: [0, 0.035, -0.44], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [-0.02, 0, 0], rotation: [Math.PI / 2, 0, -Math.PI / 4] },
        pose: {
          index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          middle: FINGER_CURLED,
          ring: FINGER_CURLED,
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
        },
      },
      rightHand: {
        transform: { position: [0.02, 0, 0.015], rotation: [Math.PI / 2, 0, Math.PI / 4] },
        pose: {
          index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          middle: FINGER_CURLED,
          ring: FINGER_CURLED,
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
        },
      },
    },
    pose: {
      index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      middle: FINGER_CURLED,
      ring: FINGER_CURLED,
      pinky: FINGER_CURLED,
      thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
    },
  },
  {
    id: 'Y',
    label: 'Y',
    name: 'Letter Y',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_Y_TWO_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed sign: Left hand forms a "V" with index and thumb; Right index finger rests between them forming "Y".',
    instructions: [
      'With your left hand, extend your thumb and index finger apart in a wide "V".',
      'With your right hand, point your index finger downwards.',
      'Place your right index finger between the left thumb and index, creating the bottom stem of the letter "Y".',
    ],
    tips: 'The two branches of left hand and the stem of right hand form "Y".',
    isDynamic: false,
    camera: { position: [0, 0.035, -0.44], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [-0.03, -0.01, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: {
          index: { mcp: { x: -0.3, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          thumb: { cmc: { x: -0.4, z: -0.6 }, mcp: { x: 0 }, ip: { x: 0 } },
          middle: FINGER_CURLED,
          ring: FINGER_CURLED,
          pinky: FINGER_CURLED,
        },
      },
      rightHand: {
        transform: { position: [0.025, 0.04, 0.015], rotation: [Math.PI / 2, 0, Math.PI / 3] },
        pose: RIGHT_HAND_POINTER,
      },
    },
    pose: RIGHT_HAND_POINTER,
  },
  {
    id: 'Z',
    label: 'Z',
    name: 'Letter Z',
    category: 'alphabet',
    handsRequired: 'two',
    poseId: 'ISL_ALPHA_Z_TWO_HAND_DYNAMIC',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Two-handed dynamic sign: Left hand holds open palm; Right index traces a "Z" zigzag stroke across it.',
    instructions: [
      'Hold left hand flat with palm facing upward.',
      'Extend right index finger like a pen.',
      'Draw a sharp zigzag "Z" in the air above the left palm.',
    ],
    tips: 'Dynamic movement: watch the right index trace the letter Z.',
    isDynamic: true,
    dynamicPath: 'Z_ZIGZAG',
    camera: { position: [0, 0.035, -0.46], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'two',
      leftHand: {
        transform: { position: [-0.04, -0.02, 0], rotation: [Math.PI / 2, 0, -Math.PI / 4] },
        pose: LEFT_HAND_OPEN_PALM,
      },
      rightHand: {
        transform: { position: [0.03, 0.03, 0.015], rotation: [Math.PI / 2, -0.3, 0] },
        pose: RIGHT_HAND_POINTER,
      },
    },
    pose: RIGHT_HAND_POINTER,
  },
];

export const ISL_NUMBERS_DATA: ISLSignDefinition[] = [
  {
    id: '0',
    label: '0',
    name: 'Number 0',
    category: 'number',
    handsRequired: 'one',
    poseId: 'ISL_NUM_0_ONE_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Single-handed sign: Right hand curves all fingers and thumb to touch tips, forming a zero / oval.',
    instructions: [
      'Curve all four fingers and thumb together.',
      'Touch your fingertips to your thumb tip to form an oval shape.',
      'Face your palm forward toward the camera.',
    ],
    tips: 'Fingers and thumb form an unbroken zero ring.',
    isDynamic: false,
    camera: { position: [-0.18, 0.035, -0.36], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'one',
      rightHand: {
        transform: { position: [0, 0, 0], rotation: [Math.PI / 2, 0.35, 0] },
        pose: {
          index: { mcp: { z: -0.85 }, pip: { z: -0.95 }, dip: { z: -0.75 } },
          middle: { mcp: { z: -0.85 }, pip: { z: -0.95 }, dip: { z: -0.75 } },
          ring: { mcp: { z: -0.85 }, pip: { z: -0.95 }, dip: { z: -0.75 } },
          pinky: { mcp: { z: -0.85 }, pip: { z: -0.95 }, dip: { z: -0.75 } },
          thumb: { cmc: { x: 0.75, z: 0.15 }, mcp: { x: 0.65, z: 0.25 }, ip: { x: 0.45 } },
        },
      },
    },
    pose: {
      index: { mcp: { z: -0.85 }, pip: { z: -0.95 }, dip: { z: -0.75 } },
      middle: { mcp: { z: -0.85 }, pip: { z: -0.95 }, dip: { z: -0.75 } },
      ring: { mcp: { z: -0.85 }, pip: { z: -0.95 }, dip: { z: -0.75 } },
      pinky: { mcp: { z: -0.85 }, pip: { z: -0.95 }, dip: { z: -0.75 } },
      thumb: { cmc: { x: 0.75, z: 0.15 }, mcp: { x: 0.65, z: 0.25 }, ip: { x: 0.45 } },
    },
  },
  {
    id: '1',
    label: '1',
    name: 'Number 1',
    category: 'number',
    handsRequired: 'one',
    poseId: 'ISL_NUM_1_ONE_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Single-handed sign: Dominant right hand index finger pointing straight UP; other fingers and thumb curled into a fist.',
    instructions: [
      'Extend your right index finger straight up.',
      'Curl middle, ring, and pinky fingers tightly into the palm.',
      'Fold your thumb over the curled fingers.',
    ],
    tips: 'The standard single-handed numeral 1 — completely distinct from letter A which requires 2 hands.',
    isDynamic: false,
    camera: { position: [0, 0.035, -0.38], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'one',
      rightHand: {
        transform: { position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: {
          index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          middle: FINGER_CURLED,
          ring: FINGER_CURLED,
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
        },
      },
    },
    pose: {
      index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      middle: FINGER_CURLED,
      ring: FINGER_CURLED,
      pinky: FINGER_CURLED,
      thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
    },
  },
  {
    id: '2',
    label: '2',
    name: 'Number 2',
    category: 'number',
    handsRequired: 'one',
    poseId: 'ISL_NUM_2_ONE_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Single-handed sign: Dominant right hand index and middle fingers pointing straight UP side-by-side.',
    instructions: [
      'Extend index and middle fingers straight up.',
      'Keep them together or slightly relaxed side-by-side.',
      'Curl ring and pinky fingers into palm, holding them down with thumb.',
    ],
    tips: 'Two upright fingers counting numeral 2.',
    isDynamic: false,
    camera: { position: [0, 0.035, -0.38], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'one',
      rightHand: {
        transform: { position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: {
          index: { mcp: { x: -0.08, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          middle: { mcp: { x: 0.08, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          ring: FINGER_CURLED,
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
        },
      },
    },
    pose: {
      index: { mcp: { x: -0.08, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      middle: { mcp: { x: 0.08, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      ring: FINGER_CURLED,
      pinky: FINGER_CURLED,
      thumb: { cmc: { x: 0.75, z: 0.35 }, mcp: { x: 0.55 }, ip: { x: 0.25 } },
    },
  },
  {
    id: '3',
    label: '3',
    name: 'Number 3',
    category: 'number',
    handsRequired: 'one',
    poseId: 'ISL_NUM_3_ONE_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Single-handed sign: Dominant right hand index, middle, and ring fingers extended straight UP.',
    instructions: [
      'Extend index, middle, and ring fingers straight upwards.',
      'Curl pinky finger into the palm.',
      'Fold thumb across the pinky finger.',
    ],
    tips: 'Three fingers held upright for numeral 3.',
    isDynamic: false,
    camera: { position: [0, 0.035, -0.38], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'one',
      rightHand: {
        transform: { position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: {
          index: { mcp: { x: -0.15, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          middle: { mcp: { x: 0, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          ring: { mcp: { x: 0.15, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          pinky: FINGER_CURLED,
          thumb: { cmc: { x: 0.85, z: 0.35 }, mcp: { x: 0.65 }, ip: { x: 0.35 } },
        },
      },
    },
    pose: {
      index: { mcp: { x: -0.15, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      middle: { mcp: { x: 0, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      ring: { mcp: { x: 0.15, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      pinky: FINGER_CURLED,
      thumb: { cmc: { x: 0.85, z: 0.35 }, mcp: { x: 0.65 }, ip: { x: 0.35 } },
    },
  },
  {
    id: '4',
    label: '4',
    name: 'Number 4',
    category: 'number',
    handsRequired: 'one',
    poseId: 'ISL_NUM_4_ONE_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Single-handed sign: Dominant right hand four fingers (index, middle, ring, pinky) extended UP together; thumb folded.',
    instructions: [
      'Extend all four fingers (index, middle, ring, pinky) straight upwards.',
      'Fold your thumb flat across the lower palm.',
    ],
    tips: 'Four fingers upright counting numeral 4.',
    isDynamic: false,
    camera: { position: [0, 0.035, -0.38], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'one',
      rightHand: {
        transform: { position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: {
          index: { mcp: { x: -0.1, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          middle: { mcp: { x: 0, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          ring: { mcp: { x: 0.1, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          pinky: { mcp: { x: 0.2, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          thumb: { cmc: { x: 0.85, z: 0.35 }, mcp: { x: 0.65 }, ip: { x: 0.35 } },
        },
      },
    },
    pose: {
      index: { mcp: { x: -0.1, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      middle: { mcp: { x: 0, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      ring: { mcp: { x: 0.1, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      pinky: { mcp: { x: 0.2, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      thumb: { cmc: { x: 0.85, z: 0.35 }, mcp: { x: 0.65 }, ip: { x: 0.35 } },
    },
  },
  {
    id: '5',
    label: '5',
    name: 'Number 5',
    category: 'number',
    handsRequired: 'one',
    poseId: 'ISL_NUM_5_ONE_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Single-handed sign: Dominant right hand open with all five fingers extended and spread wide.',
    instructions: [
      'Extend all five fingers straight out.',
      'Spread them apart comfortably.',
      'Show your open palm forward toward the camera.',
    ],
    tips: 'Classic open hand counting numeral 5.',
    isDynamic: false,
    camera: { position: [0, 0.035, -0.38], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'one',
      rightHand: {
        transform: { position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: {
          index: { mcp: { x: -0.22, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          middle: { mcp: { x: 0, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          ring: { mcp: { x: 0.2, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          pinky: { mcp: { x: 0.35, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          thumb: { cmc: { x: -0.35, z: -0.55 }, mcp: { x: 0 }, ip: { x: 0 } },
        },
      },
    },
    pose: {
      index: { mcp: { x: -0.22, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      middle: { mcp: { x: 0, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      ring: { mcp: { x: 0.2, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      pinky: { mcp: { x: 0.35, z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      thumb: { cmc: { x: -0.35, z: -0.55 }, mcp: { x: 0 }, ip: { x: 0 } },
    },
  },
  {
    id: '6',
    label: '6',
    name: 'Number 6',
    category: 'number',
    handsRequired: 'one',
    poseId: 'ISL_NUM_6_ONE_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Single-handed sign: Right hand index, middle, and ring extended UP; thumb touches tip of pinky finger.',
    instructions: [
      'Touch the tip of your thumb to the tip of your pinky finger.',
      'Extend index, middle, and ring fingers straight upwards.',
    ],
    tips: 'Thumb and pinky touch to form numeral 6 in ISL.',
    isDynamic: false,
    camera: { position: [0, 0.035, -0.38], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'one',
      rightHand: {
        transform: { position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: {
          index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          middle: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          ring: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          pinky: { mcp: { z: -0.95 }, pip: { z: -1.05 }, dip: { z: -0.85 } },
          thumb: { cmc: { x: 0.85, z: 0.25 }, mcp: { x: 0.65, z: 0.25 }, ip: { x: 0.45 } },
        },
      },
    },
    pose: {
      index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      middle: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      ring: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      pinky: { mcp: { z: -0.95 }, pip: { z: -1.05 }, dip: { z: -0.85 } },
      thumb: { cmc: { x: 0.85, z: 0.25 }, mcp: { x: 0.65, z: 0.25 }, ip: { x: 0.45 } },
    },
  },
  {
    id: '7',
    label: '7',
    name: 'Number 7',
    category: 'number',
    handsRequired: 'one',
    poseId: 'ISL_NUM_7_ONE_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Single-handed sign: Right hand index, middle, and pinky extended UP; thumb touches tip of ring finger.',
    instructions: [
      'Touch the tip of your thumb to the tip of your ring finger.',
      'Extend index, middle, and pinky fingers straight upwards.',
    ],
    tips: 'Thumb and ring finger touch to form numeral 7 in ISL.',
    isDynamic: false,
    camera: { position: [0, 0.035, -0.38], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'one',
      rightHand: {
        transform: { position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: {
          index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          middle: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          ring: { mcp: { z: -0.95 }, pip: { z: -1.05 }, dip: { z: -0.85 } },
          pinky: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          thumb: { cmc: { x: 0.75, z: 0.25 }, mcp: { x: 0.65, z: 0.25 }, ip: { x: 0.45 } },
        },
      },
    },
    pose: {
      index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      middle: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      ring: { mcp: { z: -0.95 }, pip: { z: -1.05 }, dip: { z: -0.85 } },
      pinky: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      thumb: { cmc: { x: 0.75, z: 0.25 }, mcp: { x: 0.65, z: 0.25 }, ip: { x: 0.45 } },
    },
  },
  {
    id: '8',
    label: '8',
    name: 'Number 8',
    category: 'number',
    handsRequired: 'one',
    poseId: 'ISL_NUM_8_ONE_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Single-handed sign: Right hand index, ring, and pinky extended UP; thumb touches tip of middle finger.',
    instructions: [
      'Touch the tip of your thumb to the tip of your middle finger.',
      'Extend index, ring, and pinky fingers straight upwards.',
    ],
    tips: 'Thumb and middle finger touch to form numeral 8 in ISL.',
    isDynamic: false,
    camera: { position: [0, 0.035, -0.38], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'one',
      rightHand: {
        transform: { position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: {
          index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          middle: { mcp: { z: -0.95 }, pip: { z: -1.05 }, dip: { z: -0.85 } },
          ring: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          pinky: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          thumb: { cmc: { x: 0.65, z: 0.25 }, mcp: { x: 0.65, z: 0.25 }, ip: { x: 0.45 } },
        },
      },
    },
    pose: {
      index: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      middle: { mcp: { z: -0.95 }, pip: { z: -1.05 }, dip: { z: -0.85 } },
      ring: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      pinky: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      thumb: { cmc: { x: 0.65, z: 0.25 }, mcp: { x: 0.65, z: 0.25 }, ip: { x: 0.45 } },
    },
  },
  {
    id: '9',
    label: '9',
    name: 'Number 9',
    category: 'number',
    handsRequired: 'one',
    poseId: 'ISL_NUM_9_ONE_HAND',
    referenceSource: ISL_REF,
    verified: true,
    description: 'Single-handed sign: Right hand middle, ring, and pinky extended UP; thumb touches tip of index finger ("OK" sign).',
    instructions: [
      'Touch the tip of your thumb to the tip of your index finger forming an "O".',
      'Extend middle, ring, and pinky fingers straight upwards.',
    ],
    tips: 'Thumb and index touch to form numeral 9 in ISL.',
    isDynamic: false,
    camera: { position: [0, 0.035, -0.38], target: [0, 0.02, 0] },
    fullPose: {
      handsRequired: 'one',
      rightHand: {
        transform: { position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0] },
        pose: {
          index: { mcp: { z: -0.95 }, pip: { z: -1.05 }, dip: { z: -0.85 } },
          middle: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          ring: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          pinky: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
          thumb: { cmc: { x: 0.65, z: 0.25 }, mcp: { x: 0.65, z: 0.25 }, ip: { x: 0.45 } },
        },
      },
    },
    pose: {
      index: { mcp: { z: -0.95 }, pip: { z: -1.05 }, dip: { z: -0.85 } },
      middle: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      ring: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      pinky: { mcp: { z: 0 }, pip: { z: 0 }, dip: { z: 0 } },
      thumb: { cmc: { x: 0.65, z: 0.25 }, mcp: { x: 0.65, z: 0.25 }, ip: { x: 0.45 } },
    },
  },
];

export const ISL_ALL_SIGNS: ISLSignDefinition[] = [
  ...ISL_ALPHABET_DATA,
  ...ISL_NUMBERS_DATA,
];

export function getISLSignById(id: string): ISLSignDefinition | undefined {
  const cleanId = id ? id.toString().toUpperCase() : 'A';
  return ISL_ALL_SIGNS.find(s => s.id === cleanId);
}

export function getAllISLAlphabets(): ISLSignDefinition[] {
  return ISL_ALPHABET_DATA;
}

export function getAllISLNumbers(): ISLSignDefinition[] {
  return ISL_NUMBERS_DATA;
}
