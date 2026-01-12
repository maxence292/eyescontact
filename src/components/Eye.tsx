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

    // Log nodes to help identify parts (for debugging purposes)
    useEffect(() => {
        console.log("Loaded GLTF Nodes:", nodes);
        console.log("Loaded GLTF Materials:", materials);

        // Auto-apply emission texture if we find a matching material or just apply to everything for now to test
        scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                if (mesh.material) {
                    // Try to enhance materials
                    // Cast to StandardMaterial to check properties safely
                    const mat = mesh.material as THREE.MeshStandardMaterial;
                    if (mat.emissive !== undefined) {
                        mat.emissiveMap = textures.emission;
                        mat.emissive = new THREE.Color(1, 1, 1);
                        mat.emissiveIntensity = 2;
                        mat.needsUpdate = true;
                    }
                }
            }
        });
    }, [nodes, materials, scene, textures.emission]);

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
