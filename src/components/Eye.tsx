"use client";

import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useGraph } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import { useEyeState } from "@/hooks/useEyeState";

interface EyeProps {
    position: [number, number, number];
}

export default function Eye({ position }: EyeProps) {
    const groupRef = useRef<THREE.Group>(null);
    const eyeRef = useRef<THREE.Group>(null);

    // Load the GLTF model
    // Note: User must convert .blend to .glb and place it at /models/robotic_eye.glb
    const { scene } = useGLTF('/models/robotic_eye.glb');

    // Clone the scene so we can have two independent eyes
    const clone = useMemo(() => scene.clone(), [scene]);
    const { nodes, materials } = useGraph(clone);

    // Load Textures
    const textures = useTexture({
        emission: '/textures/Lights_Emission.png',
    });
    textures.emission.flipY = false;
    textures.emission.colorSpace = THREE.SRGBColorSpace;

    // Apply Materials based on Node Names
    useEffect(() => {
        if (!nodes) return;

        Object.keys(nodes).forEach((key) => {
            const node = nodes[key] as THREE.Mesh;
            if (!node.isMesh) return;

            // 1. Lens (Glass)
            if (key === 'Lens') {
                node.material = new THREE.MeshPhysicalMaterial({
                    color: '#ffffff',
                    roughness: 0.15,
                    transmission: 1,   // Glass-like
                    thickness: 0.5,
                    ior: 1.5,
                    clearcoat: 1,
                    transparent: true,
                    opacity: 1
                });
                node.castShadow = false;
                node.receiveShadow = false;
            }
            // 2. Casing (White Plastic)
            else if (key.includes('Eyeball_Segment_Low_Poly')) {
                node.material = new THREE.MeshStandardMaterial({
                    color: '#f5f5f5',
                    roughness: 0.3,
                    metalness: 0.1,
                });
                node.castShadow = true;
                node.receiveShadow = true;
            }
            // 3. Internal LED Sphere (Emission)
            else if (key.includes('Sphere026')) {
                // Apply emission map logic
                const mat = new THREE.MeshStandardMaterial({
                    color: '#101010', // Dark base
                    metalness: 0.9,
                    roughness: 0.2,
                    emissiveMap: textures.emission,
                    emissive: new THREE.Color(1, 0.2, 0.2), // Red tint by default? Or white? Let's stick to white or slight red.
                    emissiveIntensity: 4
                });
                node.material = mat;
            }
            // 4. Everything else (Internal mechanisms -> Dark Metal)
            else {
                node.material = new THREE.MeshStandardMaterial({
                    color: '#202020',
                    roughness: 0.4,
                    metalness: 0.8,
                });
            }
        });

    }, [nodes, textures.emission]);

    // Current rotation for smoothing
    const currentRotation = useRef(new THREE.Vector2(0, 0));

    // Access global mood state (used for tracking behavior speed etc)
    const { mood, isSleeping } = useEyeState();

    useFrame((state) => {
        if (!groupRef.current) return;

        // --- 1. MOUSE TRACKING ---
        // Convert -1..1 pointer to rotation angles
        const targetX = -state.pointer.y * 1.2;
        const targetY = state.pointer.x * 1.2;

        // Add microsaccades (jitter)
        const time = state.clock.elapsedTime;
        let jitterX = Math.sin(time * 20) * 0.005 + Math.cos(time * 45) * 0.005;
        let jitterY = Math.cos(time * 15) * 0.005 + Math.sin(time * 35) * 0.005;

        // Dizzy Effect
        if (mood === 'dizzy') {
            const swirlSpeed = 10;
            const swirlRadius = 0.1;
            jitterX += Math.sin(time * swirlSpeed) * swirlRadius;
            jitterY += Math.cos(time * swirlSpeed) * swirlRadius;
        }

        // Smooth damping (lerp)
        let finalTargetX = targetX + jitterX;
        let finalTargetY = targetY + jitterY;

        // Cross-eyed override
        if (mood === 'cross') {
            const isLeftEye = position[0] < 0;
            finalTargetY = isLeftEye ? 0.35 : -0.35;
            finalTargetX = 0.0;
        }

        // Faster tracking for "snappier" feel (0.2)
        const trackingSpeed = mood === 'tired' || isSleeping ? 0.03 : 0.2;
        currentRotation.current.x = THREE.MathUtils.lerp(currentRotation.current.x, finalTargetX, trackingSpeed);
        currentRotation.current.y = THREE.MathUtils.lerp(currentRotation.current.y, finalTargetY, trackingSpeed);

        // Apply rotation to the entire group
        groupRef.current.rotation.x = currentRotation.current.x;
        groupRef.current.rotation.y = currentRotation.current.y;
    });

    return (
        <group position={position}>
            <group ref={groupRef}>
                <primitive object={clone} scale={[1, 1, 1]} />
            </group>
        </group>
    );
}

// Preload the model
useGLTF.preload('/models/robotic_eye.glb');
