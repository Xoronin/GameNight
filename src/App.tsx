import { MotionConfig } from "motion/react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ConnectionBanner from "./components/ConnectionBanner";
import CreateRoom from "./pages/CreateRoom";
import GamePage from "./pages/GamePage";
import Home from "./pages/Home";
import JoinRoom from "./pages/JoinRoom";
import Lobby from "./pages/Lobby";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SpotifyCallback from "./pages/SpotifyCallback";

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ConnectionBanner />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/create" element={<CreateRoom />} />
          <Route path="/join" element={<JoinRoom />} />
          <Route path="/lobby/:roomCode" element={<Lobby />} />
          <Route path="/game/:gameId" element={<GamePage />} />

          <Route
            path="/spotify-callback"
            element={<SpotifyCallback />}
          />
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  );
}

export default App;