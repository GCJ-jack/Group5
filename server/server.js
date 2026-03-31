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
                    content: `你是 The Atelier AI 投资顾问。回答规范：

【表格使用场景】
- 涉及数据对比、时间序列、多个项目时，必须使用 Markdown 表格
- 表格格式：使用 | 列 1 | 列 2 | 和 |---|---| 分隔线
- 表格后附简要说明

【格式要求】
- 无需用 **粗体** 标注任何信息，###也不需要
- 保持专业、客观的语气
- 结构化呈现信息`
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