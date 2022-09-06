import { Button, Card, ContextMenu, Elevation, Icon, InputGroup, Menu, MenuItem, Tree, TreeNodeInfo } from "@blueprintjs/core";
import { FileNodeObject, FileNodeType, ModelFolderObject, ModelObject } from "../types";
import { useEffect, useState } from "react";
import Page from "../components/Page";
import { Canvas } from "@react-three/fiber";
import CameraController from "../components/CameraController";
import { Model } from "../components/Model";
import { ApiManager } from "../manager/ApiManager";
import { StorageManager } from "../manager/StateManager";
import { handleError, showMessage } from "../classes/Toaster";
import { Vector3 } from "three";
import { crawl } from "../classes/Util";
import FileBrowser from "../components/FileBrowser";

declare type ModelTreeNode = TreeNodeInfo<FileNodeObject>;

const apiManager = ApiManager.instance;
const storageManager = StorageManager.instance;

function folderToTreeNodes( dir: ModelFolderObject, icon?: (node: ModelTreeNode) => JSX.Element|undefined, path = "" ) {
    const nodes = [] as ModelTreeNode[];

    let fileCount = 0;
    let dirCount = 0;
    for ( const [index, info] of dir.entries() ) {
        const node = {
            id: path+index,
            label: info.name,
            nodeData: { name: info.name }
        } as ModelTreeNode;

        // check filenode type
        switch (info.type) {
            case FileNodeType.DIRECTORY:
                const { nodes: subnodes, fileCount: fc, dirCount: dc } = folderToTreeNodes(info.children, icon, path);
                node.nodeData!.type = FileNodeType.DIRECTORY;
                node.childNodes = subnodes;
                node.icon = "folder-close";
                dirCount += 1 + dc;
                fileCount += fc;
                break;
                
                case FileNodeType.MODEL:
                node.nodeData!.type = FileNodeType.MODEL;
                (node.nodeData as ModelObject).modelPath = info.modelPath;
                (node.nodeData as ModelObject).texturePath = info.texturePath;
                node.icon = <Icon icon="cube" intent={info.texturePath === undefined ? "none" : "primary"} style={{ marginRight: ".5em" }} />;
                fileCount++;
                break;

            default: continue; // never
        }
        
        // use callback for icon generation
        if (icon !== undefined) node.secondaryLabel = icon(node);
        nodes.push(node);
    };

    return { nodes, fileCount, dirCount };
}

let _mapNodes : ModelTreeNode[]|undefined;
let _browserNodes : ModelTreeNode[]|undefined;
let loadingMapModels = false;
let loadingBrowserModels = false;

export default function ModelList() {
    
    const [loading, setLoading] = useState(false);
    const [mapNodes, setMapNodes] = useState<ModelTreeNode[]>();
    const [browserNodes, setBrowserNodes] = useState<ModelTreeNode[]>();
    const [model, setModel] = useState<ModelObject>();
    const [directoryInput, setDirectoryInput] = useState(storageManager.getAppState("modelDirectory")||"");
    const [showDirectoryBrowser, setShowDirectoryBrowser] = useState(false);
    const [showTextureBrowser, setShowTextureBrowser] = useState(false);

    _mapNodes = mapNodes;
    _browserNodes = browserNodes;
    const mapName = storageManager.getAppState("mapName");

    /**
     * Loads the model index for the currently selected directory
     */
    async function loadAllModels( directory?: string ) {
        if (directory === undefined) {
            directory = directoryInput;
        } else {
            setDirectoryInput(directory);
        }
        if (directory.trim() === "") return;
        setLoading(true);
        try {
            loadingBrowserModels = true;
            const { nodes, fileCount, dirCount } = folderToTreeNodes(
                await apiManager.getModels(directory),
                node => node.nodeData!.type === FileNodeType.MODEL ? <Icon icon="cube-add" intent="success" onClick={(e) => { e.stopPropagation(); addModelToMap(node); return false; }} /> : undefined
            );
            setBrowserNodes(nodes);
            storageManager.updateAppState("modelDirectory", directory);
            showMessage(`Loaded ${fileCount} local models from ${dirCount} directories`, "success");
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
            const { nodes, fileCount } = folderToTreeNodes(await apiManager.getMapModels(mapName), node => <Icon icon="trash" intent="danger" onClick={(e) => { e.stopPropagation(); removeModelFromMap(node); return false; }} />);
            setMapNodes(nodes);
            showMessage(`Loaded ${fileCount} map models`, "success");
        } catch(e) {
            handleError(e);
        }
        loadingMapModels = false;
    }

    // on first component mount: load models if the path is given
    useEffect(() => {
        Promise.all([
            !loadingBrowserModels ? loadAllModels() : Promise.resolve(),
            !loadingMapModels ? loadMapModels() : Promise.resolve()
        ]).catch(handleError); // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Calback for deletion clicks on a map model object
     * @param node The clicked node (3D model)
     */
    function removeModelFromMap( node: ModelTreeNode ) {
        if (node.nodeData === undefined || mapName === undefined) return;
        apiManager.removeModelFromMap(mapName, node.nodeData.name )
            .then(() => setMapNodes((_mapNodes||[]).filter( n => n.id !== node.id )))
            .catch(handleError);
    }

    /**
     * Calback for clicks in the model or map browser
     * @param node The clicked node (3D model or folder)
     */
    function nodeClicked( node: ModelTreeNode ) {
        const info = node.nodeData!;
        switch (info.type) {
            case FileNodeType.DIRECTORY:
                node.isExpanded = !node.isExpanded;
                node.icon = node.isExpanded ? "folder-open" : "folder-close";
                setBrowserNodes((_browserNodes||[]).concat());
                break;

            case FileNodeType.MODEL:
                console.log(`Showing 3D model "${info.name}"`);
                setModel(info);
                break;
        }
    }

    /**
     * Calback for right clicks in the map browser
     * @param node The clicked node (3D model or folder)
     */
    function openMenu( nodes: ModelTreeNode[], node: ModelTreeNode, path: number[], event: React.MouseEvent<HTMLElement, MouseEvent> ) {
        event.preventDefault();

        const info = node.nodeData!;
        let content = null as JSX.Element|null;
        switch (info.type) {
            case FileNodeType.DIRECTORY:
                break;

            case FileNodeType.MODEL:
                
                break;
            
            default: return;
        }

        ContextMenu.show(
            <Menu>
                <MenuItem
                    text="Set Texture"
                    onClick={() => {


                        /*crawl(
                            path.reduce( (n, i) => n[i].childNodes!, nodes ),
                            n => {
                                const info = n.nodeData!;
                                if (info.type === FileNodeType.MODEL) info.texturePath = "//FILEPATHOFTEXTUER"
                                return n.childNodes||[];
                            }
                        );*/
                    }}
                />
            </Menu>,
            { left: event.clientX, top: event.clientY }
        )
    }

    /**
     * Calback to add a 3D model to the map
     * @param node The clicked node (3D model or folder)
     */
    function addModelToMap( node: ModelTreeNode ) {
        const info = node.nodeData!;
        if (mapName === undefined || info.type !== FileNodeType.MODEL) return;
        if ((_mapNodes||[]).findIndex(n => n.id === node.id) !== -1) {
            showMessage(`Already added "${node.id}" to "${mapName}"...`, "warning");
            return;
        }
        apiManager.addModelToMap(mapName, info)
            .then(() => {
                const _node = Object.assign({}, node);
                _node.nodeData = Object.assign({}, info);
                _node.secondaryLabel = <Icon icon="trash" intent="danger" onClick={(e) => { e.stopPropagation(); removeModelFromMap(_node); return false; }} />
                setMapNodes((_mapNodes||[]).concat([_node]));
            })
            .catch(handleError);
    }


    return (
        <>
            <Page
                title="Model Browser"
                style={{ display: "flex", flexDirection: "row", flex: 1, gap: "2em", padding: "2em" }}
                headerComponents={
                    <>
                        <InputGroup
                            value={directoryInput}
                            placeholder="Paste your model directory path here..."
                            leftElement={<Button onClick={() => setShowDirectoryBrowser(true)} disabled={loading} icon="folder-open" minimal />}
                            rightElement={<Button text={loading ? "Loading..." : "Load Models"} onClick={() => loadAllModels()} disabled={loading} />}
                            onChange={s => setDirectoryInput(s.target.value)}
                            disabled={loading}
                            style={{ minWidth: "30em" }}
                        />
                    </>
                }
            >
                <FileBrowser
                    isOpen={showDirectoryBrowser}
                    initialDirectory={directoryInput}
                    onClose={() => setShowDirectoryBrowser(false)}
                    onSubmit={(dir) => { setShowDirectoryBrowser(false); loadAllModels(dir); }}
                    directoriesOnly
                />
                <Card style={{ minWidth: "30em", padding: 0, display: "flex", flexDirection: "column" }} elevation={Elevation.THREE} >
                    <h2 style={{ textAlign: "center" }}>Map ({mapName||"No map selected"})</h2>
                    <div style={{ overflowY: "scroll", flex: 1, borderTop: "1px solid lightgrey" }}>
                        <Tree
                            contents={mapNodes||[]}
                            onNodeClick={nodeClicked}
                        />
                    </div>
                </Card>
                <Card style={{ minWidth: "30em", padding: 0, display: "flex", flexDirection: "column" }} elevation={Elevation.THREE} >
                    <h2 style={{ textAlign: "center" }}>Model browser</h2>
                    <div style={{ overflowY: "scroll", flex: 1, borderTop: "1px solid lightgrey" }}>
                        <Tree
                            contents={browserNodes||[]}
                            onNodeExpand={nodeClicked}
                            onNodeCollapse={nodeClicked}
                            onNodeClick={nodeClicked}
                        />
                    </div>
                </Card>
                <Card style={{ flex: 3, padding: 0 }} elevation={Elevation.THREE}>
                    <h2 style={{ textAlign: "center" }}>{model ? model.name : "Select a model..."}</h2>
                    <Canvas style={{ borderTop: "1px solid lightgrey" }}>
                        <CameraController />
                        <pointLight position={new Vector3(25, 25, 25)} intensity={0.6} />
                        <pointLight position={new Vector3(-25, -25, -25)} intensity={0.6} />
                        {model === undefined ? null :<Model modelUrl={apiManager.getFileUrl(model.modelPath)} textureUrl={model.texturePath ? apiManager.getFileUrl(model.texturePath) : undefined} />}
                    </Canvas>
                </Card>
            </Page>
        </>
    );
}