"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useEyeState } from "@/hooks/useEyeState";

interface EyeProps {
    position: [number, number, number];
}

export default function Eye({ position }: EyeProps) {
    const eyeRef = useRef<THREE.Group>(null);
    const eyeballRef = useRef<THREE.Group>(null);
    const topLidRef = useRef<THREE.Mesh>(null);
    const bottomLidRef = useRef<THREE.Mesh>(null);

    // State for animation
    const blinkState = useRef({ isBlinking: false, startTime: 0, duration: 0.1 });
    const nextBlink = useRef(Date.now() + Math.random() * 3000 + 2000);

    // Current rotation for smoothing
    const currentRotation = useRef(new THREE.Vector2(0, 0));

    // Access global mood state
    const { mood, isSleeping } = useEyeState();
    const pupilRef = useRef<THREE.Mesh>(null);
    const irisRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (!eyeballRef.current || !topLidRef.current || !bottomLidRef.current || !pupilRef.current || !irisRef.current) return;

        // --- 1. MOUSE TRACKING & PHYSICS ---
        // Convert -1..1 pointer to rotation angles
        // Increased sensitivity (1.5 factor) so eyes really follow the cursor to edges
        const targetX = -state.pointer.y * 1.2;
        const targetY = state.pointer.x * 1.2;

        // Add microsaccades (jitter)
        const time = state.clock.elapsedTime;
        let jitterX = Math.sin(time * 20) * 0.005 + Math.cos(time * 45) * 0.005;
        let jitterY = Math.cos(time * 15) * 0.005 + Math.sin(time * 35) * 0.005;

        // Dizzy Effect: Add swirling motion to the tracking or iris
        if (mood === 'dizzy') {
            const swirlSpeed = 10;
            const swirlRadius = 0.1;
            jitterX += Math.sin(time * swirlSpeed) * swirlRadius;
            jitterY += Math.cos(time * swirlSpeed) * swirlRadius;
            // Rotate iris
            irisRef.current.rotation.z = -time * 5;
        } else {
            // Reset iris rotation
            irisRef.current.rotation.z = THREE.MathUtils.lerp(irisRef.current.rotation.z, 0, 0.1);
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

        eyeballRef.current.rotation.x = currentRotation.current.x;
        eyeballRef.current.rotation.y = currentRotation.current.y;

        // --- 2. BLINKING MECHANIC ---
        const now = Date.now();

        // Modulate blink frequency by mood
        let blinkInterval = 3000;
        if (mood === 'suspicious') blinkInterval = 4000;
        if (mood === 'surprised') blinkInterval = 5000;
        if (mood === 'tired') blinkInterval = 1000;

        if (now > nextBlink.current && !blinkState.current.isBlinking) {
            blinkState.current.isBlinking = true;
            blinkState.current.startTime = now;
            blinkState.current.duration = 0.12 + Math.random() * 0.05;
            if (mood === 'tired') blinkState.current.duration = 0.4;

            nextBlink.current = now + Math.random() * blinkInterval + 1000;
        }

        // Determine target lid angles
        let openAngleTop = -Math.PI / 2.6; // Slightly more open
        let openAngleBot = Math.PI / 2.6;

        if (mood === 'suspicious') {
            openAngleTop = -Math.PI / 3.5;
            openAngleBot = Math.PI / 3.5;
        } else if (mood === 'surprised') {
            openAngleTop = -Math.PI / 2.1;
            openAngleBot = Math.PI / 2.1;
        } else if (mood === 'tired' || isSleeping) {
            openAngleTop = -Math.PI / 4;
            openAngleBot = Math.PI / 2.5;
            if (isSleeping) {
                openAngleTop = 0;
                openAngleBot = 0;
            }
        }

        // Calculate current lid rotation
        let currentTop = openAngleTop;
        let currentBot = openAngleBot;

        if (blinkState.current.isBlinking) {
            const elapsed = (now - blinkState.current.startTime) / 1000;
            const duration = blinkState.current.duration;
            let progress = 0;

            if (elapsed < duration / 2) {
                progress = elapsed / (duration / 2);
            } else if (elapsed < duration) {
                progress = 1 - (elapsed - duration / 2) / (duration / 2);
            } else {
                blinkState.current.isBlinking = false;
                progress = 0;
            }

            const eased = 1 - (1 - progress) * (1 - progress);
            const maxCloseAngle = 0;

            currentTop = THREE.MathUtils.lerp(openAngleTop, maxCloseAngle, eased);
            currentBot = THREE.MathUtils.lerp(openAngleBot, -maxCloseAngle, eased);
        } else {
            // Smooth transition
            topLidRef.current.rotation.x = THREE.MathUtils.lerp(topLidRef.current.rotation.x, openAngleTop, 0.15);
            bottomLidRef.current.rotation.x = THREE.MathUtils.lerp(bottomLidRef.current.rotation.x, openAngleBot, 0.15);

            let targetScale = 1;
            if (mood === 'surprised') targetScale = 0.5;
            if (mood === 'suspicious') targetScale = 0.8;
            if (mood === 'tired') targetScale = 0.9;

            pupilRef.current.scale.setScalar(THREE.MathUtils.lerp(pupilRef.current.scale.x, targetScale, 0.1));
            return;
        }

        topLidRef.current.rotation.x = currentTop;
        bottomLidRef.current.rotation.x = currentBot;

        let targetScale = 1;
        if (mood === 'surprised') targetScale = 0.5;
        if (mood === 'suspicious') targetScale = 0.8;
        if (mood === 'tired') targetScale = 0.9;

        pupilRef.current.scale.setScalar(THREE.MathUtils.lerp(pupilRef.current.scale.x, targetScale, 0.1));
    });

    // Constants for geometry
    const SCLERA_RADIUS = 1;
    const IRIS_RADIUS = 0.55;
    const PUPIL_RADIUS = 0.25;
    const EYELID_RADIUS = SCLERA_RADIUS * 1.02;

    return (
        <group ref={eyeRef} position={position}>
            {/* Eyeball Wrapper */}
            <group ref={eyeballRef}>
                {/* Sclera (White part) */}
                <mesh
                    castShadow
                    receiveShadow
                    onClick={() => {
                        blinkState.current.isBlinking = true;
                        blinkState.current.startTime = Date.now();
                        blinkState.current.duration = 0.15;
                    }}
                    onPointerOver={() => document.body.style.cursor = 'pointer'}
                    onPointerOut={() => document.body.style.cursor = 'auto'}
                >
                    <sphereGeometry args={[SCLERA_RADIUS, 64, 64]} />
                    {/* Porcelain-like Sclera */}
                    <meshPhysicalMaterial
                        color="#fff0e5" // Slightly warm white
                        roughness={0.2}
                        metalness={0.1}
                        transmission={0}
                        clearcoat={1.0}
                        clearcoatRoughness={0.1}
                    />
                </mesh>

                {/* Iris - Multi-layered */}
                <mesh ref={irisRef} position={[0, 0, SCLERA_RADIUS - 0.05]} rotation={[0, 0, 0]}>
                    <circleGeometry args={[IRIS_RADIUS, 64]} />
                    <meshStandardMaterial color="#3b82f6" roughness={0.4} metalness={0.2} side={THREE.DoubleSide} />
                    {/* Inner Iris Detail */}
                    <mesh position={[0, 0, 0.01]}>
                        <ringGeometry args={[PUPIL_RADIUS, IRIS_RADIUS - 0.05, 64]} />
                        <meshStandardMaterial color="#1d4ed8" roughness={0.5} />
                    </mesh>
                </mesh>

                {/* Pupil */}
                <mesh ref={pupilRef} position={[0, 0, SCLERA_RADIUS - 0.04]} rotation={[0, 0, 0]}>
                    <circleGeometry args={[PUPIL_RADIUS, 64]} />
                    <meshStandardMaterial color="#000000" roughness={0.0} side={THREE.DoubleSide} />
                </mesh>

                {/* Cornea (Glassy bulging outer layer) - CRITICAL for "Wet" look */}
                <mesh>
                    {/* Bulge it out slightly more at the front */}
                    <sphereGeometry args={[SCLERA_RADIUS * 1.01, 64, 64]} />
                    <meshPhysicalMaterial
                        roughness={0}
                        metalness={0}
                        transmission={1} // Fully transparent glass
                        thickness={0.8} // Refraction depth
                        ior={1.4} // Water/Cornea index
                        clearcoat={1}
                        clearcoatRoughness={0}
                        opacity={1}
                        transparent={false} // Use transmission instead of alpha blending for better glass
                    />
                </mesh>

                {/* Fake Specular Highlight (Cartoon Catchlight) */}
                <mesh position={[0.4, 0.4, SCLERA_RADIUS]} rotation={[0, 0, 0]}>
                    <circleGeometry args={[0.08, 32]} />
                    <meshBasicMaterial color="#ffffff" opacity={0.9} transparent />
                </mesh>
                <mesh position={[0.55, 0.5, SCLERA_RADIUS]} rotation={[0, 0, 0]}>
                    <circleGeometry args={[0.03, 32]} />
                    <meshBasicMaterial color="#ffffff" opacity={0.8} transparent />
                </mesh>
            </group>

            {/* Eyelids */}
            <group rotation={[0, 0, 0]}>
                {/* Top Lid */}
                <mesh ref={topLidRef} rotation={[-Math.PI / 2, 0, 0]}>
                    <sphereGeometry args={[EYELID_RADIUS, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshPhysicalMaterial color="#ffccaa" side={THREE.DoubleSide} roughness={0.3} reflectivity={0.5} sheen={0.2} sheenColor="#ffffff" />
                    {/* Eyelashes Top - Tapered Tubes instead of Rings */}
                    <mesh position={[0, 0.95, 0.3]} rotation={[0.4, 0, 0]}>
                        <torusGeometry args={[EYELID_RADIUS, 0.02, 16, 100, Math.PI]} />
                        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
                    </mesh>
                </mesh>

                {/* Bottom Lid */}
                <mesh ref={bottomLidRef} rotation={[Math.PI / 2, 0, 0]}>
                    <sphereGeometry args={[EYELID_RADIUS, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshPhysicalMaterial color="#ffccaa" side={THREE.DoubleSide} roughness={0.3} reflectivity={0.5} sheen={0.2} sheenColor="#ffffff" />
                    {/* Eyelashes Bottom */}
                    <mesh position={[0, 0.85, -0.3]} rotation={[-0.2, 0, 0]}>
                        <torusGeometry args={[EYELID_RADIUS, 0.015, 16, 100, Math.PI]} />
                        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
                    </mesh>
                </mesh>
            </group>
        </group>
    );
}
