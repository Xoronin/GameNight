import { useState } from "react";
import { ArrowLeft, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPlayer, savePlayer } from "../utils/gameUtils";
import "../styles/lobby.css";

function JoinRoom() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [roomCode, setRoomCode] = useState("");

    const submit = () => {
        const cleanedName = name.trim();
        const cleanedCode = roomCode.trim().toUpperCase();

        if (!cleanedName || !cleanedCode) {
            return;
        }

        const player = createPlayer(cleanedName, false);

        savePlayer(player);
        navigate(`/lobby/${cleanedCode}`);
    };

    return (
        <div className="page">
            <button className="backButton" onClick={() => navigate("/")}>
                <ArrowLeft size={18} />
                Home
            </button>

            <div className="centerCard">
                <span className="eyebrow">JOIN A GAME</span>

                <h1>Join a room</h1>

                <p>
                    Enter your name and the room code shown on the host's screen.
                </p>

                <form
                    className="joinForm"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    <label className="inputLabel" htmlFor="join-name">
                        Your name
                    </label>

                    <input
                        id="join-name"
                        className="normalInput"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Your name"
                        maxLength={20}
                        autoFocus
                    />

                    <label className="inputLabel" htmlFor="room-code">
                        Room code
                    </label>

                    <input
                        id="room-code"
                        className="roomInput"
                        value={roomCode}
                        onChange={(event) =>
                            setRoomCode(event.target.value.toUpperCase())
                        }
                        placeholder="ABCD"
                        maxLength={6}
                    />

                    <button
                        className="primaryButton formButton"
                        type="submit"
                        disabled={!name.trim() || !roomCode.trim()}
                    >
                        <LogIn size={18} />
                        Join Room
                    </button>
                </form>
            </div>
        </div>
    );
}

export default JoinRoom;