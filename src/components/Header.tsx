import { Button, InputGroup, Navbar } from "@blueprintjs/core";
import { useSearchParams } from "react-router-dom";
import { ModelFolderObject } from "../../types";
import { ApiManager } from "../manager/ApiManager";

const apiManager = ApiManager.instance;

export type HeaderProps = {
    onModelsLoaded?: (models: ModelFolderObject) => void
};

export default function Header( props: HeaderProps ) {
    const [query, setQuery] = useSearchParams();
    apiManager.modelDirectory = query.get("modelDirectory")||undefined;

    return (
        <Navbar fixedToTop>
            <Navbar.Group>
                <Navbar.Heading>PH2 Model Inspector</Navbar.Heading>
                <Navbar.Divider />
                <InputGroup
                    defaultValue={query.get("modelDirectory")||undefined}
                    placeholder="Paste your model directory path here..."
                    rightElement={<Button text="Load Models" onClick={async () => {
                        if (apiManager.modelDirectory === undefined) return;
                        setQuery({ modelDirectory: apiManager.modelDirectory });
                        if (props.onModelsLoaded) props.onModelsLoaded(await apiManager.getModels(apiManager.modelDirectory));
                    }} />}
                    onChange={s => apiManager.modelDirectory = s.target.value}
                />
            </Navbar.Group>
        </Navbar>
    );
}