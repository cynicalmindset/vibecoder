import chalk from "chalk";
import boxen from "boxen"
import {text,isCancel, cancel, intro, outro, multiselect} from "@clack/prompts"
import yoctoSpinner from "yocto-spinner";
import {marked} from "marked"
import { markedTerminal } from "marked-terminal";
import {AIService} from "../ai/google-service.js"
import { Chatservice } from "../../service/chat.service.js";
import { getstoredtoken } from "../../lib/token.js";
// import { getstoredtoken} from "../commands/auth/login.js"
import prisma from "../../lib/db.js";

import{
    availabletools,
    getenabledtools,
    enabletools,
    getenabledtoolsnames,
    resetools
} from "../../config/tool.config.js"
// import { tool } from "ai";

marked.use(
    markedTerminal({
        code:chalk.red,
        blockquote:chalk.gray.italic,
        heading:chalk.green.bold,
        firstHeading:chalk.magenta.underline.bold,
        hr:chalk.reset,
        listitem:chalk.reset,
        list:chalk.reset,
        paragraph:chalk.reset,
        strong:chalk.bold,
        em:chalk.italic,
        codespan:chalk.yellow.bgBlack,
        del:chalk.dim.gray.strikethrough,
        link:chalk.blue.underline,
        href:chalk.blue.underline
    })
);

const aiservice = new AIService()
const chatservice = new Chatservice()

async function getuserfromtoken(){
    const token = await getstoredtoken()
    if(!token?.access_token){
        throw new Error("not authorized , please run vibecoder login")
    }
    const spinner = yoctoSpinner({text:"authentication..."}).start();
    const user = await prisma.user.findFirst({
        where:{
            sessions:{
                some:{token:token.access_token}
            },
        },
    });
    if(!user){
        spinner.error("user not foundf")
        throw new Error("user not found run login again ")
    }
    spinner.success(`welcome back, ${user.name}`)
    return user;
}


async function selecttools(){
    const tooloptions = availabletools.map(tool=>({
        value:tool.id,
        label:tool.name,
        hint:tool.description
    }))

    const selectedtools = await multiselect({
        message: chalk.red("select tools to enable, space to select , enter to confirm: "),
        options:tooloptions,
        required:false,
    })

    if(isCancel(selectedtools)){
        cancel(chalk.yellow("tool selection cancle"))
        process.exit(0)
    }

    enabletools(selectedtools)

    if(selectedtools.length === 0){
        console.log("no tools selected , ai will work without it")
    }else{
        const toolbox = boxen(
            chalk.green(`enabled tools:\n${selectedtools.map(id=>{
                const tool = availabletools.find(t=>t.id === id);
                return `  @${tool.name}`;
            }).join('\n')}`),
            {
                padding:1,
                margin:{top:1,bottom:1},
                borderStyle:"round",
                borderColor:"green",
                title:"Active tools",
                titleAlignment:"center"
            }
        );
        console.log(toolbox);
    }
    return selectedtools.length > 0;
}

function displaymessages(messages){
    messages.forEach((msg)=>{
        if(msg.role==="user"){
            const userbox = boxen(chalk.white(msg.content),{
                padding:1,
                margin:{left:2,bottom:1},
                borderStyle:"round",
                borderColor:"blue",
                title:"nigga",
                titleAlignment:"left"
            }
            );
            console.log(userbox);
        }else{
            const rendercontent = marked.parse(msg.content);
            const assistantbox = boxen(rendercontent.trim(),{
                padding:1,
                margin:{left:2, bottom:1},
                borderStyle:"round",
                borderColor:"green",
                title:"black nigga",
                titleAlignment:"left"
            });
            console.log(assistantbox)
        }
    })
}

async function savemessage(conversationId, role, content){
    return await chatservice.addmessage(conversationId, role, content)
}

async function getairesponse(conversationId){
    const spinner = yoctoSpinner({
        text:"AI is thinking...",
        color:"red"
    }).start();

    const dbmessage = await chatservice.getmessages(conversationId);
    const aimessages = chatservice.formatmessagesforai(dbmessage);
    const tools = getenabledtools();

    let fullresponse = ""
    let isFirstChunk = true;
    const toolcalldetected = []

    try {
        const res = await aiservice.sendmessage(
            aimessages,
            (chunk)=>{
                if(isFirstChunk){
                    spinner.stop()
                    console.log("\n");
                    const header = chalk.green.bold("assitant:");
                    console.log(header);
                    console.log(chalk.gray("-".repeat(60)));
                    isFirstChunk = false;
                }

                fullresponse += chunk
            },
            tools,
            (toolcall)=>{
                toolcalldetected.push(toolcall)
            }
        );

        if (toolcalldetected.length > 0){
            console.log("\n");
            const toolcallbox = boxen(
                toolcalldetected.map(tc=>
                    `${chalk.red("tool:")}${tc.toolName}\n{chalk.gray("Args:)}${JSON.stringify(tc.args,null,2)}`
                ).join("\n\n"),{
                    padding:1,
                    margin:1,
                    borderStyle:"round",
                    borderColor:"red",
                    title:"tool calls"
                }
            );
            console.log(toolcallbox)
        }

        if(res.toolResults && res.toolResults.length > 0){
            const toolresbox = boxen(
                res.toolResults.map(tr=>
                    `${chalk.green("tools:")}${tr.toolName}\n${chalk.gray("results:")}${JSON.stringify(tr.res,null,2).slice(0,200)}...`
                ).join("\n\n"),
                {
                    padding:1,
                    margin:1,
                    borderStyle:"round",
                    borderColor:"green",
                    title:"tool results"
                }
            );
            console.log(toolresbox);
        }


        console.log("\n");
        const rendermarkdown = marked.parse(fullresponse);
        console.log(rendermarkdown);
        console.log(chalk.gray("-".repeat(60)));
        console.log("\n");

        return res.content;



    } catch (error) {
        spinner.error("failed to get ai response");
        throw error;
    }
}



async function updateconversationtitle(conversationId, userInput , messageCount){
    if(messageCount===1){
        const title = userInput.slice(0,50) + (userInput.length>50?"...":"");
        await chatservice.updateTitle(conversationId,title)
    }
}

async function chatLoop(conversation){
    const enabletoolnames = getenabledtoolsnames();
    const helpbox = boxen(
        `${chalk.gray('type your message and press enter')}\n${chalk.gray('AI has access to:')}${enabletoolnames.length > 0 ? enabletoolnames.join(", "):"no tools"}\n${chalk.gray('type exot to end conversation')}\n${chalk.gray('press crtl+c to quit anytime')}`,{
            padding:1,
            margin:{bottom:1},
            borderColor:"gray",
            borderStyle:"round",
            dimBorder:true
        }
    );
    console.log(helpbox);

    while(true){
        const userInput = await text({
            message:chalk.blue("your message"),
            placeholder:"type something...",
            validate(value){
                if(!value || value.trim().length === 0){
                    return "Message cannot be empyt";
                }
            }
        })

        if(isCancel(userInput)){
            const exitBox = boxen(chalk.yellow("chat session eneded..."),{
                padding:1,
                margin:1,
                borderStyle:"round",
                borderColor:"red"
            });
            console.log(exitBox);
            process.exit(0);
        }

        if(userInput.toLowerCase() === "exit"){
            const exitBox = boxen(chalk.yellow("Chat session ended.."),{
                padding:1,
                margin:1,
                borderStyle:"round",
                borderColor:"yellow"
            });
            console.log(exitBox);
            break;
        }

        const userBox = boxen(chalk.white(userInput),{
            padding:1,
            margin:{left:2,top:1,bottom:1},
            borderStyle:"round",
            borderColor:"blue",
            title:"you",
            titleAlignment:"left",
        });
        console.log(userBox);

        await savemessage(conversation.id, "user", userInput);

        const messages = await chatservice.getmessages(conversation.id)


        const airesponse = await getairesponse(conversation.id)

        await savemessage(conversation.id,"assistant",airesponse)

        await updateconversationtitle(conversation.id, userInput, messages.length)
    }
}


// export async 


async function initConversation(userId, conversationId=null, mode="tool"){
    const spinner = yoctoSpinner({text:"loading conversation..."}).start()
    const conversation = await chatservice.getorcreaeteconversation(
        userId,
        conversationId,
        mode
    )
     console.log("conversation:", JSON.stringify(conversation, null, 2));

    spinner.success("conversation loaded")

    const enabletoolnames = getenabledtoolsnames(); // use this instead
    console.log("enabletoolnames:", enabletoolnames);
    const toolsdisplay = enabletoolnames.length>0
        ? `\n${chalk.gray("Active tools:")} ${enabletoolnames.join(", ")}`
        : `\n${chalk.gray("no tools enabled")}`;

    const conversationinfo = boxen(
        `${chalk.bold("Conversation")}: ${conversation.title}\n${chalk.gray("ID: "+conversation.id)}\n${chalk.gray("Mode: "+conversation.mode)}${toolsdisplay}`,{
            padding:1,
            margin:{top:1,bottom:1},
            borderColor:"red",
            borderStyle:"round",
            title:"tool calling session",
            titleAlignment:"center",
        }
    )
    console.log(conversationinfo);
    if(conversation.messages && conversation.messages?.length>0){
        console.log(chalk.yellow("previous messages:\n"));
        displaymessages(conversation.messages)
    }

    return conversation
}



export async function starttoolchat(conversationId = null){
    try {
        intro(
        boxen(chalk.bold.red("vibecoder tool calling mode"),{
            padding:1,
            borderColor:"red",
            borderStyle:"double"
        })
    )

    const user = await getuserfromtoken();

    await selecttools()

    const conversation = await initConversation(user.id, conversationId, "tool")
    await chatLoop(conversation)

    resetools()

    outro(chalk.green("bye bye nigga"))

    } catch (error) {
        console.log(`found error in starttoolchat: ${error.message}`);
        resetools();
        process.exit(1);
    }
}