import { Button, Card, Elevation, Icon, InputGroup, Tree, TreeNodeInfo } from "@blueprintjs/core";
import { useNavigate } from "react-router-dom";
import { ModelFolderObject } from "../../types";
import { useEffect, useState } from "react";
import Page from "../components/Page";
import { Canvas } from "@react-three/fiber";
import CameraController from "../components/CameraController";
import { Model, ModelWithTexture } from "../components/Model";
import { ApiManager } from "../manager/ApiManager";
import { StorageManager } from "../manager/StateManager";
import { handleError, showError, showMessage } from "../classes/Toaster";

declare type ModelObject = {
    modelPath: string[];
    hasTexture?: boolean;
}

const apiManager = ApiManager.instance;
const storageManager = StorageManager.instance;

function folderToTreeNodes( dir: ModelFolderObject, path = [] as string[] ) {
    const nodes = [] as TreeNodeInfo<ModelObject>[];

    for (const [name, subdir] of Object.entries(dir)) {
        const modelPath = path.concat([name]);
        if (typeof subdir === "object") {
            nodes.push({
                id: name,
                label: name.substring(0, name.length),
                nodeData: { modelPath },
                childNodes: folderToTreeNodes(subdir, modelPath),
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

export default function ModelList() {
    apiManager.modelDirectory = storageManager.getAppState("modelDirectory");

    const [loading, setLoading] = useState(false);
    const [nodes, setNodes] = useState([] as TreeNodeInfo<ModelObject>[]);
    const [model, setModel] = useState<ModelObject>();
    const navigation = useNavigate();

    async function loadModels() {
        if (apiManager.modelDirectory === undefined) return;
        setLoading(true);
        storageManager.updateAppState("modelDirectory", apiManager.modelDirectory);
        try {
            setNodes(folderToTreeNodes(await apiManager.getModels(apiManager.modelDirectory)));
            showMessage("Models loaded", "success");
        } catch(e) {
            handleError(e);
        }
        setLoading(false);
    }

    // on first component mount: load models if the path is given
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { if (apiManager.modelDirectory !== undefined) loadModels().catch(handleError); }, []);

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
        <>
            <Page
                title="Model Browser"
                style={{ display: "flex", flexDirection: "row", flex: 1 }}
                headerComponents={
                    <>
                        <InputGroup
                            defaultValue={apiManager.modelDirectory||undefined}
                            placeholder="Paste your model directory path here..."
                            rightElement={<Button text={loading ? "Loading..." : "Load Models"} onClick={loadModels} disabled={loading} />}
                            onChange={s => apiManager.modelDirectory = s.target.value}
                            disabled={loading}
                            style={{ minWidth: "30em" }}
                        />
                    </>
                }
            >
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
        </>
    );
}