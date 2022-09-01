import { Card, Elevation } from "@blueprintjs/core";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { handleError } from "../classes/Toaster";
import Page from "../components/Page";
import { ApiManager } from "../manager/ApiManager";
import { StorageManager } from "../manager/StateManager";

const apiManager = ApiManager.instance;
const storageManager = StorageManager.instance;

export default function MapSelection() {

    const [maps, setMaps] = useState<string[]>();
    const navigate = useNavigate();

    // load maps
    if (maps === undefined) apiManager.getMaps().then(setMaps).catch(handleError);

    return (
        <Page>
            {maps?.map( mapName => (
                <Card
                    style={{ maxWidth: "40em", float: "left", margin: "2em" }}
                    onClick={() => { storageManager.updateAppState("mapName", mapName); navigate("/browser"); }}
                    elevation={Elevation.THREE}
                    key={mapName}
                    interactive
                >
                    <h2>{mapName}</h2>
                    <br/>
                    <img src={apiManager.getMapImageUrl(mapName)} alt="Map Preview" style={{ maxHeight: "100%", maxWidth: "100%" }} />
                </Card>
            ))}
        </Page>
    );
}