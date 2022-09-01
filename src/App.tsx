import "./App.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import MapSelection from "./views/MapSelection";
import ModelList from "./views/ModelList";

function App() {
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