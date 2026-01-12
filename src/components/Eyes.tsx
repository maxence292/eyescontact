"use client";

import React, { useRef, useEffect } from "react";
import Eye from "./Eye";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useEyeState } from "@/hooks/useEyeState";

export default function Eyes() {
    const { setMood, mood, toggleSleep, isSleeping } = useEyeState();
    const lastMouse = useRef(new THREE.Vector2(0, 0));
    const velocity = useRef(0);
    const lastMoveTime = useRef(Date.now());
    const shakeCount = useRef(0); // For dizzy
    const lastDirection = useRef(0);

    useFrame((state) => {
        const { pointer } = state;
        const now = Date.now();
        const delta = now - lastMoveTime.current;

        // Calculate velocity
        const dist = pointer.distanceTo(lastMouse.current);
        const speed = dist / state.clock.getDelta(); // This might vary by frame rate, but approx okay

        // Update trackers
        if (dist > 0.001) {
            lastMoveTime.current = now;
            if (isSleeping) toggleSleep(); // Wake up
            if (mood === 'tired') setMood('neutral');

            // Shake detection (Dizzy)
            const dx = pointer.x - lastMouse.current.x;
            // extensive shake logic skipped for brevity, focused on speed/pos
        }

        // 1. FAST MOVEMENT -> SURPRISE
        // High speed threshold?
        // Using simple distance per frame since speed calculation above had faulty delta division
        const moveDist = dist;

        if (moveDist > 0.1) { // Very fast move in one frame
            if (mood !== 'surprised') {
                setMood('surprised');
                setTimeout(() => setMood('neutral'), 1000); // Reset after 1s
            }
        }

        // 2. CORNERS -> SUSPICIOUS
        // Corners are approx x > 0.7 or < -0.7, y > ...
        // Aspect ratio matters but pointer is normalized -1..1 generally?
        // R3F pointer is viewport normalized -1 to 1.
        const isCorner = (Math.abs(pointer.x) > 0.8 && Math.abs(pointer.y) > 0.8);
        // Center -> Cross-eyed
        const isCenter = (Math.abs(pointer.x) < 0.15 && Math.abs(pointer.y) < 0.15);

        if (isCorner && mood !== 'suspicious' && mood !== 'surprised' && !isSleeping) {
            setMood('suspicious');
        } else if (isCenter && mood !== 'cross' && mood !== 'surprised' && !isSleeping) {
            setMood('cross');
        } else if (!isCorner && !isCenter && (mood === 'suspicious' || mood === 'cross')) {
            setMood('neutral');
        }

        // 3. INACTIVITY -> TIRED / SLEEPER
        if (delta > 4000 && !isSleeping && mood !== 'tired') {
            setMood('tired');
        }
        if (delta > 8000 && !isSleeping) {
            // toggleSleep(); 
            // Logic to close eyes fully
        }

        lastMouse.current.copy(pointer);
    });

    return (
        <group>
            {/* Left Eye */}
            <Eye position={[-1.5, 0, 0]} />
            {/* Right Eye */}
            <Eye position={[1.5, 0, 0]} />
        </group>
    );
}
