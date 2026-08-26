import { useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
    createPlayer,
    createRoomCode,
    savePlayer,
} from "../utils/gameUtils";
import "../styles/lobby.css";

function CreateRoom() {
    const navigate = useNavigate();
    const [name, setName] = useState("");

    const submit = () => {
        const cleanedName = name.trim();

        if (!cleanedName) {
            return;
        }

        const player = createPlayer(cleanedName, true);
        const roomCode = createRoomCode();

        savePlayer(player);
        navigate(`/lobby/${roomCode}`);
    };

    return (
        <div className="page">
            <button className="backButton" onClick={() => navigate("/")}>
                <ArrowLeft size={18} />
                Home
            </button>

            <div className="centerCard">
                <span className="eyebrow">CREATE ROOM</span>

                <h1>Who's playing?</h1>

                <p>
                    Enter your name. You'll become the host of the new room.
                </p>

                <form
                    className="joinForm"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    <label className="inputLabel" htmlFor="player-name">
                        Your name
                    </label>

                    <input
                        id="player-name"
                        className="normalInput"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Merlin"
                        maxLength={20}
                        autoFocus
                    />

                    <button
                        className="primaryButton formButton"
                        type="submit"
                        disabled={!name.trim()}
                    >
                        Create Room
                        <ChevronRight size={19} />
                    </button>
                </form>
            </div>
        </div>
    );
}

export default CreateRoom;