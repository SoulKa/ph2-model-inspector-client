import { Card, Elevation } from "@blueprintjs/core";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Page from "../components/Page";
import { ApiManager } from "../manager/ApiManager";

const apiManager = ApiManager.instance;



export default function MapSelection() {

    const [maps, setMaps] = useState<string[]>();
    const navigate = useNavigate();

    // load maps
    if (maps === undefined) {
        apiManager.getMaps().then(setMaps);
    }

    return (
        <Page>
            {maps?.map( mapName => (
                <Card
                    style={{ maxWidth: "40em", float: "left", margin: "2em" }}
                    onClick={() => navigate("/browser?map="+mapName)}
                    elevation={Elevation.THREE}
                    key={mapName}
                    interactive
                >
                    <h2>{mapName}</h2>
                    <br/>
                    <img src={apiManager.getMapImageUrl(mapName)} style={{ maxHeight: "100%", maxWidth: "100%" }} />
                </Card>
            ))}
        </Page>
    );
}