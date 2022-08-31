import { Card, Elevation, Navbar, Tree, TreeNodeInfo } from "@blueprintjs/core";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ModelFolderObject } from "../../types";
import { useEffect, useState } from "react";
import Page from "../components/Page";
import { Canvas } from "@react-three/fiber";
import CameraController from "../components/CameraController";
import { Model, ModelWithTexture } from "../components/Model";
import { ApiManager, API_ENDPOINT } from "../manager/ApiManager";

export type ModelListProps = {
    models: ModelFolderObject
};

declare type ModelObject = {
    modelPath: string[];
    hasTexture?: boolean;
}

const apiManager = ApiManager.instance;

export default function ModelList( props: ModelListProps ) {

    const [query, setQuery] = useSearchParams();
    const [nodes, setNodes] = useState([] as TreeNodeInfo<ModelObject>[]);
    const [model, setModel] = useState<ModelObject>();
    const navigation = useNavigate();

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
                        childNodes: getChildNodes(subdir, modelPath)
                    });
                } else if (typeof subdir === "boolean") {
                    nodes.push({
                        id: name,
                        label: name.substring(0, name.length),
                        nodeData: { modelPath, hasTexture: subdir }
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
    const mapName = query.get("map");
    //if (mapName === null) navigation("/");

    // render model component
    let modelNode = null as JSX.Element|null;
    if (model !== undefined) {
        const modelPathQuery = "?modelDirectory="+apiManager.modelDirectory+"&modelPath="+model.modelPath.join(":");
        if (model.hasTexture) {
            modelNode = <ModelWithTexture modelUrl={API_ENDPOINT.MODEL_MESH+modelPathQuery} textureUrl={API_ENDPOINT.MODEL_TEXTURE+modelPathQuery} />;
        } else {
            modelNode = <Model modelUrl={API_ENDPOINT.MODEL_MESH+modelPathQuery} />;
        }
    }

    return (
        <Page style={{ display: "flex", flexDirection: "row", flex: 1 }} >
            <Card style={{ minWidth: "30em", margin: "1em", padding: 0, overflowY: "scroll" }} elevation={Elevation.THREE} >
                <Tree
                    contents={nodes}
                    className="full-height"
                    onNodeExpand={node => { node.isExpanded = true; setNodes(nodes.concat()); }}
                    onNodeCollapse={node => { node.isExpanded = false; setNodes(nodes.concat()); }}
                    onNodeClick={node => setModel(node.nodeData)}
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