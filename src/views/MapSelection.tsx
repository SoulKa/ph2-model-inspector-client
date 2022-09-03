import { Button, Card, Elevation } from "@blueprintjs/core";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { handleError } from "../classes/Toaster";
import Page from "../components/Page";
import { ApiManager, APP_ENDPOINT } from "../manager/ApiManager";
import { StorageManager } from "../manager/StateManager";

const apiManager = ApiManager.instance;
const storageManager = StorageManager.instance;

export default function MapSelection() {

    const [maps, setMaps] = useState<string[]>();
    const navigate = useNavigate();

    const selectMap = useCallback(( mapName?: string ) => {
        storageManager.updateAppState("mapName", mapName);
        navigate(APP_ENDPOINT.MODEL_BROWSER);
    }, [navigate]);

    // redirect to model browser if no maps exist
    useEffect(() => {
        if (maps === undefined) apiManager.getMaps().then(setMaps).catch(handleError);
        else if (maps.length === 0) selectMap();
    }, [maps, selectMap]);

    return (
        <Page
            title="Map Selection"
            headerComponents={<Button onClick={() => selectMap()} icon="step-forward" minimal>Skip Map Selection</Button>}
        >
            <div style={{ overflowY: "scroll", maxHeight: "100%", justifyContent: "center", flexDirection: "column" }} >
                {maps?.map( mapName => (
                    <Card
                        style={{ maxWidth: "40em", float: "left", margin: "2em" }}
                        onClick={() => selectMap(mapName)}
                        elevation={Elevation.THREE}
                        key={mapName}
                        interactive
                    >
                        <h2 style={{ textAlign: "center" }}>{mapName}</h2>
                        <br/>
                        <img
                            src={apiManager.getMapImageUrl(mapName)}
                            alt={mapName + " - Map Preview"}
                            style={{ maxHeight: "100%", maxWidth: "100%" }}
                            onError={({ currentTarget }) => { currentTarget.onerror = null; currentTarget.src = "/default-map-image.png"; }}
                        />
                    </Card>
                ))}
            </div>
        </Page>
    );
}