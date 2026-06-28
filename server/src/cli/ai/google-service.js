import {google} from "@ai-sdk/google"
import {convertToModelMessages, MessageConversionError, streamText} from "ai"
import { config } from "../../config/google.config.js"
import chalk from "chalk"



export class AIService{
    constructor(){
        if(!config.googleapikey){
            throw new Error("GOOGLE API KEY NOT SET ")
        }
        this.model = google(config.model,{
            apiKey:config.googleapikey,
        })
    }

    /**
     * @param {Array} messages 
     * @param {Function} onChunk
     *  @param {Object} tools
     * @param {function} onToolCall
     * @returns {Promise<Object>}
    */

    async sendmessage(messages, onChunk, tools = undefined, onToolCall = null){
        try {
            const streamConfig = {
                model:this.model,
                messages:messages,

            }
            const result = streamText(streamConfig);
            let fullresponse = ""
            for await (const chunk of result.textStream){
                fullresponse += chunk;
                if(onChunk){
                    onChunk(chunk)
                }
            }
            const fullresult = result;

            return{
                content:fullresponse,
                finishResponse:fullresult.finishReason,
                usage:fullresult.usage
            }
        } catch (error) {
            console.error(chalk.red("AI error:"), error.message);
  throw error;
        }
    }

    /****
     * get a non streaming response
     * @param {Array} meesages
     * @param {Object} tools
     * @param {Promise<string>}
     *     */



    async getmessage(messages, tools=undefined){
        let fullres = "";
        await this.sendmessage(messages,(chunk)=>{
            fullres += chunk
        })
        return fullres
    }
}
