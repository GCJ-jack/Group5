// import OpenAI from "openai";
// import readline from "readline";
//
// const client = new OpenAI({
//     baseURL: "http://localhost:11434/v1",
//     apiKey: "ollama", // any string works
// });
//
// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
// });
//
// function askQuestion() {
//     rl.question("Please ask a question: ", async (qn) => {
//         try {
//             const response = await client.chat.completions.create({
//                 model: "gpt-oss:120b-cloud",
//                 messages: [
//                     { role: "user", content: qn }
//                 ],
//             });
//
//             console.log(response.choices[0].message.content);
//         } catch (err) {
//             console.error("Error:", err.message);
//         }
//
//         askQuestion(); // loop
//     });
// }
//
// askQuestion();


import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
    baseURL: "http://localhost:11434/v1",
    apiKey: "ollama",
});

// API endpoint
app.post("/chat", async (req, res) => {
    const { message } = req.body;

    try {
        const response = await client.chat.completions.create({
            model: "gpt-oss:120b-cloud",
            messages: [
                {
                    role: "system",
                    content: `You are The Atelier AI Investment Advisor. You must strictly follow the response guidelines below:

[Table Usage Rules]
- When involving data comparison, time series, or multiple items, you MUST use a Markdown table
- Table format must follow: | Column 1 | Column 2 | with |---|---| separators
- Always include a brief explanation after the table
- Avoid unnecessary verbosity
- Prioritize actionable insights
- If financial advice is uncertain, clearly state assumptions

[Formatting Rules]
- Do NOT use bold formatting (****) or headings (###), do not bold anything and make anything a heading
- Maintain a professional and objective tone
- Present information in a structured and clear manner`
                },
                { role: "user", content: message }
            ],
        });

        res.json({
            reply: response.choices[0].message.content
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "LLM request failed" });
    }
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});