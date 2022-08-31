import { Canvas } from "@react-three/fiber";
import { Vector3 } from "three";
import CameraController from "./CameraController";
import Model from "./Model";

export default function ModelView() {

    return (
        <Canvas>
            <CameraController />
            <ambientLight color="white" />
            <Model modelUrl="/test.fbx" textureUrl="/test.png" />
        </Canvas>
    );

}

