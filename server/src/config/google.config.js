import dotenv from "dotenv"
dotenv.config()

export const config = {
    googleapikey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
    model:process.env.VIBECODER_MODEL || "gemeni-2.5-flash"
}