import { Card, Elevation, Icon, Tree, TreeNodeInfo } from "@blueprintjs/core";
import { useNavigate } from "react-router-dom";
import { ModelFolderObject } from "../../types";
import { useEffect, useState } from "react";
import Page from "../components/Page";
import { Canvas } from "@react-three/fiber";
import CameraController from "../components/CameraController";
import { Model, ModelWithTexture } from "../components/Model";
import { ApiManager } from "../manager/ApiManager";
import { StorageManager } from "../manager/StateManager";
import { showError } from "../classes/Toaster";

export type ModelListProps = {
    models: ModelFolderObject
};

declare type ModelObject = {
    modelPath: string[];
    hasTexture?: boolean;
}

const apiManager = ApiManager.instance;
const storageManager = StorageManager.instance;

export default function ModelList( props: ModelListProps ) {

    const [nodes, setNodes] = useState([] as TreeNodeInfo<ModelObject>[]);
    const [model, setModel] = useState<ModelObject>();
    const navigation = useNavigate();

    // if models changed: update tree nodes
    useEffect(() => {
        function getChildNodes( dir: ModelFolderObject, path = [] as string[] ) {
            const nodes = [] as TreeNodeInfo<ModelObject>[];

            for (const [name, subdir] of Object.entries(dir)) {
                const modelPath = path.concat([name]);
                if (typeof subdir === "object") {
                    nodes.push({
                        id: name,
                        label: name.substring(0, name.length),
                        nodeData: { modelPath },
                        childNodes: getChildNodes(subdir, modelPath),
                        icon: "folder-close"
                    });
                } else if (typeof subdir === "boolean") {
                    nodes.push({
                        id: name,
                        label: name.substring(0, name.length),
                        nodeData: { modelPath, hasTexture: subdir },
                        icon: <Icon icon="cube" intent={subdir ? "primary" : "none"} style={{ marginRight: ".5em" }} />
                    });
                } else {
                    continue;
                }
            }

            return nodes;
        }

        setNodes(getChildNodes(props.models));
    }, [props.models]);

    // check if map is selected
    const mapName = storageManager.getAppState("mapName");
    if (mapName === undefined) {
        navigation("/");
        return null;
    }

    // render model component
    let modelNode = null as JSX.Element|null;
    if (model !== undefined) {
        if (storageManager.getAppState("modelDirectory") === undefined) {
            showError("Must select a model directory first!");
        } else {
            const modelPath = model.modelPath.join(":");
            if (model.hasTexture) {
                modelNode = <ModelWithTexture modelUrl={apiManager.getModelUrl("mesh", modelPath)} textureUrl={apiManager.getModelUrl("texture", modelPath)} />;
            } else {
                modelNode = <Model modelUrl={apiManager.getModelUrl("mesh", modelPath)} />;
            }
        }
    }

    function nodeClicked( node: TreeNodeInfo<ModelObject> ) {
        if (node.nodeData === undefined) return;
        if (node.nodeData.hasTexture === undefined) {
            node.isExpanded = !node.isExpanded;
            node.icon = node.isExpanded ? "folder-open" : "folder-close";
            setNodes(nodes.concat());
        } else {
            setModel(node.nodeData)
        }
    }

    return (
        <Page style={{ display: "flex", flexDirection: "row", flex: 1 }} >
            <Card style={{ minWidth: "30em", margin: "1em", padding: 0, overflowY: "scroll" }} elevation={Elevation.THREE} >
                <Tree
                    contents={nodes}
                    className="full-height"
                    onNodeExpand={nodeClicked}
                    onNodeCollapse={nodeClicked}
                    onNodeClick={nodeClicked}
                />
            </Card>
            <Card style={{ flex: 3, margin: "1em", padding: 0 }} elevation={Elevation.THREE}>
                <Canvas>
                    <CameraController />
                    <ambientLight color="white" />
                    {modelNode}
                </Canvas>
            </Card>
        </Page>
    );
}