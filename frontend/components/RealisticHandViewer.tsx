import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, StyleProp, ViewStyle, Pressable } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { HAND_MODEL_GLB_BASE64, THREE_VIEWER_BUNDLE } from '@/assets/3d/handModelBundle';
import { HandPoseDefinition } from '@/services/handBoneMapper';
import { useTheme } from '@/context/ThemeContext';

export interface RealisticHandViewerRef {
  resetCamera: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleAutoRotate: () => void;
}

interface Props {
  pose?: HandPoseDefinition;
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

  var camera = new window.THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.05, 10);
  camera.position.set(0, 0.02, 0.42);

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
  controls.minDistance = 0.15;
  controls.maxDistance = 0.75;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 1.5;
  controls.target.set(0, 0, 0);

  // Studio Lighting
  var ambient = new window.THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambient);

  var keyLight = new window.THREE.DirectionalLight(0xfff3e0, 1.5);
  keyLight.position.set(2, 4, 3);
  scene.add(keyLight);

  var fillLight = new window.THREE.DirectionalLight(0x93c5fd, 0.8);
  fillLight.position.set(-2, 1, 2);
  scene.add(fillLight);

  var rimLight = new window.THREE.DirectionalLight(0xfef3c7, 1.2);
  rimLight.position.set(0, 3, -3);
  scene.add(rimLight);

  // Group to center and animate hand
  var handPivot = new window.THREE.Group();
  scene.add(handPivot);

  // Model & Bone State
  var bones = {};
  var restQuats = {};
  var targetQuats = {};
  var isModelLoaded = false;
  var currentDynamicPath = null;
  var isDynamic = false;

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
    loader.parse(arrayBuffer, '', function(gltf) {
      var model = gltf.scene;

      // Find bones
      var count = 0;
      model.traverse(function(obj) {
        if (obj.isBone) {
          bones[obj.name] = obj;
          restQuats[obj.name] = obj.quaternion.clone();
          targetQuats[obj.name] = obj.quaternion.clone();
          count++;
        }
      });

      // Calculate bounding box and center hand at (0,0,0)
      var box = new window.THREE.Box3().setFromObject(model);
      var center = box.getCenter(new window.THREE.Vector3());
      model.position.x = -center.x;
      model.position.y = -center.y;
      model.position.z = -center.z;

      handPivot.add(model);
      isModelLoaded = true;

      notifyNative({ type: 'MODEL_LOADED', bonesCount: count });
    }, function(err) {
      notifyNative({ type: 'ERROR', message: 'Failed to parse 3D GLB: ' + (err.message || err) });
    });
  } catch (err) {
    notifyNative({ type: 'ERROR', message: 'GLB decode error: ' + (err.message || err) });
  }

  function applyBonePose(boneName, rot) {
    var bone = bones[boneName];
    var restQ = restQuats[boneName];
    if (!bone || !restQ) return;

    if (!rot) {
      targetQuats[boneName] = restQ.clone();
      return;
    }

    var euler = new window.THREE.Euler(rot.x || 0, rot.y || 0, rot.z || 0, 'XYZ');
    var relQ = new window.THREE.Quaternion().setFromEuler(euler);
    targetQuats[boneName] = restQ.clone().multiply(relQ);
  }

  function applyFullPose(pose, dynamicFlag, path) {
    isDynamic = !!dynamicFlag;
    currentDynamicPath = path || null;

    if (!pose) {
      Object.keys(bones).forEach(function(name) {
        targetQuats[name] = restQuats[name].clone();
      });
      return;
    }

    // Wrist
    applyBonePose('hand_r', pose.wrist);

    // Thumb
    applyBonePose('thumb_01_r', pose.thumb && pose.thumb.cmc);
    applyBonePose('thumb_02_r', pose.thumb && pose.thumb.mcp);
    applyBonePose('thumb_03_r', pose.thumb && pose.thumb.ip);

    // Index
    applyBonePose('index_01_r', pose.index && pose.index.mcp);
    applyBonePose('index_02_r', pose.index && pose.index.pip);
    applyBonePose('index_03_r', pose.index && pose.index.dip);

    // Middle
    applyBonePose('middle_01_r', pose.middle && pose.middle.mcp);
    applyBonePose('middle_02_r', pose.middle && pose.middle.pip);
    applyBonePose('middle_03_r', pose.middle && pose.middle.dip);

    // Ring
    applyBonePose('ring_01_r', pose.ring && pose.ring.mcp);
    applyBonePose('ring_02_r', pose.ring && pose.ring.pip);
    applyBonePose('ring_03_r', pose.ring && pose.ring.dip);

    // Pinky
    applyBonePose('pinky_01_r', pose.pinky && pose.pinky.mcp);
    applyBonePose('pinky_02_r', pose.pinky && pose.pinky.pip);
    applyBonePose('pinky_03_r', pose.pinky && pose.pinky.dip);
  }

  function handleMessage(e) {
    try {
      var msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      if (msg.type === 'SET_POSE') {
        applyFullPose(msg.pose, msg.isDynamic, msg.dynamicPath);
      } else if (msg.type === 'RESET_CAMERA') {
        camera.position.set(0, 0.02, 0.42);
        controls.target.set(0, 0, 0);
        controls.update();
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

  // Resize handler
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

    // Slerp bone rotations smoothly to target pose
    if (isModelLoaded) {
      var lerpSpeed = Math.min(delta * 12, 1.0);
      Object.keys(bones).forEach(function(name) {
        var bone = bones[name];
        var targetQ = targetQuats[name];
        if (bone && targetQ) {
          bone.quaternion.slerp(targetQ, lerpSpeed);
        }
      });

      // Handle Dynamic Animations
      if (isDynamic && currentDynamicPath === 'J_SWOOP') {
        var t = (Date.now() % 2200) / 2200;
        var angle = t * Math.PI * 1.5;
        handPivot.position.x = -Math.sin(angle) * 0.035;
        handPivot.position.y = -Math.cos(angle) * 0.025;
      } else if (isDynamic && currentDynamicPath === 'Z_ZIGZAG') {
        var t = (Date.now() % 2500) / 2500;
        if (t < 0.33) {
          handPivot.position.x = (t / 0.33 - 0.5) * 0.05;
          handPivot.position.y = 0.02;
        } else if (t < 0.66) {
          var p = (t - 0.33) / 0.33;
          handPivot.position.x = (0.5 - p) * 0.05;
          handPivot.position.y = 0.02 - p * 0.04;
        } else {
          var p = (t - 0.66) / 0.34;
          handPivot.position.x = (p - 0.5) * 0.05;
          handPivot.position.y = -0.02;
        }
      } else {
        handPivot.position.set(0, 0, 0);
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
  ({ pose, isDynamic, dynamicPath, signLabel, onModelLoaded, onError, style, showControls = true }, ref) => {
    const { colors } = useTheme();
    const webViewRef = useRef<WebView>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [autoRotate, setAutoRotate] = useState(false);

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
            pose,
            isDynamic: !!isDynamic,
            dynamicPath,
          })
        );
      }
    }, [pose, isDynamic, dynamicPath, isLoaded]);

    const handleMessage = (event: any) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'MODEL_LOADED') {
          setIsLoaded(true);
          onModelLoaded?.(msg.bonesCount);
          // Apply initial pose once loaded
          if (pose) {
            webViewRef.current?.postMessage(
              JSON.stringify({
                type: 'SET_POSE',
                pose,
                isDynamic: !!isDynamic,
                dynamicPath,
              })
            );
          }
        } else if (msg.type === 'ERROR') {
          onError?.(msg.message);
        }
      } catch (e) {
        console.warn('Failed to parse WebView message:', e);
      }
    };

    return (
      <View style={[styles.container, style]}>
        <WebView
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
            <Text style={styles.loadingText}>Loading 3D Hand Model...</Text>
          </View>
        )}

        {/* On-Screen Camera Controls */}
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

        {/* Dynamic Sign Badge */}
        {isDynamic && isLoaded && (
          <View style={styles.dynamicBadge}>
            <Ionicons name="pulse" size={14} color="#F45B16" />
            <Text style={styles.dynamicBadgeText}>Dynamic Sign (Motion)</Text>
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
  dynamicBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(244, 91, 22, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(244, 91, 22, 0.35)',
    zIndex: 20,
  },
  dynamicBadgeText: {
    color: '#F45B16',
    fontSize: 12,
    fontWeight: '700',
  },
});
