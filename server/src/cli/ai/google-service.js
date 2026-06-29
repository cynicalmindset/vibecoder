import {google} from "@ai-sdk/google"
import {convertToModelMessages, generateObject, MessageConversionError, streamText, tool} from "ai"
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

            if(tools && Object.keys(tools).length>0){
                streamConfig.tools = tools;
                streamConfig.maxSteps = 5

                console.log(
                    chalk.gray(`[DEBUG] tools enabled: ${Object.keys(tools).join(", ")}`)
                )
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

            const toolsCalls = [];
            const toolResults = [];

            if(fullresult.steps && Array.isArray(fullresult.steps)){
                for(const step of fullresult.steps){
                    if(step.toolsCalls && step.toolsCalls.length>0){
                        for(const toolCall of step.toolsCalls){
                            toolsCalls.push(toolCall);

                            if(ontollcall){
                                ontollcall(toolCall)
                            }
                        }
                    }
                    if(step.toolResults && step.toolResults.length>0){
                        toolResults.push(...step.toolResults)
                    }
                }
            }



            return{
                content:fullresponse,
                finishResponse:fullresult.finishReason,
                usage:fullresult.usage,
                toolsCalls,
                toolResults,
                steps:fullresult.steps
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
        const result = await this.sendmessage(messages,(chunk)=>{
            fullres += chunk
        },tools)
        return result.content;
    }


    /***
 * generated structured o[ use inf zor schema]
 * @param {Object} schema
 * @param {string} prompt
 * @returns {Promise<Object>}
 * 
 * */

    async generaatestructure(schema, prompt){
        try {
            const result = await generateObject({
                model:this.model,
                schema:schema,
                prompt:prompt
            })

            return result.object
        } catch (error) {
            console.log("ai structure generation error: ",error.message)
            throw error;
        }
    }



}



