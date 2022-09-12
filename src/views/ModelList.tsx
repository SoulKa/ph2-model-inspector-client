import { Button, Card, ContextMenu, Elevation, Icon, InputGroup, Menu, MenuItem, Tree, TreeNodeInfo } from "@blueprintjs/core";
import { FileNodeObject, FileNodeType, ModelObject } from "../types";
import { useEffect, useState } from "react";
import Page from "../components/Page";
import { Canvas } from "@react-three/fiber";
import CameraController from "../components/CameraController";
import { Model } from "../components/Model";
import { StorageManager } from "../manager/StateManager";
import { handleError } from "../classes/Toaster";
import { Vector3 } from "three";
import FileBrowser from "../components/FileBrowser";
import { ModelManager } from "../manager/ModelManager";
import { ApiManager } from "../manager/ApiManager";

declare type ModelTreeNode = TreeNodeInfo<FileNodeObject>;

const storageManager = StorageManager.instance;
const modelManager = ModelManager.instance;
const apiManager = ApiManager.instance;

/**
 * A centralized function to render model icons for the tree view
 * @param hasTexture If true, the model icon is colored
 * @returns The Icon JSX.Element
 */
function renderModelTextureIndicatorIcon( hasTexture: boolean ) {
    return <Icon icon="cube" intent={hasTexture ? "primary" : "none"} style={{ marginRight: ".5em" }} />;
}

/**
 * Transforms the given folder/file structure in tree nodes to display
 * @param dir The files and directories
 * @param icon A callback that generates an icon depending on the node
 * @param path [INTERNAL]: The current index path. Is used to create unique IDs
 * @param parentNode [INTERNAL]: The parent file node object
 * @param hasCustomTexture [INTERNAL]: If true, some parent node has set a custom texture
 * @returns The tree nodes to render
 */
function folderToTreeNodes( dir: FileNodeObject[], oldNodes?: ModelTreeNode[], icon?: (node: ModelTreeNode) => JSX.Element|undefined, path = "", parentNode?: FileNodeObject, hasCustomTexture = false ) {
    const nodes = [] as ModelTreeNode[];

    for ( const [index, info] of dir.entries() ) {
        const node = {
            id: path+index,
            label: info.name,
            nodeData: info
        } as ModelTreeNode;
        node.nodeData!.parent = parentNode;

        // check filenode type
        switch (info.type) {
            case FileNodeType.DIRECTORY:
                const oldNode = oldNodes === undefined ? undefined : oldNodes[index];
                node.isExpanded = oldNode?.isExpanded;
                node.childNodes = folderToTreeNodes(info.children, oldNode?.childNodes, icon, path, info, info.customTexturePath !== undefined);
                node.icon = node.isExpanded ? "folder-open" : "folder-close";
                break;
                
            case FileNodeType.MODEL:
                node.icon = renderModelTextureIndicatorIcon(hasCustomTexture || info.customTexturePath !== undefined || info.texturePath !== undefined);
                break;

            default: continue; // never
        }
        
        // use callback for icon generation
        if (icon !== undefined) node.secondaryLabel = icon(node);
        nodes.push(node);
    };

    return nodes;
}

let _model : ModelObject|undefined;
export default function ModelList() {
    
    const [loading, setLoading] = useState(false);
    const [mapNodes, setMapNodes] = useState<ModelTreeNode[]>();
    const [browserNodes, setBrowserNodes] = useState<ModelTreeNode[]>();
    const [model, setModel] = useState<ModelObject>();
    const [directoryInput, setDirectoryInput] = useState(storageManager.getAppState("modelDirectory")||"");
    const [showDirectoryBrowser, setShowDirectoryBrowser] = useState(false);
    const [textureBrowserNode, setTextureBrowserNode] = useState<ModelTreeNode>();
    _model = model;

    const mapName = storageManager.getAppState("mapName");

    // on first component mount: load models if the path is given
    useEffect(() => {
        Promise.all([
            loadModels(),
            loadMapModels()
        ])
            .then(() => { updateModels(); updateMapModels(); })
            .catch(handleError); // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function getModelIcon( node: ModelTreeNode ) {
        if (node.nodeData!.type !== FileNodeType.MODEL) return;
        return <Button icon="cube-add" intent="success" onClick={(e) => { e.stopPropagation(); addModelToMap(node); return false; }} minimal/>;
    }

    function getMapModelIcon( node: ModelTreeNode ) {
        return <Button icon="trash" intent="danger" onClick={(e) => { e.stopPropagation(); removeModelFromMap(node); return false; }} minimal/>;
    }

    function updateModels() {
        setBrowserNodes( folderToTreeNodes( modelManager.getModels(), browserNodes, getModelIcon ) );
    }

    function updateMapModels() {
        setMapNodes( folderToTreeNodes( modelManager.getMapModels(), mapNodes, getMapModelIcon ) );
    }

    /**
     * Loads the model index for the currently selected directory
     */
    async function loadModels( directory?: string ) {
        if (directory === undefined) directory = directoryInput;
        if (directory.trim() === "") return;

        setLoading(true);
        try {
            if (await modelManager.loadModels(directory)) updateModels();
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
            if (await modelManager.loadMapModels()) updateMapModels();
        } catch(e) {
            handleError(e);
        }
    }

    /**
     * Calback for deletion clicks on a map model object
     * @param node The clicked node (3D model)
     */
    function removeModelFromMap( node: ModelTreeNode ) {
        const info = node.nodeData!;
        if (info.type !== FileNodeType.MODEL) return;
        modelManager.removeModelFromMap( info.path )
            .then(() => {
                if (_model !== undefined && _model.path === info.path) setModel(undefined); // hide when deleting current model
                updateMapModels();
            })
            .catch(handleError);
    }

    /**
     * Displays the given model in the ThreeJS canvas
     * @param model The model to render
     */
    function displayModel( model: ModelObject ) {
        model = { ...model }; // clone to prevent modification of original
        console.log(`Showing 3D model "${model.name}"`);
        model.texturePath = ModelManager.extractTexturePath(model);
        setModel(model);
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
                setBrowserNodes(browserNodes!.slice());
                break;

            case FileNodeType.MODEL:
                displayModel(info);
                break;
        }
    }

    /**
     * Sets the texture for the currently right clicked model or directory
     * @param filepath The filepath to the texture
     */
    async function setTexture( filepath: string ) {
        if (textureBrowserNode === undefined) return;
        const info = textureBrowserNode.nodeData!;
        
        try {
            await modelManager.setTexture(info.path, filepath);
            updateModels();
            setTextureBrowserNode(undefined);
            if (model !== undefined) displayModel(modelManager.getModel(model.path)!);
        } catch(e) {
            handleError(e);
        }
        
    }

    /**
     * Removes a custom texture from a model or directory
     * @param node The clicked model or directory
     */
    async function removeTexture( node: ModelTreeNode ) {
        const info = node.nodeData!;
        try {
            await modelManager.removeTexture(info.path);
            updateModels();
            if (model !== undefined) displayModel(modelManager.getModel(model.path)!);
        } catch(e) {
            handleError(e);
        }
    }

    /**
     * Callback for right clicks on a browser node
     * @param node The node that was clicked
     * @param event The mouse event that includes the mouse position
     */
    function openMenu( node: ModelTreeNode, event: React.MouseEvent<HTMLElement, MouseEvent> ) {
        event.preventDefault();

        const items = [
            <MenuItem
                text="Set custom texture"
                onClick={() => setTextureBrowserNode(node)}
            />
        ] as JSX.Element[];

        if (node.nodeData!.customTexturePath !== undefined) {
            items.push(
                <MenuItem
                    text="Remove custom texture"
                    onClick={() => removeTexture(node)}
                    intent="danger"
                />
            );
        }

        ContextMenu.show(
            <Menu children={items} />,
            { left: event.clientX, top: event.clientY }
        );
    }

    /**
     * Calback to add a 3D model to the map
     * @param node The clicked node
     */
    function addModelToMap( node: ModelTreeNode ) {
        const info = node.nodeData!;
        if (mapName === undefined || info.type !== FileNodeType.MODEL) return;
        modelManager.addModelToMap(info.path).then(updateMapModels).catch(handleError);
    }

    let textureBrowserNodeDirectory : string|undefined;
    if (textureBrowserNode !== undefined) {
        const info = textureBrowserNode.nodeData!;
        switch (info.type) {
            case FileNodeType.DIRECTORY: textureBrowserNodeDirectory = info.path; break;
            case FileNodeType.MODEL: textureBrowserNodeDirectory = info.path.substring(0, info.path.lastIndexOf(apiManager.osInfo.delimiter)); break;
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
                            value={directoryInput}
                            placeholder="Paste your model directory path here..."
                            leftElement={<Button onClick={() => setShowDirectoryBrowser(true)} disabled={loading} icon="folder-open" minimal />}
                            rightElement={<Button text={loading ? "Loading..." : "Load Models"} onClick={() => loadModels()} disabled={loading} />}
                            onChange={s => setDirectoryInput(s.target.value)}
                            disabled={loading}
                            style={{ minWidth: "30em" }}
                        />
                    </>
                }
            >
                <FileBrowser
                    isOpen={textureBrowserNode !== undefined}
                    initialDirectory={textureBrowserNodeDirectory}
                    onSubmit={setTexture}
                    onClose={() => setTextureBrowserNode(undefined)}
                    fileExtensions={[".png"]}
                />
                <FileBrowser
                    isOpen={showDirectoryBrowser}
                    initialDirectory={directoryInput}
                    onClose={() => setShowDirectoryBrowser(false)}
                    onSubmit={(dir) => { setShowDirectoryBrowser(false); loadModels(dir); }}
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
                            onNodeContextMenu={(node, path, e) => openMenu(node, e)}
                        />
                    </div>
                </Card>
                <Card style={{ flex: 3, padding: 0 }} elevation={Elevation.THREE}>
                    <h2 style={{ textAlign: "center" }}>{model ? model.name : "Select a model..."}</h2>
                    <Canvas style={{ borderTop: "1px solid lightgrey" }}>
                        <CameraController />
                        <pointLight position={new Vector3(25, 25, 25)} intensity={0.6} />
                        <pointLight position={new Vector3(-25, -25, -25)} intensity={0.6} />
                        {model === undefined ? null :<Model modelUrl={apiManager.getFileUrl(model.path)!} textureUrl={apiManager.getFileUrl(model.texturePath)} />}
                    </Canvas>
                </Card>
            </Page>
        </>
    );
}