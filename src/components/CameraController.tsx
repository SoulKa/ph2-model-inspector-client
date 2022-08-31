import { useEffect } from "react";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { useThree } from "@react-three/fiber";

export default function CameraController() {
    const { camera, gl } = useThree();

    useEffect(
        () => {
            camera.position.set(0, 10, 20);
            const controls = new OrbitControls(camera, gl.domElement);
            controls.enableDamping = true;
            controls.target.set(0, 0, 0);
            return () => controls.dispose();
        },
        [camera, gl]
    );

    return null;
  };