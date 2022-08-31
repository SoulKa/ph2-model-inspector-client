import "./App.css";
import { BrowserRouter as Router, Route, Routes, useSearchParams } from "react-router-dom";
import MapSelection from "./views/MapSelection";
import ModelList from "./views/ModelList";
import { Button, FileInput, InputGroup, Navbar } from "@blueprintjs/core";
import { FormEvent, useState } from "react";
import { ApiManager } from "./manager/ApiManager";
import { ModelFolderObject } from "../types";
import Header from "./components/Header";



function App() {

    
    const [models, setModels] = useState({} as ModelFolderObject);

    return (
        <Router>
            <Header onModelsLoaded={setModels} />
            
            <Routes>
                <Route path="/" element={<MapSelection/>} />
                <Route path="/browser" element={<ModelList models={models}/>} />
            </Routes>
        </Router>
    );

}

export default App;