import { BrowserRouter, Route, Routes } from "react-router-dom";
import CreateRoom from "./pages/CreateRoom";
import GamePage from "./pages/GamePage";
import Home from "./pages/Home";
import JoinRoom from "./pages/JoinRoom";
import Lobby from "./pages/Lobby";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />

                <Route
                    path="/create"
                    element={<CreateRoom />}
                />

                <Route
                    path="/join"
                    element={<JoinRoom />}
                />

                <Route
                    path="/lobby/:roomCode"
                    element={<Lobby />}
                />

                <Route
                    path="/game/:gameId"
                    element={<GamePage />}
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;