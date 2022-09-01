import { Button, Card, Elevation, Icon, InputGroup, Tree, TreeNodeInfo } from "@blueprintjs/core";
import { useNavigate } from "react-router-dom";
import { ModelFolderObject } from "../../types";
import { useEffect, useState } from "react";
import Page from "../components/Page";
import { Canvas } from "@react-three/fiber";
import CameraController from "../components/CameraController";
import { Model } from "../components/Model";
import { ApiManager } from "../manager/ApiManager";
import { StorageManager } from "../manager/StateManager";
import { handleError, showError, showMessage } from "../classes/Toaster";
import { Vector3 } from "three";

declare type ModelObject = {
    modelPath: string;
    hasTexture?: boolean;
}

const apiManager = ApiManager.instance;
const storageManager = StorageManager.instance;

function folderToTreeNodes( dir: ModelFolderObject, icon?: (node: TreeNodeInfo<ModelObject>) => JSX.Element|undefined, modelPath = "" ) {
    const nodes = [] as TreeNodeInfo<ModelObject>[];

    for (const [name, subdir] of Object.entries(dir)) {
        const _modelPath = modelPath + (modelPath === "" ? "" : ":") + name;
        const node = {
            id: name,
            label: name.substring(0, name.length),
            nodeData: { modelPath: _modelPath }
        } as TreeNodeInfo<ModelObject>;
        if (typeof subdir === "object") {
            node.childNodes = folderToTreeNodes(subdir, icon, _modelPath);
            node.icon = "folder-close";
        } else if (typeof subdir === "boolean") {
            node.nodeData!.hasTexture = subdir;
            node.icon = <Icon icon="cube" intent={subdir ? "primary" : "none"} style={{ marginRight: ".5em" }} />;
        } else {
            continue;
        }
        
        // use callback for icon generation
        if (icon !== undefined) node.secondaryLabel = icon(node);
        nodes.push(node);
    }

    return nodes;
}

let _mapNodes = [] as TreeNodeInfo<ModelObject>[];
let _browserNodes = [] as TreeNodeInfo<ModelObject>[];

export default function ModelList() {
    
    const [loading, setLoading] = useState(false);
    const [mapNodes, setMapNodes] = useState([] as TreeNodeInfo<ModelObject>[]);
    const [browserNodes, setBrowserNodes] = useState([] as TreeNodeInfo<ModelObject>[]);
    const [model, setModel] = useState<ModelObject>();
    const navigation = useNavigate();

    _mapNodes = mapNodes;
    _browserNodes = browserNodes;
    const mapName = storageManager.getAppState("mapName");
    apiManager.modelDirectory = storageManager.getAppState("modelDirectory");

    /**
     * Loads the model index for the currently selected directory
     */
    async function loadAllModels() {
        if (apiManager.modelDirectory === undefined) return;
        setLoading(true);
        storageManager.updateAppState("modelDirectory", apiManager.modelDirectory);
        try {
            setBrowserNodes(
                folderToTreeNodes(
                    await apiManager.getModels(apiManager.modelDirectory),
                    node => typeof node.nodeData?.hasTexture === "boolean" ? <Icon icon="cube-add" intent="success" onClick={() => addModelToMap(node)} /> : undefined
                )
            );
            showMessage("Local models loaded", "success");
        } catch(e) {
            handleError(e);
        }
        setLoading(false);
    }

    /**
     * Loads the model list for the currently selected map
     */
    async function loadMapModels() {
        if (mapName === undefined) return;
        try {
            setMapNodes(folderToTreeNodes(await apiManager.getMapModels(mapName), node => <Icon icon="trash" intent="danger" onClick={() => removeModelFromMap(node)} />));
            showMessage("Map models loaded", "success");
        } catch(e) {
            handleError(e);
        }
    }

    // on first component mount: load models if the path is given
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (apiManager.modelDirectory !== undefined) loadAllModels().catch(handleError);
        if (apiManager.modelDirectory !== undefined) loadMapModels().catch(handleError);
    }, []);

    /**
     * Calback for clicks in the map model list
     * @param node The clicked node (3D model)
     */
    function mapNodeClicked( node: TreeNodeInfo<ModelObject> ) {
        if (node.nodeData === undefined || mapName === undefined) return;
    }

    /**
     * Calback for deletion clicks on a map model object
     * @param node The clicked node (3D model)
     */
    function removeModelFromMap( node: TreeNodeInfo<ModelObject> ) {
        if (node.nodeData === undefined || mapName === undefined) return;
        apiManager.removeModelFromMap(mapName, node.nodeData.modelPath)
            .then(() => setMapNodes(_mapNodes.filter( n => n.id !== node.id )))
            .catch(handleError);
    }

    /**
     * Calback for clicks in the model browser
     * @param node The clicked node (3D model or folder)
     */
    function browserNodeClicked( node: TreeNodeInfo<ModelObject> ) {
        if (node.nodeData === undefined) return;
        if (node.nodeData.hasTexture === undefined) {
            node.isExpanded = !node.isExpanded;
            node.icon = node.isExpanded ? "folder-open" : "folder-close";
            setBrowserNodes(browserNodes.concat());
        } else {
            console.log(`Showing 3D model "${node.id}"`);
            setModel(node.nodeData);
        }
    }

    /**
     * Calback to add a 3D model to the map
     * @param node The clicked node (3D model or folder)
     */
    function addModelToMap( node: TreeNodeInfo<ModelObject> ) {
        if (mapName === undefined || node.nodeData === undefined || node.nodeData.hasTexture === undefined) return;
        if (_mapNodes.findIndex(n => n.id === node.id) !== -1) {
            showMessage(`Already added "${node.id}" to "${mapName}"...`, "warning");
            return;
        }
        const _node = Object.assign({}, node);
        _node.secondaryLabel = <Icon icon="minus" onClick={() => removeModelFromMap(_node)} />
        apiManager.addModelToMap(mapName, node.nodeData.modelPath, node.nodeData.hasTexture ? node.nodeData.modelPath : undefined)
            .then(() => setMapNodes(_mapNodes.concat([_node])))
            .catch(handleError);
    }

    // check if map is selected
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
            modelNode = <Model modelUrl={apiManager.getModelUrl("mesh", model.modelPath)} textureUrl={model.hasTexture ? apiManager.getModelUrl("texture", model.modelPath) : undefined} />;
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
                            rightElement={<Button text={loading ? "Loading..." : "Load Models"} onClick={loadAllModels} disabled={loading} />}
                            onChange={s => apiManager.modelDirectory = s.target.value}
                            disabled={loading}
                            style={{ minWidth: "30em" }}
                        />
                    </>
                }
            >
                <Card style={{ minWidth: "30em", margin: "1em", padding: 0, display: "flex", flexDirection: "column" }} elevation={Elevation.THREE} >
                    <h2 style={{ textAlign: "center" }}>{mapName}</h2>
                    <div style={{ overflowY: "scroll", flex: 1 }}>
                        <Tree
                            contents={mapNodes}
                            onNodeExpand={mapNodeClicked}
                            onNodeCollapse={mapNodeClicked}
                            onNodeClick={mapNodeClicked}
                        />
                    </div>
                </Card>
                <Card style={{ minWidth: "30em", margin: "1em", padding: 0, display: "flex", flexDirection: "column" }} elevation={Elevation.THREE} >
                    <h2 style={{ textAlign: "center" }}>Model Browser</h2>
                    <div style={{ overflowY: "scroll", flex: 1 }}>
                        <Tree
                            contents={browserNodes}
                            onNodeExpand={browserNodeClicked}
                            onNodeCollapse={browserNodeClicked}
                            onNodeClick={browserNodeClicked}
                        />
                    </div>
                </Card>
                <Card style={{ flex: 3, margin: "1em", padding: 0 }} elevation={Elevation.THREE}>
                    <Canvas>
                        <CameraController />
                        <pointLight position={new Vector3(25, 25, 25)} intensity={0.6} />
                        <pointLight position={new Vector3(-25, -25, -25)} intensity={0.6} />
                        {modelNode}
                    </Canvas>
                </Card>
            </Page>
        </>
    );
}