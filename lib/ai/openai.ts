import OpenAI from 'openai';
import dotenv from "dotenv";
// import type { ChatCompletionAssistantMessageParam, ChatCompletionMessageParam } from 'openai/resources/index.mjs';
dotenv.config({ path: ".env.local" });

console.log("process.env.OPENAI_AI_KEY!", process.env.OPENAI_AI_KEY!);

export const openai = new OpenAI({
    apiKey: process.env.OPENAI_AI_KEY!,
    baseURL: process.env.OPENAI_AI_URL,
    dangerouslyAllowBrowser: true, // this is true because we are using it in the frontend. Make sure to secure your API key properly in production and consider moving this to the backend.    
})


// console.log("Sending prompt to OpenAI...");

// const messages = [
//     {
//         role: "system",
//         content: "You are a helpful assistant that provides concise and accurate answers to user questions. If you don't know the answer, say you don't know. Always be polite and respectful. Make these suggestions thoughtful and practical. Skip intros and conclusions. Only output suggestions"
//     },
//     {
//         role: "user",
//         content: "Suggest some gifts for someone who loves hiphop music. Your response must be under 100 words."
//     }
// ] as ChatCompletionMessageParam[];

// try {
//     const firstResponse = await openai.chat.completions.create({
//         model: process.env.OPENAI_AI_MODEL!,
//         messages: messages,
//         // max_completion_tokens: 256
//     });

//     messages.push(firstResponse.choices[0].message)

//     messages.push({
//         role: "user",
//         content: "More budget friendly. Less than 40$"
//     })

//     const secondResponse = await openai.chat.completions.create({
//         model: process.env.OPENAI_AI_MODEL!,
//         messages: messages,
//     })

//     console.log("Budget friendly suggestions")
//     console.log("AI Response:", secondResponse.choices[0].message.content);
   
// } catch (error) {
//     if (error instanceof Error) {
//         console.error("Error during OpenAI request:", error.message);
//     } else if (typeof error === "object" && error !== null) {
//         console.error("Error during OpenAI request:", JSON.stringify(error));
//     } else {
//         console.error("Unknown error during OpenAI request:", error);
//     }
// }