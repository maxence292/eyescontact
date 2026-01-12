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
        const targetX = -state.pointer.y * 0.6;
        const targetY = state.pointer.x * 0.6; // No mirror for now, following cursor directly

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
        // Adjust speed based on mood (Tired = slow)
        let finalTargetX = targetX + jitterX;
        let finalTargetY = targetY + jitterY;

        // Cross-eyed override
        if (mood === 'cross') {
            // Simple heuristic: look inwards.
            // If eye is on left (pos < 0), look right (positive Y rotation).
            // If eye is on right (pos > 0), look left (negative Y rotation).
            const isLeftEye = position[0] < 0;
            finalTargetY = isLeftEye ? 0.3 : -0.3; // 20-ish degrees inward
            finalTargetX = 0.0; // Level
        }

        const trackingSpeed = mood === 'tired' || isSleeping ? 0.02 : 0.15;
        currentRotation.current.x = THREE.MathUtils.lerp(currentRotation.current.x, finalTargetX, trackingSpeed);
        currentRotation.current.y = THREE.MathUtils.lerp(currentRotation.current.y, finalTargetY, trackingSpeed);

        eyeballRef.current.rotation.x = currentRotation.current.x;
        eyeballRef.current.rotation.y = currentRotation.current.y;

        // --- 2. BLINKING MECHANIC ---
        const now = Date.now();

        // Modulate blink frequency by mood
        let blinkInterval = 3000;
        if (mood === 'suspicious') blinkInterval = 4000;
        if (mood === 'surprised') blinkInterval = 5000; // Stare
        if (mood === 'tired') blinkInterval = 1000;     // Struggle to keep eyes open

        if (now > nextBlink.current && !blinkState.current.isBlinking) {
            blinkState.current.isBlinking = true;
            blinkState.current.startTime = now;
            blinkState.current.duration = 0.1 + Math.random() * 0.05;
            if (mood === 'tired') blinkState.current.duration = 0.4; // Slow blink

            nextBlink.current = now + Math.random() * blinkInterval + 1000;
        }

        // Determine target lid angles based on MOOD
        let openAngleTop = -Math.PI / 2.5; // Default open
        let openAngleBot = Math.PI / 2.5;

        if (mood === 'suspicious') {
            openAngleTop = -Math.PI / 3.5; // Squint top
            openAngleBot = Math.PI / 3.5;  // Squint bot
        } else if (mood === 'surprised') {
            openAngleTop = -Math.PI / 2.1; // Wide open
            openAngleBot = Math.PI / 2.1;
        } else if (mood === 'tired' || isSleeping) {
            openAngleTop = -Math.PI / 4;   // Droopy
            openAngleBot = Math.PI / 2.5; // Bot stays same-ish or rises
            if (isSleeping) {
                openAngleTop = 0; // Closed
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
            // Smooth transition to mood state (in case mood changes without blink)
            topLidRef.current.rotation.x = THREE.MathUtils.lerp(topLidRef.current.rotation.x, openAngleTop, 0.1);
            bottomLidRef.current.rotation.x = THREE.MathUtils.lerp(bottomLidRef.current.rotation.x, openAngleBot, 0.1);
            // Pupil Dilation
            let targetScale = 1;
            if (mood === 'surprised') targetScale = 0.5; // Constrict
            if (mood === 'suspicious') targetScale = 0.8;
            if (mood === 'tired') targetScale = 0.9;

            pupilRef.current.scale.setScalar(THREE.MathUtils.lerp(pupilRef.current.scale.x, targetScale, 0.1));
            return; // Skip direct assignment below, let lerp handle it
        }

        topLidRef.current.rotation.x = currentTop;
        bottomLidRef.current.rotation.x = currentBot;

        // Pupil Dilation
        let targetScale = 1;
        if (mood === 'surprised') targetScale = 0.5; // Constrict
        if (mood === 'suspicious') targetScale = 0.8;
        if (mood === 'tired') targetScale = 0.9;

        pupilRef.current.scale.setScalar(THREE.MathUtils.lerp(pupilRef.current.scale.x, targetScale, 0.1));
    });

    // Constants for geometry
    const SCLERA_RADIUS = 1;
    const IRIS_RADIUS = 0.55;
    const PUPIL_RADIUS = 0.25;
    const CORNEA_RADIUS = SCLERA_RADIUS * 1.02; // Slightly bulge out
    const EYELID_RADIUS = SCLERA_RADIUS * 1.03; // Just outside cornea

    return (
        <group ref={eyeRef} position={position}>
            {/* Eyeball Wrapper - This will rotate to track the mouse */}
            <group ref={eyeballRef}>
                {/* Sclera (White part) */}
                <mesh
                    castShadow
                    receiveShadow
                    onClick={() => {
                        // Force blink / Flinch
                        blinkState.current.isBlinking = true;
                        blinkState.current.startTime = Date.now();
                        blinkState.current.duration = 0.15; // Fast flinch
                    }}
                    onPointerOver={() => document.body.style.cursor = 'pointer'}
                    onPointerOut={() => document.body.style.cursor = 'auto'}
                >
                    <sphereGeometry args={[SCLERA_RADIUS, 64, 64]} />
                    <meshPhysicalMaterial
                        color="#ffffff"
                        roughness={0.1}
                        metalness={0.0}
                        transmission={0.0}
                        thickness={2.5}
                        clearcoat={1.0}
                        clearcoatRoughness={0.1}
                        sheen={0.2}
                        sheenColor="#ffaaaa"
                    />
                </mesh>

                {/* Iris */}
                <mesh ref={irisRef} position={[0, 0, SCLERA_RADIUS - 0.08]} rotation={[0, 0, 0]}>
                    <circleGeometry args={[IRIS_RADIUS, 64]} />
                    <meshStandardMaterial color="#4A90E2" roughness={0.3} metalness={0.1} side={THREE.DoubleSide} />
                </mesh>

                {/* Pupil */}
                <mesh ref={pupilRef} position={[0, 0, SCLERA_RADIUS - 0.07]} rotation={[0, 0, 0]}>
                    <circleGeometry args={[PUPIL_RADIUS, 64]} />
                    <meshStandardMaterial color="#000000" roughness={0.0} side={THREE.DoubleSide} />
                </mesh>

                {/* Cornea (Glassy outer layer) */}
                <mesh>
                    <sphereGeometry args={[SCLERA_RADIUS * 1.01, 64, 64, 0, Math.PI * 2, 0, 1.2]} />
                    <meshPhysicalMaterial
                        color="#ffffff"
                        roughness={0}
                        metalness={0}
                        transmission={0.95} // Glass-like
                        transparent
                        opacity={0.3}
                        ior={1.5}
                        thickness={0.5}
                        clearcoat={1}
                        clearcoatRoughness={0}
                    />
                </mesh>
            </group>

            {/* Eyelids - Fixed orientation relative to socket, only rotate x for blinking */}
            <group rotation={[0, 0, 0]}>
                {/* Top Lid */}
                <mesh ref={topLidRef} rotation={[-Math.PI / 2, 0, 0]}>
                    <sphereGeometry args={[EYELID_RADIUS, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshStandardMaterial color="#e0a080" side={THREE.DoubleSide} roughness={0.5} />
                    {/* Eyelashes Top */}
                    <mesh position={[0, 0.9, 0.4]} rotation={[0.4, 0, 0]}>
                        <ringGeometry args={[EYELID_RADIUS, EYELID_RADIUS + 0.15, 64, 1, 0, Math.PI]} />
                        <meshStandardMaterial color="#000000" side={THREE.DoubleSide} />
                    </mesh>
                </mesh>

                {/* Bottom Lid */}
                <mesh ref={bottomLidRef} rotation={[Math.PI / 2, 0, 0]}>
                    <sphereGeometry args={[EYELID_RADIUS, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshStandardMaterial color="#e0a080" side={THREE.DoubleSide} roughness={0.5} />
                    {/* Eyelashes Bottom (Subtler) */}
                    <mesh position={[0, 0.8, -0.4]} rotation={[-0.2, 0, 0]}>
                        <ringGeometry args={[EYELID_RADIUS, EYELID_RADIUS + 0.05, 64, 1, 0, Math.PI]} />
                        <meshStandardMaterial color="#000000" side={THREE.DoubleSide} />
                    </mesh>
                </mesh>
            </group>
        </group>
    );
}
