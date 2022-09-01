import { useEffect, useState } from "react";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { Box3, BufferGeometry, Group, Mesh, MeshPhongMaterial, TextureLoader } from "three";
import { handleError } from "../classes/Toaster";

export type ModelProps = {
    modelUrl: string;
    textureUrl?: string;
    onProgress?: (progress: number) => void
}

/**
 * Scales the given 3D model to a common fixed size
 * @param model The FBX mesh group
 */
function scaleModel( model: Group ) {
    const boundingBox = new Box3().setFromObject(model);
    const xSize = boundingBox.max.x - boundingBox.min.x;
    const ySize = boundingBox.max.y - boundingBox.min.y;
    const zSize = boundingBox.max.z - boundingBox.min.z;
    const scale = 20/Math.max(xSize, ySize, zSize);
    model.scale.set(scale, scale, scale);
}

/**
 * Centers the given 3D model to the origin
 * @param model The FBX mesh group
 */
function centerModel( model: Group ) {
    const boundingBox = new Box3().setFromObject(model);
    const center = boundingBox.getCenter(model.position);
    model.position.set(-center.x, -center.y, -center.z);
}

/**
 * Loads the given 3D model with the given texture
 * @param modelUrl The FBX model URL
 * @param textureUrl The PNG texture URL
 * @returns The scaled and centered model with the given texture
 */
async function loadModel( modelUrl: string, textureUrl?: string, onProgress?: (progress: number) => void ) {
    const progress = [0, textureUrl === undefined ? 100 : 0];
    function _onProgress( index: 0|1, e: ProgressEvent<EventTarget> ) {
        if (onProgress === undefined || !e.lengthComputable) return;
        progress[index] = e.loaded/e.total*100;
        onProgress(progress.reduce( (sum, v) => sum + v , 0)/progress.length);
    }

    // load both in parallel
    const [model, texture] = await Promise.all([
        new FBXLoader().loadAsync(modelUrl, e => _onProgress(0, e)),
        textureUrl === undefined ? Promise.resolve(undefined) : new TextureLoader().loadAsync(textureUrl, e => _onProgress(1, e))
    ]);

    // apply texture
    if (texture !== undefined) model.traverse(
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
    return model;
}

/**
 * A ThreeJS FBX model and texture loader and render component
 */
export function Model( props : ModelProps ) {
    const [model, setModel] = useState<Group>();

    // load model asynchronously in background
    useEffect(() => {
        loadModel(props.modelUrl, props.textureUrl).then(setModel).catch(handleError);
    }, [props.modelUrl, props.textureUrl]);

    // render once loaded
    if (model === undefined) return null;
    return <primitive object={model} />;
}