"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import Eyes from "./Eyes";
import { Suspense } from "react";

export default function Experience() {
    return (
        <div className="w-full h-full">
            <Canvas
                shadows
                camera={{ position: [0, 0, 10], fov: 45 }}
                gl={{ antialias: true, alpha: true }}
            >
                <color attach="background" args={["#f0f0f0"]} />
                <Suspense fallback={null}>
                    <Environment preset="studio" />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} />
                    <Eyes />
                    <OrbitControls enableZoom={false} />
                </Suspense>
            </Canvas>
        </div>
    );
}
