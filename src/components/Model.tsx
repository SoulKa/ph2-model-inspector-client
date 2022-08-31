import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { useLoader } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Box3, BufferGeometry, Group, Mesh, MeshPhongMaterial } from "three";

export type ModelProps = {
    modelUrl: string;
    textureUrl: string;
}

function scaleModel( model: Group ) {
    const boundingBox = new Box3().setFromObject(model);
    const xSize = boundingBox.max.x - boundingBox.min.x;
    const ySize = boundingBox.max.y - boundingBox.min.y;
    const zSize = boundingBox.max.z - boundingBox.min.z;
    const scale = 20/Math.max(xSize, ySize, zSize);
    model.scale.set(scale, scale, scale);
}

function centerModel( model: Group ) {
    const boundingBox = new Box3().setFromObject(model);
    const center = boundingBox.getCenter(model.position);
    model.position.set(-center.x, -center.y, -center.z);
}

export default function Model( props : ModelProps ) {
    const model = useLoader(FBXLoader, props.modelUrl);
    const texture = useTexture(props.textureUrl);

    // apply texture
    model.traverse(
        (obj) => {
            const mesh = obj as Mesh<BufferGeometry, MeshPhongMaterial>;
            if (mesh.isMesh) {
                mesh.material.map = texture;
                mesh.material.needsUpdate = true;
            }
        }
    );

    // scale and center
    scaleModel(model);
    centerModel(model);
    return <primitive object={model} />;
}

