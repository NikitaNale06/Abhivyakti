import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, StyleProp, ViewStyle, Pressable } from 'react-native';
import type { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { HAND_MODEL_GLB_BASE64, THREE_VIEWER_BUNDLE } from '@/assets/3d/handModelBundle';
import { HandPoseDefinition } from '@/services/handBoneMapper';
import { ISLSignPose, HandCount, ISLCameraPreset } from '@/services/islAlphabetPoses';
import { useTheme } from '@/context/ThemeContext';

let WebViewComponent: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WebViewComponent = require('react-native-webview').WebView;
} catch (e: any) {
  console.warn('[RealisticHandViewer] react-native-webview native module not available:', e?.message ?? e);
}

export interface RealisticHandViewerRef {
  resetCamera: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleAutoRotate: () => void;
}

interface Props {
  pose?: HandPoseDefinition; // backwards compatible
  fullPose?: ISLSignPose;
  camera?: ISLCameraPreset;
  handsRequired?: HandCount;
  isDynamic?: boolean;
  dynamicPath?: 'J_SWOOP' | 'Z_ZIGZAG';
  signLabel?: string;
  onModelLoaded?: (bonesCount: number) => void;
  onError?: (err: string) => void;
  style?: StyleProp<ViewStyle>;
  showControls?: boolean;
}

const HTML_SOURCE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background-color: #0F172A; }
    #canvas-container { width: 100%; height: 100%; touch-action: none; }
    #overlay-hint {
      position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.78); color: #94A3B8; font-family: -apple-system, sans-serif;
      font-size: 11px; padding: 4px 10px; border-radius: 12px; pointer-events: none;
      backdrop-filter: blur(4px); white-space: nowrap; border: 1px solid rgba(255, 255, 255, 0.08);
      transition: opacity 0.3s;
    }
  </style>
</head>
<body>
  <div id="canvas-container"></div>
  <div id="overlay-hint">360° Rotate • Pinch Zoom</div>
  <script>
${THREE_VIEWER_BUNDLE}
  </script>
  <script>
(function() {
  var container = document.getElementById('canvas-container');
  var hint = document.getElementById('overlay-hint');
  var glbBase64 = ${JSON.stringify(HAND_MODEL_GLB_BASE64)};

  var scene = new window.THREE.Scene();
  scene.background = new window.THREE.Color('#0F172A');

  // Camera placed facing upright hands (palm & fingers facing user)
  var camera = new window.THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.05, 10);
  camera.position.set(0, 0.04, -0.42);

  var renderer = new window.THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = window.THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  var controls = new window.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 0.18;
  controls.maxDistance = 0.75;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 1.5;
  controls.target.set(0, 0.02, 0);

  // Realistic Studio Lighting
  var ambient = new window.THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambient);

  // Key light illuminating hands from top-front
  var keyLight = new window.THREE.DirectionalLight(0xfff5ea, 1.4);
  keyLight.position.set(1.5, 3.0, -2.5);
  scene.add(keyLight);

  // Cool fill light from front-left
  var fillLight = new window.THREE.DirectionalLight(0xdce7ff, 0.75);
  fillLight.position.set(-1.5, 1.2, -2.0);
  scene.add(fillLight);

  // Rim light from back-top for crisp 3D edge separation
  var rimLight = new window.THREE.DirectionalLight(0xfef3c7, 1.1);
  rimLight.position.set(0, 2.5, 2.5);
  scene.add(rimLight);

  // Groups for Right Hand and Mirrored Left Hand
  var rightPivot = new window.THREE.Group();
  rightPivot.rotation.x = Math.PI / 2;
  scene.add(rightPivot);

  var leftPivot = new window.THREE.Group();
  leftPivot.rotation.x = Math.PI / 2;
  leftPivot.visible = false;
  scene.add(leftPivot);

  // Bone states
  var bonesR = {};
  var restQuatsR = {};
  var targetQuatsR = {};

  var bonesL = {};
  var restQuatsL = {};
  var targetQuatsL = {};

  var isModelLoaded = false;
  var currentDynamicPath = null;
  var isDynamic = false;
  var currentHandsRequired = 'one';
  var currentCameraPreset = { position: [0, 0.035, -0.42], target: [0, 0.02, 0] };
  var queuedPose = null;

  // Smooth transform targets
  var targetPosR = new window.THREE.Vector3(0, 0, 0);
  var targetRotR = new window.THREE.Euler(Math.PI / 2, 0, 0);
  var targetPosL = new window.THREE.Vector3(-0.06, 0, 0);
  var targetRotL = new window.THREE.Euler(Math.PI / 2, 0, 0);

  function base64ToArrayBuffer(base64) {
    var binaryString = window.atob(base64);
    var len = binaryString.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  function notifyNative(data) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    } catch (e) {
      console.error(e);
    }
  }

  try {
    var arrayBuffer = base64ToArrayBuffer(glbBase64);
    var loader = new window.GLTFLoader();

    // 1. Load Right Hand
    loader.parse(arrayBuffer.slice(0), '', function(gltfR) {
      var modelR = gltfR.scene;

      var boxR = new window.THREE.Box3().setFromObject(modelR);
      var centerR = boxR.getCenter(new window.THREE.Vector3());
      modelR.position.x = -centerR.x;
      modelR.position.y = -centerR.y;
      modelR.position.z = -centerR.z;

      var countR = 0;
      modelR.traverse(function(obj) {
        if (obj.isBone) {
          bonesR[obj.name] = obj;
          restQuatsR[obj.name] = obj.quaternion.clone();
          targetQuatsR[obj.name] = obj.quaternion.clone();
          countR++;
        }
      });
      rightPivot.add(modelR);

      // 2. Load Left Hand (mirrored via scale.x = -1)
      loader.parse(arrayBuffer.slice(0), '', function(gltfL) {
        var modelL = gltfL.scene;
        modelL.scale.x = -1;

        modelL.traverse(function(obj) {
          if (obj.isMesh) {
            obj.material = obj.material.clone();
            obj.material.side = window.THREE.DoubleSide;
          }
          if (obj.isBone) {
            bonesL[obj.name] = obj;
            restQuatsL[obj.name] = obj.quaternion.clone();
            targetQuatsL[obj.name] = obj.quaternion.clone();
          }
        });

        modelL.position.x = centerR.x; // mirrored offset
        modelL.position.y = -centerR.y;
        modelL.position.z = -centerR.z;

        leftPivot.add(modelL);
        isModelLoaded = true;

        if (queuedPose) {
          applyFullPose(queuedPose.fullPose, queuedPose.pose, queuedPose.isDynamic, queuedPose.dynamicPath);
          applyCameraPreset(queuedPose.camera);
          queuedPose = null;
        }

        notifyNative({ type: 'MODEL_LOADED', bonesCount: countR * 2 });
      });
    }, function(err) {
      notifyNative({ type: 'ERROR', message: 'Failed to parse 3D GLB: ' + (err.message || err) });
    });
  } catch (err) {
    notifyNative({ type: 'ERROR', message: 'GLB decode error: ' + (err.message || err) });
  }

  function applyFingerBone(bonesMap, restMap, targetMap, boneName, rot) {
    var bone = bonesMap[boneName];
    var restQ = restMap[boneName];
    if (!bone || !restQ) return;

    if (!rot) {
      targetMap[boneName] = restQ.clone();
      return;
    }

    var euler = new window.THREE.Euler(rot.x || 0, rot.y || 0, rot.z || 0, 'XYZ');
    var relQ = new window.THREE.Quaternion().setFromEuler(euler);
    targetMap[boneName] = restQ.clone().multiply(relQ);
  }

  function applyHandKinematics(bonesMap, restMap, targetMap, pose) {
    if (!pose) {
      Object.keys(bonesMap).forEach(function(name) {
        targetMap[name] = restMap[name].clone();
      });
      return;
    }

    applyFingerBone(bonesMap, restMap, targetMap, 'hand_r', pose.wrist);

    applyFingerBone(bonesMap, restMap, targetMap, 'thumb_01_r', pose.thumb && pose.thumb.cmc);
    applyFingerBone(bonesMap, restMap, targetMap, 'thumb_02_r', pose.thumb && pose.thumb.mcp);
    applyFingerBone(bonesMap, restMap, targetMap, 'thumb_03_r', pose.thumb && pose.thumb.ip);

    applyFingerBone(bonesMap, restMap, targetMap, 'index_01_r', pose.index && pose.index.mcp);
    applyFingerBone(bonesMap, restMap, targetMap, 'index_02_r', pose.index && pose.index.pip);
    applyFingerBone(bonesMap, restMap, targetMap, 'index_03_r', pose.index && pose.index.dip);

    applyFingerBone(bonesMap, restMap, targetMap, 'middle_01_r', pose.middle && pose.middle.mcp);
    applyFingerBone(bonesMap, restMap, targetMap, 'middle_02_r', pose.middle && pose.middle.pip);
    applyFingerBone(bonesMap, restMap, targetMap, 'middle_03_r', pose.middle && pose.middle.dip);

    applyFingerBone(bonesMap, restMap, targetMap, 'ring_01_r', pose.ring && pose.ring.mcp);
    applyFingerBone(bonesMap, restMap, targetMap, 'ring_02_r', pose.ring && pose.ring.pip);
    applyFingerBone(bonesMap, restMap, targetMap, 'ring_03_r', pose.ring && pose.ring.dip);

    applyFingerBone(bonesMap, restMap, targetMap, 'pinky_01_r', pose.pinky && pose.pinky.mcp);
    applyFingerBone(bonesMap, restMap, targetMap, 'pinky_02_r', pose.pinky && pose.pinky.pip);
    applyFingerBone(bonesMap, restMap, targetMap, 'pinky_03_r', pose.pinky && pose.pinky.dip);
  }

  function applyFullPose(fullPose, fallbackPose, dynamicFlag, path) {
    isDynamic = !!dynamicFlag;
    currentDynamicPath = path || null;

    // Clean reset: explicitly reset all target bone quaternions to resting state
    Object.keys(bonesR).forEach(function(name) {
      targetQuatsR[name] = restQuatsR[name].clone();
    });
    Object.keys(bonesL).forEach(function(name) {
      targetQuatsL[name] = restQuatsL[name].clone();
    });

    if (fullPose) {
      currentHandsRequired = fullPose.handsRequired || 'one';

      // Right Hand
      var rConfig = fullPose.rightHand;
      if (rConfig) {
        if (rConfig.transform && rConfig.transform.position) {
          targetPosR.set(rConfig.transform.position[0], rConfig.transform.position[1], rConfig.transform.position[2]);
        } else {
          targetPosR.set(currentHandsRequired === 'two' ? 0.045 : 0, 0, 0);
        }
        if (rConfig.transform && rConfig.transform.rotation) {
          targetRotR.set(rConfig.transform.rotation[0], rConfig.transform.rotation[1], rConfig.transform.rotation[2]);
        } else {
          targetRotR.set(Math.PI / 2, 0, 0);
        }
        applyHandKinematics(bonesR, restQuatsR, targetQuatsR, rConfig.pose);
      }

      // Left Hand
      if (currentHandsRequired === 'two') {
        leftPivot.visible = true;
        var lConfig = fullPose.leftHand;
        if (lConfig) {
          if (lConfig.transform && lConfig.transform.position) {
            targetPosL.set(lConfig.transform.position[0], lConfig.transform.position[1], lConfig.transform.position[2]);
          } else {
            targetPosL.set(-0.045, 0, 0);
          }
          if (lConfig.transform && lConfig.transform.rotation) {
            targetRotL.set(lConfig.transform.rotation[0], lConfig.transform.rotation[1], lConfig.transform.rotation[2]);
          } else {
            targetRotL.set(Math.PI / 2, 0, 0);
          }
          applyHandKinematics(bonesL, restQuatsL, targetQuatsL, lConfig.pose);
        }
      } else {
        leftPivot.visible = false;
        targetPosR.set(0, 0, 0);
        targetRotR.set(Math.PI / 2, 0, 0);
        Object.keys(bonesL).forEach(function(name) {
          if (bonesL[name]) bonesL[name].quaternion.copy(restQuatsL[name]);
        });
      }
    } else if (fallbackPose) {
      currentHandsRequired = 'one';
      leftPivot.visible = false;
      targetPosR.set(0, 0, 0);
      targetRotR.set(Math.PI / 2, 0, 0);
      applyHandKinematics(bonesR, restQuatsR, targetQuatsR, fallbackPose);
    }

    // Instantly snap to clean target transforms to ensure no lag or stale transform bleed
    rightPivot.position.copy(targetPosR);
    rightPivot.rotation.copy(targetRotR);
    if (leftPivot.visible) {
      leftPivot.position.copy(targetPosL);
      leftPivot.rotation.copy(targetRotL);
    }
    Object.keys(bonesR).forEach(function(name) {
      if (bonesR[name]) bonesR[name].quaternion.copy(targetQuatsR[name]);
    });
    if (leftPivot.visible) {
      Object.keys(bonesL).forEach(function(name) {
        if (bonesL[name]) bonesL[name].quaternion.copy(targetQuatsL[name]);
      });
    }
  }

  function applyCameraPreset(cam) {
    if (cam && cam.position) {
      currentCameraPreset = cam;
      camera.position.set(cam.position[0], cam.position[1], cam.position[2]);
      if (cam.target) {
        controls.target.set(cam.target[0], cam.target[1], cam.target[2]);
      } else {
        controls.target.set(0, 0.02, 0);
      }
    } else {
      var dist = currentHandsRequired === 'two' ? -0.46 : -0.38;
      currentCameraPreset = { position: [0, 0.035, dist], target: [0, 0.02, 0] };
      camera.position.set(0, 0.035, dist);
      controls.target.set(0, 0.02, 0);
    }
    controls.update();
  }

  function handleMessage(e) {
    try {
      var msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      if (msg.type === 'SET_POSE') {
        if (!isModelLoaded) {
          queuedPose = msg;
          return;
        }
        applyFullPose(msg.fullPose, msg.pose, msg.isDynamic, msg.dynamicPath);
        applyCameraPreset(msg.camera);
      } else if (msg.type === 'RESET_CAMERA') {
        applyCameraPreset(currentCameraPreset);
      } else if (msg.type === 'ZOOM_IN') {
        camera.position.multiplyScalar(0.85);
        controls.update();
      } else if (msg.type === 'ZOOM_OUT') {
        camera.position.multiplyScalar(1.15);
        controls.update();
      } else if (msg.type === 'TOGGLE_AUTO_ROTATE') {
        controls.autoRotate = !controls.autoRotate;
      }
    } catch (err) {
      console.error(err);
    }
  }

  window.addEventListener('message', handleMessage);
  document.addEventListener('message', handleMessage);

  window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Render Loop
  var clock = new window.THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    var delta = clock.getDelta();

    if (isModelLoaded) {
      var lerpSpeed = Math.min(delta * 14, 1.0);

      // Smooth hand position & rotation interpolation
      rightPivot.position.lerp(targetPosR, lerpSpeed);
      rightPivot.rotation.x += (targetRotR.x - rightPivot.rotation.x) * lerpSpeed;
      rightPivot.rotation.y += (targetRotR.y - rightPivot.rotation.y) * lerpSpeed;
      rightPivot.rotation.z += (targetRotR.z - rightPivot.rotation.z) * lerpSpeed;

      if (leftPivot.visible) {
        leftPivot.position.lerp(targetPosL, lerpSpeed);
        leftPivot.rotation.x += (targetRotL.x - leftPivot.rotation.x) * lerpSpeed;
        leftPivot.rotation.y += (targetRotL.y - leftPivot.rotation.y) * lerpSpeed;
        leftPivot.rotation.z += (targetRotL.z - leftPivot.rotation.z) * lerpSpeed;
      }

      // Slerp bone rotations smoothly to target pose
      Object.keys(bonesR).forEach(function(name) {
        var bone = bonesR[name];
        var targetQ = targetQuatsR[name];
        if (bone && targetQ) {
          bone.quaternion.slerp(targetQ, lerpSpeed);
        }
      });

      if (leftPivot.visible) {
        Object.keys(bonesL).forEach(function(name) {
          var bone = bonesL[name];
          var targetQ = targetQuatsL[name];
          if (bone && targetQ) {
            bone.quaternion.slerp(targetQ, lerpSpeed);
          }
        });
      }

      // Dynamic animations
      if (isDynamic && currentDynamicPath === 'J_SWOOP') {
        var t = (Date.now() % 2200) / 2200;
        var angle = t * Math.PI * 1.5;
        rightPivot.position.x = targetPosR.x - Math.sin(angle) * 0.025;
        rightPivot.position.y = targetPosR.y - Math.cos(angle) * 0.025;
      } else if (isDynamic && currentDynamicPath === 'Z_ZIGZAG') {
        var t = (Date.now() % 2500) / 2500;
        if (t < 0.33) {
          rightPivot.position.x = targetPosR.x + (t / 0.33 - 0.5) * 0.04;
          rightPivot.position.y = targetPosR.y + 0.02;
        } else if (t < 0.66) {
          var p = (t - 0.33) / 0.33;
          rightPivot.position.x = targetPosR.x + (0.5 - p) * 0.04;
          rightPivot.position.y = targetPosR.y + 0.02 - p * 0.04;
        } else {
          var p = (t - 0.66) / 0.34;
          rightPivot.position.x = targetPosR.x + (p - 0.5) * 0.04;
          rightPivot.position.y = targetPosR.y - 0.02;
        }
      }
    }

    controls.update();
    renderer.render(scene, camera);
  }

  animate();
})();
  </script>
</body>
</html>`;

export const RealisticHandViewer = forwardRef<RealisticHandViewerRef, Props>(
  ({ pose, fullPose, camera, handsRequired, isDynamic, dynamicPath, signLabel, onModelLoaded, onError, style, showControls = true }, ref) => {
    const { colors } = useTheme();
    const webViewRef = useRef<WebView>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [autoRotate, setAutoRotate] = useState(false);

    const actualHandsRequired = fullPose ? fullPose.handsRequired : (handsRequired || 'one');

    useImperativeHandle(ref, () => ({
      resetCamera: () => {
        webViewRef.current?.postMessage(JSON.stringify({ type: 'RESET_CAMERA' }));
      },
      zoomIn: () => {
        webViewRef.current?.postMessage(JSON.stringify({ type: 'ZOOM_IN' }));
      },
      zoomOut: () => {
        webViewRef.current?.postMessage(JSON.stringify({ type: 'ZOOM_OUT' }));
      },
      toggleAutoRotate: () => {
        setAutoRotate(prev => !prev);
        webViewRef.current?.postMessage(JSON.stringify({ type: 'TOGGLE_AUTO_ROTATE' }));
      },
    }));

    // Send pose whenever it changes
    useEffect(() => {
      if (isLoaded) {
        webViewRef.current?.postMessage(
          JSON.stringify({
            type: 'SET_POSE',
            fullPose,
            pose: pose || (fullPose && fullPose.rightHand.pose),
            camera,
            isDynamic: !!isDynamic,
            dynamicPath,
          })
        );
      }
    }, [fullPose, pose, camera, isDynamic, dynamicPath, isLoaded]);

    const handleMessage = (event: any) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'MODEL_LOADED') {
          setIsLoaded(true);
          onModelLoaded?.(msg.bonesCount);
          webViewRef.current?.postMessage(
            JSON.stringify({
              type: 'SET_POSE',
              fullPose,
              pose: pose || (fullPose && fullPose.rightHand.pose),
              camera,
              isDynamic: !!isDynamic,
              dynamicPath,
            })
          );
        } else if (msg.type === 'ERROR') {
          onError?.(msg.message);
        }
      } catch (e) {
        console.warn('Failed to parse WebView message:', e);
      }
    };

    if (!WebViewComponent) {
      return (
        <View style={[styles.container, style, { justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0F172A' }]}>
          <Ionicons name="cube-outline" size={48} color={colors.primary} />
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 12, textAlign: 'center' }}>
            Interactive 3D Sign Studio
          </Text>
          <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 6, textAlign: 'center' }}>
            Requires native build with WebView support.{'\n'}Run `npx expo run:android` to enable.
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.container, style]}>
        <WebViewComponent
          ref={webViewRef}
          source={{ html: HTML_SOURCE }}
          style={styles.webView}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={handleMessage}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
        />

        {/* Loading Overlay */}
        {!isLoaded && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Initializing 3D Hand Model...</Text>
          </View>
        )}

        {/* Floating Controls */}
        {showControls && isLoaded && (
          <View style={styles.floatingControls}>
            <Pressable
              style={styles.controlBtn}
              onPress={() => webViewRef.current?.postMessage(JSON.stringify({ type: 'RESET_CAMERA' }))}
              accessibilityLabel="Reset 3D view"
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
            </Pressable>
            <Pressable
              style={styles.controlBtn}
              onPress={() => webViewRef.current?.postMessage(JSON.stringify({ type: 'ZOOM_IN' }))}
              accessibilityLabel="Zoom in"
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
            </Pressable>
            <Pressable
              style={styles.controlBtn}
              onPress={() => webViewRef.current?.postMessage(JSON.stringify({ type: 'ZOOM_OUT' }))}
              accessibilityLabel="Zoom out"
            >
              <Ionicons name="remove" size={18} color="#FFFFFF" />
            </Pressable>
            <Pressable
              style={[styles.controlBtn, autoRotate && styles.controlBtnActive]}
              onPress={() => {
                setAutoRotate(!autoRotate);
                webViewRef.current?.postMessage(JSON.stringify({ type: 'TOGGLE_AUTO_ROTATE' }));
              }}
              accessibilityLabel="Toggle auto-rotate"
            >
              <Ionicons name="sync" size={18} color={autoRotate ? '#F45B16' : '#FFFFFF'} />
            </Pressable>
          </View>
        )}

        {/* Hands Count Badge */}
        {isLoaded && (
          <View style={styles.handsCountBadge}>
            <Ionicons
              name={actualHandsRequired === 'two' ? 'people' : 'hand-right'}
              size={13}
              color="#FFFFFF"
            />
            <Text style={styles.handsCountText}>
              {actualHandsRequired === 'two' ? '2-Hand Sign' : '1-Hand Sign'}
            </Text>
          </View>
        )}

        {/* Dynamic Sign Badge */}
        {isDynamic && isLoaded && (
          <View style={styles.dynamicBadge}>
            <Ionicons name="pulse" size={13} color="#F45B16" />
            <Text style={styles.dynamicBadgeText}>Motion Sign</Text>
          </View>
        )}
      </View>
    );
  }
);

export default RealisticHandViewer;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingOverlay: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 10,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  floatingControls: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'column',
    gap: 8,
    zIndex: 20,
  },
  controlBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  controlBtnActive: {
    backgroundColor: 'rgba(244, 91, 22, 0.25)',
    borderColor: '#F45B16',
  },
  handsCountBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 20,
  },
  handsCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dynamicBadge: {
    position: 'absolute',
    top: 48,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(244, 91, 22, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(244, 91, 22, 0.35)',
    zIndex: 20,
  },
  dynamicBadgeText: {
    color: '#F45B16',
    fontSize: 11,
    fontWeight: '700',
  },
});
