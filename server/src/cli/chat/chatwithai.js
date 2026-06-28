import chalk from "chalk";
import boxen from "boxen"
import {text,isCancel, cancel, intro, outro} from "@clack/prompts"
import yoctoSpinner from "yocto-spinner";
import {marked} from "marked"
import { markedTerminal } from "marked-terminal";
import {AIService} from "../ai/google-service.js"
import { Chatservice } from "../../service/chat.service.js";
import { getstoredtoken } from "../../lib/token.js";
import prisma from "../../lib/db.js";

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
    const spinner = yoctoSpinner({text:"Ai is thinking...", color:"red"}).start()

    const dbmessages = await chatservice.getmessages(conversationId)
    const aimessages = await chatservice.formatmessagesforai(dbmessages)

    let fullresponse = ""

    let isfirstchunk = true;

    try {
        const res = await aiservice.sendmessage(aimessages,(chunk)=>{
            if(isfirstchunk){
                spinner.stop();
                console.log("\n");
                const header = chalk.green.bold("black nigger:");
                console.log(header);
                console.log(chalk.gray("-".repeat(60)));
                isfirstchunk = false;
            }
            fullresponse += chunk;
        });

        console.log("\n")
        const renderedmarkdown = marked.parse(fullresponse);
        console.log(renderedmarkdown);
        console.log(chalk.gray("-".repeat(60)));
        console.log("\n")

        return res.content;



    } catch (error) {
        spinner.error("failed to get ai respinse");
        throw error;
    }
}




async function updateconversationtitle(conversationId, userInput , messageCount){
    if(messageCount===1){
        const title = userInput.slice(0,50) + (userInput.length>50?"...":"");
        await chatservice.updateTitle(conversationId,title)
    }
}







async function chatloop(conversation){
    console.log("type your message and press start");
    while(true){
        const userinput = await text({
            message:chalk.blue("your message"),
            placeholder:"type your message...",
            validate(value){
                if(!value || value.trim().length === 0){
                    return "message cannot be empty"
                }
            }
        })

        if(isCancel(userinput)){
            console.log("chat session ended")
            process.exit(0)
        }

        if(userinput.toLowerCase() === "exit"){
            console.log("chat session ended");
            break;
        }

        await savemessage(conversation.id, "user", userinput);

        const messages = await chatservice.getmessages(conversation.id)


        const airesponse = await getairesponse(conversation.id)

        await savemessage(conversation.id,"assistant",airesponse)

        await updateconversationtitle(conversation.id, userinput, messages.length)
    }
}




async function initconversation(userId,conversationId=null,mode="chat"){
    const spinner = yoctoSpinner({test:"loading convo.."}).start()

    const conversation = await chatservice.getorcreaeteconversation(
        userId, conversationId, mode
    )
    spinner.success("conversation loaded")

    const conversationinfo = boxen(
        `${chalk.bold("conversation")}:${conversation.title}\n${chalk.gray("ID: "+conversation.id)}\n${chalk.gray("mode: "+conversation.mode)}`,{
            padding:1,
            margin:{top:1, bottom:1},
            borderStyle:"round",
            borderColor:"red",
            title:"chat session",
            titleAlignment:"center",
        }
    );

    console.log(conversationinfo)

    if(conversation.message?.length>0){
        console.log(chalk.yellow("previous messages\n"));
        displaymessages(conversation.messages);
    }

    return conversation
}






export async function startchat(mode="chat", conversationId=null){
    try {
        intro(
            boxen(chalk.bold.red("vibecoder chat"),{
                padding:1,
                borderStyle:"double",
                borderColor:"red"
            })
        )

        const user = await getuserfromtoken()
        const conversation = await initconversation(user.id, conversationId,mode)
        await chatloop(conversation)

        outro(chalk.green('maza aya baat krne me bete???'))
    } catch (error) {
        console.log(`error occured in chat mode: ${error.message}`)
        console.log(error.stack);
    }
}