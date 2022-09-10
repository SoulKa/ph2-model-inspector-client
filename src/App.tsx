import "./App.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import MapSelection from "./views/MapSelection";
import ModelList from "./views/ModelList";
import { useEffect, useState } from "react";
import { ApiManager } from "./manager/ApiManager";
import { handleError } from "./classes/Toaster";

const apiManager = ApiManager.instance;

function App() {
    const [isLoading, setLoading] = useState(true);

    useEffect(() => {
        apiManager.initialize().then(() => setLoading(false)).catch(handleError);
    }, [isLoading]);
    if (isLoading) return null;

    return (
        <Router>            
            <Routes>
                <Route path="/" element={<MapSelection/>} />
                <Route path="/browser" element={<ModelList/>} />
            </Routes>
        </Router>
    );
}

export default App;