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
};

declare type SelectedModelObject = ModelObject & {
    isMapModel: boolean;
};

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

let _mapNodes : TreeNodeInfo<ModelObject>[]|undefined;
let _browserNodes : TreeNodeInfo<ModelObject>[]|undefined;
let loadingMapModels = false;
let loadingBrowserModels = false;

export default function ModelList() {
    
    const [loading, setLoading] = useState(false);
    const [mapNodes, setMapNodes] = useState<TreeNodeInfo<ModelObject>[]>();
    const [browserNodes, setBrowserNodes] = useState<TreeNodeInfo<ModelObject>[]>();
    const [model, setModel] = useState<SelectedModelObject>();
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
            loadingBrowserModels = true;
            
            setBrowserNodes(
                folderToTreeNodes(
                    await apiManager.getModels(apiManager.modelDirectory),
                    node => typeof node.nodeData!.hasTexture === "boolean" ? <Icon icon="cube-add" intent="success" onClick={(e) => { e.stopPropagation(); addModelToMap(node); return false; }} /> : undefined
                )
            );
            showMessage("Local models loaded", "success");
        } catch(e) {
            handleError(e);
        }
        loadingBrowserModels = false;
        setLoading(false);
    }

    /**
     * Loads the model list for the currently selected map
     */
    async function loadMapModels() {
        if (mapName === undefined) return;
        loadingMapModels = true;
        try {
            setMapNodes(folderToTreeNodes(await apiManager.getMapModels(mapName), node => <Icon icon="trash" intent="danger" onClick={(e) => { e.stopPropagation(); removeModelFromMap(node); return false; }} />));
            showMessage("Map models loaded", "success");
        } catch(e) {
            handleError(e);
        }
        loadingMapModels = false;
    }

    // on first component mount: load models if the path is given
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (apiManager.modelDirectory === undefined) return;
        Promise.all([
            !loadingBrowserModels ? loadAllModels() : Promise.resolve(),
            !loadingMapModels ? loadMapModels() : Promise.resolve()
        ]).catch(handleError);
    }, []);

    /**
     * Calback for clicks in the map model list
     * @param node The clicked node (3D model)
     */
    function mapNodeClicked( node: TreeNodeInfo<ModelObject> ) {
        if (node.nodeData === undefined || mapName === undefined) return;
        console.log(`Showing 3D model "${node.id}"`);
        setModel(Object.assign({ isMapModel: true }, node.nodeData) as SelectedModelObject);
    }

    /**
     * Calback for deletion clicks on a map model object
     * @param node The clicked node (3D model)
     */
    function removeModelFromMap( node: TreeNodeInfo<ModelObject> ) {
        if (node.nodeData === undefined || mapName === undefined) return;
        apiManager.removeModelFromMap(mapName, node.nodeData.modelPath)
            .then(() => setMapNodes((_mapNodes||[]).filter( n => n.id !== node.id )))
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
            setBrowserNodes((_browserNodes||[]).concat());
        } else {
            console.log(`Showing 3D model "${node.id}"`);
            setModel(Object.assign({ isMapModel: false }, node.nodeData) as SelectedModelObject);
        }
    }

    /**
     * Calback to add a 3D model to the map
     * @param node The clicked node (3D model or folder)
     */
    function addModelToMap( node: TreeNodeInfo<ModelObject> ) {
        if (mapName === undefined || node.nodeData === undefined || node.nodeData.hasTexture === undefined) return;
        if ((_mapNodes||[]).findIndex(n => n.id === node.id) !== -1) {
            showMessage(`Already added "${node.id}" to "${mapName}"...`, "warning");
            return;
        }
        const _node = Object.assign({}, node);
        _node.nodeData = Object.assign({}, node.nodeData);
        _node.nodeData!.modelPath = node.nodeData!.modelPath.substring(node.nodeData!.modelPath.lastIndexOf(":")+1);
        _node.secondaryLabel = <Icon icon="trash" intent="danger" onClick={(e) => { e.stopPropagation(); removeModelFromMap(_node); return false; }} />
        apiManager.addModelToMap(mapName, node.nodeData.modelPath, node.nodeData.hasTexture ? node.nodeData.modelPath : undefined)
            .then(() => setMapNodes((_mapNodes||[]).concat([_node])))
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
            modelNode = (
                <Model
                    modelUrl={apiManager.getModelUrl("mesh", model.modelPath, model.isMapModel ? mapName : undefined)}
                    textureUrl={model.hasTexture ? apiManager.getModelUrl("texture", model.modelPath, model.isMapModel ? mapName : undefined) : undefined}
                />
            );
        }
    }

    return (
        <>
            <Page
                title="Model Browser"
                style={{ display: "flex", flexDirection: "row", flex: 1, gap: "2em", padding: "2em" }}
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
                <Card style={{ minWidth: "30em", padding: 0, display: "flex", flexDirection: "column" }} elevation={Elevation.THREE} >
                    <h2 style={{ textAlign: "center" }}>{mapName}</h2>
                    <div style={{ overflowY: "scroll", flex: 1, borderTop: "1px solid lightgrey" }}>
                        <Tree
                            contents={mapNodes||[]}
                            onNodeExpand={mapNodeClicked}
                            onNodeCollapse={mapNodeClicked}
                            onNodeClick={mapNodeClicked}
                        />
                    </div>
                </Card>
                <Card style={{ minWidth: "30em", padding: 0, display: "flex", flexDirection: "column" }} elevation={Elevation.THREE} >
                    <h2 style={{ textAlign: "center" }}>Model Browser</h2>
                    <div style={{ overflowY: "scroll", flex: 1, borderTop: "1px solid lightgrey" }}>
                        <Tree
                            contents={browserNodes||[]}
                            onNodeExpand={browserNodeClicked}
                            onNodeCollapse={browserNodeClicked}
                            onNodeClick={browserNodeClicked}
                        />
                    </div>
                </Card>
                <Card style={{ flex: 3, padding: 0 }} elevation={Elevation.THREE}>
                    <h2 style={{ textAlign: "center" }}>{model ? model.modelPath.substring(model.modelPath.lastIndexOf(":")+1) : "Select a model..."}</h2>
                    <Canvas style={{ borderTop: "1px solid lightgrey" }}>
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