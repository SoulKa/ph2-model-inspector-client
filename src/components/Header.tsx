import { Button, InputGroup, Navbar } from "@blueprintjs/core";
import { useEffect, useState } from "react";
import { ModelFolderObject } from "../../types";
import { ApiManager } from "../manager/ApiManager";
import { StorageManager } from "../manager/StateManager";

const apiManager = ApiManager.instance;
const storageManager = StorageManager.instance;

export type HeaderProps = {
    onModelsLoaded?: (models: ModelFolderObject) => void
};

export default function Header( props: HeaderProps ) {
    apiManager.modelDirectory = storageManager.getAppState("modelDirectory");

    const [loading, setLoading] = useState(false);

    async function loadModels() {
        if (apiManager.modelDirectory === undefined) return;
        setLoading(true);
        storageManager.updateAppState("modelDirectory", apiManager.modelDirectory);
        if (props.onModelsLoaded) props.onModelsLoaded(await apiManager.getModels(apiManager.modelDirectory));
        setLoading(false);
    }

    // on first component mount: load models if the path is given
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { if (apiManager.modelDirectory !== undefined) loadModels().catch(); }, []);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return (
        <Navbar fixedToTop>
            <Navbar.Group>
                <Navbar.Heading>PH2 Model Inspector</Navbar.Heading>
                <Navbar.Divider />
                <InputGroup
                    defaultValue={apiManager.modelDirectory||undefined}
                    placeholder="Paste your model directory path here..."
                    rightElement={<Button text={loading ? "Loading..." : "Load Models"} onClick={loadModels} disabled={loading} />}
                    onChange={s => apiManager.modelDirectory = s.target.value}
                    disabled={loading}
                    style={{ minWidth: "30em" }}
                />
            </Navbar.Group>
        </Navbar>
    );
}