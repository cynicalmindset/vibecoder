import {google} from "@ai-sdk/google"
import chalk from  "chalk"
// import { describe } from "zod/v4/core"
 
export const availabletools = [
    {
        id:"google_search",
        name:"Google Searvh",
        description:"Access the latest information",
        getTool:()=>google.tools.googleSearch({}),
        enabled:false,
    },
    {
        id:"code_execution",
        name:"Code Execution",
        description:"Generate and execute code's",
        getTool:()=>google.tools.codeExecution({}),
        enabled:false,
    },
    {
        id:'url_context',
        name:"URL Context",
        description:"Provides specific URL that you want to the model to analyze directly from the prompt hehe",
        getTool:()=>google.tools.urlContext({}),
        enabled:false,
    },
];


export function getenabledtools(){
    const tools = {}

    try {
        for(const toolConfig of availabletools){
            if(toolConfig.enabled){
                tools[toolConfig.id] = toolConfig.getTool()
            }
        }


        if(Object.keys(tools).length>0){
            console.log(chalk.gray(`[DEBUG] enabled tools: ${Object.keys(tools).join(', ')}`));
        }else{
            console.log(
                chalk.yellow(`[DEBUG] no tools enabled`)
            )
        }
    } catch (error) {
        console.log(`found error in tools file: ${error.message}`)
        console.log('try running npm install @ai-sdk/google@latest')
        return undefined
    }
}



export function toogleTool(toolId){
    const tool = availabletools.find(t=>t.id === toolId)
    if(tool){
        tool.enabled = !tool.enabled
        console.log(
            chalk.gray(`[DEBUG] Tool ${toolId} togggled to ${tool.enabled}`)
        )
        return tool.enabled
    }

    console.log('tool not found')
    return false;
}


export function enabletools(toolsId){
    console.log(
        chalk.gray('[DEBUG] enabled tools called with:'),toolsId
    )

    availabletools.forEach(tool=>{
        const wasEnabled = tool.enabled;
        tool.enabled = toolsId.includes(tool.id);

        if(tool.enabled !== wasEnabled){
            console.log(
                chalk.gray(`[DEBUG] ${tool.id}:${wasEnabled}->${tool.enabled}`)
            )
        }
    });

    const enabledcount = availabletools.filter(t=>t.enabled).length;
    console.log(
        chalk.gray(`[DEBUG] total tools enabled: ${enabledcount}/${availabletools.length}`)
    )
}


export function getenabledtoolsnames(){
    const names = availabletools.filter(t=>t.enabled).map(t=>t.name);
    console.log(
        chalk.gray(`[DEBUG] getenabledtoolsnames returning:`),names
    )
    return names;
}

export function resetools(){
    availabletools.forEach(tool=>{
        tool.enabled = false;
    });
    console.log(
        chalk.gray('[DEBUG] All tools have been reset wow nigga')
    )
}