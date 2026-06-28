import chalk from "chalk";
import { Command } from "commander";
import yoctoSpinner from "yocto-spinner";
import { getstoredtoken } from "../../../lib/token.js";
import prisma from "../../../lib/db.js";
import { select } from "@clack/prompts";
import { startchat } from "../../chat/chatwithai.js";


const wakeupacition = async() => {
    const token = await getstoredtoken();
    if(!token.access_token){
        console.log(
            chalk.red("not authorizd yet , please run vibecoder login")
        )
        return;
    }

    const spinner = yoctoSpinner({text:"fetching user information..."})
    spinner.start()

    const user = await prisma.user.findFirst({
        where:{
            sessions:{
                some:{
                    token:token.access_token
                }
            }
        },
        select:{
            id:true,
            name:true,
            email:true,
            image:true
        }
    })

    spinner.stop();

    if(!user){
        console.log(
            chalk.red("user not found")
        )
        return;
    }
    console.log(
        chalk.green(`hellow ${user.name} nigga!\n`)
    )

    const choice = await select({
        message: "select an option:",
        options:[
            {
                value:"chat",
                label:"chat",
                hint:"simple brainstrom with ai",
                
            },
            {
                value:"tool",
                label:"tool calling",
                hint:"chat with tools (google search, code executions)"
            },
            {
                value:"agent",
                label:"Agentic AI",
                hint:"Advanced AI agent ( comming soon )"
            },
        ],
    });

    switch(choice){
        case "chat":
            startchat("chat")
            break;
        case "tool":
            console.log("tool calling is sleceted")
            break;
        case "agent":
            console.log("agent is slected")
            break;
    }
}


export const wakeup = new Command("wakeup")
.description("wake up ai")
.action(wakeupacition)