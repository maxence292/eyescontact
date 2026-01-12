"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, ContactShadows } from "@react-three/drei";
import Eyes from "./Eyes";
import { Suspense } from "react";
import ErrorBoundary from "./ErrorBoundary";

export default function Experience() {
    return (
        <div className="w-full h-full bg-[#f0f0f0]">
            <Canvas
                shadows
                camera={{ position: [0, 0, 8], fov: 40 }}
                gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
            >
                <Suspense fallback={null}>
                    {/* Rich Environment for Reflections */}
                    <Environment preset="city" background={false} blur={0.8} />

                    {/* Main Light */}
                    <ambientLight intensity={0.7} />
                    <pointLight position={[10, 10, 10]} intensity={1.5} castShadow shadow-mapSize={1024} />
                    <pointLight position={[-10, -10, -10]} intensity={0.5} color="blue" />

                    <ErrorBoundary fallback={<mesh><boxGeometry /><meshStandardMaterial color="red" /></mesh>}>
                        <Eyes />
                    </ErrorBoundary>

                    <ContactShadows position={[0, -2, 0]} opacity={0.5} scale={10} blur={2.5} far={4} />
                    <OrbitControls enableZoom={false} enablePan={false} />
                </Suspense>
            </Canvas>
        </div>
    );
}
