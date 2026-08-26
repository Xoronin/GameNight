import {
    ArrowRight,
    Check,
    CircleHelp,
    Crown,
    RotateCcw,
    Sparkles,
    Trophy,
    X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { bluffQuestions } from "../../data/bluffQuestions";
import type {
    BluffAnswerOption,
    BluffPhase,
    BluffRoundResult,
} from "../../types/game";
import { getPlayer } from "../../utils/gameUtils";
import "../../styles/bluff.css";

const simulatedFakeAnswers: Record<string, string[]> = {
    q1: [
        "Lexiverbophobia",
        "Sesquipedalophobia",
        "Logolongophobia",
    ],
    q2: [
        "Evaporation",
        "Leaf diffusion",
        "Photosorption",
    ],
    q3: [
        "Finland",
        "Russia",
        "Norway",
    ],
    q4: [
        "Explorer Zero",
        "Luna One",
        "Vostok Prime",
    ],
    q5: [
        "Valve",
        "Nordic Games",
        "Jagex",
    ],
    q6: [
        "Adamantium",
        "Titanium-X",
        "Promethium",
    ],
    q7: [
        "Chimpanzee",
        "Raccoon",
        "Red panda",
    ],
    q8: [
        "Parsley",
        "Spinach",
        "Rocket",
    ],
};

function shuffle<T>(items: T[]) {
    return [...items].sort(() => Math.random() - 0.5);
}

function BluffGame() {
    const player = getPlayer();

    const [roundIndex, setRoundIndex] = useState(0);
    const [phase, setPhase] = useState<BluffPhase>("question");

    const [fakeAnswer, setFakeAnswer] = useState("");
    const [options, setOptions] = useState<BluffAnswerOption[]>([]);

    const [selectedAnswerId, setSelectedAnswerId] =
        useState<string | null>(null);

    const [score, setScore] = useState(0);

    const [result, setResult] =
        useState<BluffRoundResult | null>(null);

    const currentQuestion = bluffQuestions[roundIndex];

    const progress = useMemo(() => {
        return `${roundIndex + 1} / ${bluffQuestions.length}`;
    }, [roundIndex]);

    const submitFakeAnswer = () => {
        const cleaned = fakeAnswer.trim();

        if (!cleaned) {
            return;
        }

        const fakePool =
            simulatedFakeAnswers[currentQuestion.id] ?? [];

        const answerOptions: BluffAnswerOption[] = [
            {
                id: "correct",
                text: currentQuestion.answer,
                isCorrect: true,
            },
            {
                id: "player",
                text: cleaned,
                isCorrect: false,
                author: player?.name ?? "You",
            },
            ...fakePool.map((answer, index) => ({
                id: `fake-${index}`,
                text: answer,
                isCorrect: false,
                author: `Player ${index + 2}`,
            })),
        ];

        setOptions(shuffle(answerOptions));
        setPhase("vote");
    };

    const revealAnswer = () => {
        if (!selectedAnswerId) {
            return;
        }

        const selected = options.find(
            (option) => option.id === selectedAnswerId,
        );

        const correct = options.find(
            (option) => option.isCorrect,
        );

        if (!selected || !correct) {
            return;
        }

        const wasCorrect = selected.isCorrect;
        const pointsEarned = wasCorrect ? 1000 : 0;

        setScore((currentScore) => currentScore + pointsEarned);

        setResult({
            selectedAnswerId,
            correctAnswerId: correct.id,
            wasCorrect,
            pointsEarned,
        });

        setPhase("reveal");
    };

    const nextRound = () => {
        const isLastRound =
            roundIndex >= bluffQuestions.length - 1;

        if (isLastRound) {
            setPhase("finished");
            return;
        }

        setRoundIndex((current) => current + 1);

        setFakeAnswer("");
        setOptions([]);
        setSelectedAnswerId(null);
        setResult(null);

        setPhase("question");
    };

    const restartGame = () => {
        setRoundIndex(0);
        setPhase("question");
        setFakeAnswer("");
        setOptions([]);
        setSelectedAnswerId(null);
        setResult(null);
        setScore(0);
    };

    if (phase === "finished") {
        return (
            <div className="bluffGame">
                <section className="bluffFinished">
                    <div className="bluffFinishedIcon">
                        <Trophy size={40} />
                    </div>

                    <span className="eyebrow">GAME COMPLETE</span>

                    <h1>Bluff finished</h1>

                    <p>
                        Nice work. Your final score is:
                    </p>

                    <div className="finalScore">
                        {score.toLocaleString()}
                        <span>points</span>
                    </div>

                    <button
                        className="primaryButton bluffMainButton"
                        onClick={restartGame}
                    >
                        <RotateCcw size={18} />
                        Play Again
                    </button>
                </section>
            </div>
        );
    }

    return (
        <div className="bluffGame">
            <header className="bluffGameHeader">
                <div>
                    <span className="eyebrow">BLUFF</span>

                    <strong>
                        Round {progress}
                    </strong>
                </div>

                <div className="bluffScore">
                    <Crown size={17} />
                    {score.toLocaleString()}
                </div>
            </header>

            <div className="bluffProgress">
                <div
                    className="bluffProgressFill"
                    style={{
                        width: `${((roundIndex + 1) /
                                bluffQuestions.length) *
                            100
                            }%`,
                    }}
                />
            </div>

            {phase === "question" && (
                <section className="bluffPanel">
                    <div className="bluffCategory">
                        <CircleHelp size={16} />
                        {currentQuestion.category}
                    </div>

                    <h1>{currentQuestion.question}</h1>

                    <p className="bluffInstruction">
                        Write a believable fake answer. The goal is
                        to make the other players think your answer
                        is the real one.
                    </p>

                    <textarea
                        className="bluffAnswerInput"
                        value={fakeAnswer}
                        onChange={(event) =>
                            setFakeAnswer(event.target.value)
                        }
                        placeholder="Enter your fake answer..."
                        maxLength={80}
                        autoFocus
                    />

                    <div className="bluffInputFooter">
                        <span>
                            {fakeAnswer.length} / 80
                        </span>

                        <button
                            className="primaryButton bluffMainButton"
                            onClick={submitFakeAnswer}
                            disabled={!fakeAnswer.trim()}
                        >
                            Submit Answer
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </section>
            )}

            {phase === "vote" && (
                <section className="bluffPanel">
                    <div className="bluffCategory">
                        <Sparkles size={16} />
                        Find the truth
                    </div>

                    <h1>
                        Which answer is correct?
                    </h1>

                    <p className="bluffInstruction">
                        Your fake answer is mixed with the real answer
                        and answers from other players.
                    </p>

                    <div className="bluffOptions">
                        {options.map((option, index) => (
                            <button
                                key={option.id}
                                type="button"
                                className={`bluffOption ${selectedAnswerId === option.id
                                        ? "selected"
                                        : ""
                                    }`}
                                onClick={() =>
                                    setSelectedAnswerId(option.id)
                                }
                            >
                                <span className="bluffOptionLetter">
                                    {String.fromCharCode(65 + index)}
                                </span>

                                <span className="bluffOptionText">
                                    {option.text}
                                </span>

                                {selectedAnswerId === option.id && (
                                    <Check size={18} />
                                )}
                            </button>
                        ))}
                    </div>

                    <button
                        className="primaryButton bluffMainButton"
                        disabled={!selectedAnswerId}
                        onClick={revealAnswer}
                    >
                        Lock In Answer
                        <ArrowRight size={18} />
                    </button>
                </section>
            )}

            {phase === "reveal" && result && (
                <section className="bluffPanel">
                    <div
                        className={`bluffResultBanner ${result.wasCorrect
                                ? "correct"
                                : "wrong"
                            }`}
                    >
                        {result.wasCorrect ? (
                            <Check size={24} />
                        ) : (
                            <X size={24} />
                        )}

                        <div>
                            <strong>
                                {result.wasCorrect
                                    ? "Correct!"
                                    : "Not quite"}
                            </strong>

                            <span>
                                {result.wasCorrect
                                    ? `+${result.pointsEarned} points`
                                    : "No points this round"}
                            </span>
                        </div>
                    </div>

                    <h1>Round reveal</h1>

                    <div className="bluffRevealList">
                        {options.map((option) => {
                            const isSelected =
                                option.id === result.selectedAnswerId;

                            return (
                                <div
                                    key={option.id}
                                    className={`bluffRevealAnswer ${option.isCorrect
                                            ? "correct"
                                            : ""
                                        } ${isSelected
                                            ? "chosen"
                                            : ""
                                        }`}
                                >
                                    <div>
                                        <strong>
                                            {option.text}
                                        </strong>

                                        <span>
                                            {option.isCorrect
                                                ? "Real answer"
                                                : option.author ??
                                                "Fake answer"}
                                        </span>
                                    </div>

                                    {option.isCorrect && (
                                        <Check size={20} />
                                    )}

                                    {!option.isCorrect &&
                                        isSelected && (
                                            <X size={20} />
                                        )}
                                </div>
                            );
                        })}
                    </div>

                    <button
                        className="primaryButton bluffMainButton"
                        onClick={nextRound}
                    >
                        {roundIndex ===
                            bluffQuestions.length - 1
                            ? "See Final Score"
                            : "Next Round"}

                        <ArrowRight size={18} />
                    </button>
                </section>
            )}
        </div>
    );
}

export default BluffGame;