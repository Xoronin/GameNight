export type BluffQuestion = {
    id: string;
    category: string;
    question: string;
    answer: string;
};

export const bluffQuestions: BluffQuestion[] = [
    {
        id: "q1",
        category: "Weird Facts",
        question:
            "What is the technical term for the fear of long words?",
        answer: "Hippopotomonstrosesquippedaliophobia",
    },
    {
        id: "q2",
        category: "Science",
        question:
            "What is the name of the process where plants release water vapor through their leaves?",
        answer: "Transpiration",
    },
    {
        id: "q3",
        category: "Geography",
        question:
            "Which country has the most natural lakes in the world?",
        answer: "Canada",
    },
    {
        id: "q4",
        category: "History",
        question:
            "What was the name of the first artificial satellite launched into space?",
        answer: "Sputnik 1",
    },
    {
        id: "q5",
        category: "Gaming",
        question:
            "Which company originally created the video game Minecraft?",
        answer: "Mojang",
    },
    {
        id: "q6",
        category: "Movies",
        question:
            "What is the fictional metal used to make Captain America's shield?",
        answer: "Vibranium",
    },
    {
        id: "q7",
        category: "Animals",
        question:
            "Which animal has fingerprints that are extremely similar to humans?",
        answer: "Koala",
    },
    {
        id: "q8",
        category: "Food",
        question:
            "What ingredient gives traditional pesto its green color?",
        answer: "Basil",
    },
];