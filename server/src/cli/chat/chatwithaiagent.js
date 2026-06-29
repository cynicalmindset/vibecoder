import chalk from "chalk";
import boxen from "boxen"
import {text,isCancel, cancel, intro, outro, confirm} from "@clack/prompts"
import yoctoSpinner from "yocto-spinner";
// import {marked} from "marked"
// import { markedTerminal } from "marked-terminal";
import {AIService} from "../ai/google-service.js"
import { Chatservice } from "../../service/chat.service.js";
import { getstoredtoken } from "../../lib/token.js";
import prisma from "../../lib/db.js";
import {generateapplication} from "../../config/agent.config.js"

const aiservice = new AIService();
const chatservice = new Chatservice();

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

async function initconversation(userId,conversationId=null){
    const spinner = yoctoSpinner({test:"loading convo.."}).start()

    const conversation = await chatservice.getorcreaeteconversation(
        userId, conversationId,"agent"
    )
    spinner.success("conversation loaded")

    const conversationinfo = boxen(
        `${chalk.bold("conversation")}:${conversation.title}\n${chalk.gray("ID: "+conversation.id)}\n${chalk.gray("agenti application generator")}\n${chalk.gray("working directory:")}${process.cwd()}`,{
            padding:1,
            margin:{top:1, bottom:1},
            borderStyle:"round",
            borderColor:"red",
            title:"chat session",
            titleAlignment:"center",
        }
    );

    console.log(conversationinfo)

    // if(conversation.message?.length>0){
    //     console.log(chalk.yellow("previous messages\n"));
    //     displaymessages(conversation.messages);
    // }

    return conversation
}

async function savemessage(conversationId, role, content){
    return await chatservice.addmessage(conversationId, role, content)
}


async function agentLoop(conversation) {
  const helpBox = boxen(
    `${chalk.cyan.bold("What can the agent do?")}\n\n` +
    `${chalk.gray('• Generate complete applications from descriptions')}\n` +
    `${chalk.gray('• Create all necessary files and folders')}\n` +
    `${chalk.gray('• Include setup instructions and commands')}\n` +
    `${chalk.gray('• Generate production-ready code')}\n\n` +
    `${chalk.yellow.bold("Examples:")}\n` +
    `${chalk.white('• "Build a todo app with React and Tailwind"')}\n` +
    `${chalk.white('• "Create a REST API with Express and MongoDB"')}\n` +
    `${chalk.white('• "Make a weather app using OpenWeatherMap API"')}\n\n` +
    `${chalk.gray('Type "exit" to end the session')}`,
    {
      padding: 1,
      margin: { bottom: 1 },
      borderStyle: "round",
      borderColor: "cyan",
      title: "💡 Agent Instructions",
      titleAlignment: "center",
    }
  );
  console.log(helpBox);

  while (true) {
    const userInput = await text({
      message: chalk.magenta("🚌 What would you like to build?"),
      placeholder: "Describe your application...",
      validate(value) {
        if (!value || value.trim().length === 0) {
          return "Description cannot be empty";
        }
        if (value.trim().length < 10) {
          return "Please provide more details (at least 10 characters)";
        }
      },
    });

    if (isCancel(userInput)) {
      console.log(chalk.yellow("\n👋 Agent session cancelled\n"));
      process.exit(0);
    }

    if (userInput.toLowerCase() === "exit") {
      console.log(chalk.yellow("\n👋 Agent session ended\n"));
      break;
    }

    const userBox = boxen(chalk.white(userInput), {
      padding: 1,
      margin: { left: 2, top: 1, bottom: 1 },
      borderStyle: "round",
      borderColor: "blue",
      title: "you",
      titleAlignment: "left",
    });
    console.log(userBox);

    await savemessage(conversation.id, "user", userInput);

    try {
      const result = await generateapplication(
        userInput,
        aiservice,
        process.cwd()
      );

      if (result && result.success) {
        const responseMessage =
          `Generated application: ${result.folderName}\n` +
          `Files created: ${result.files.length}\n` +
          `Location: ${result.appDir}\n\n` +
          `Setup commands:\n${result.commands.join('\n')}`;

        await savemessage(conversation.id, "assistant", responseMessage);

        const continuePrompt = await confirm({
          message: chalk.cyan("Would you like to generate another application?"),
          initialValue: false,
        });

        if (isCancel(continuePrompt) || !continuePrompt) {
          break;
        }
      } else {
        throw new Error("Generation returned no result");
      }
    } catch (error) {
      console.log(chalk.red(`\n❌ Error: ${error.message}\n`));

      await savemessage(conversation.id, "assistant", `Error: ${error.message}`);

      const retry = await confirm({
        message: chalk.cyan("Would you like to try again?"),
        initialValue: true,
      });

      if (isCancel(retry) || !retry) {
        break;
      }
    }
  }
}

export async function startagentchat(conversationId=null){
    try {
        intro(
            boxen(chalk.bold.red("vibecoder application generator"),{
                padding:1,
                borderStyle:"double",
                borderColor:"red"
            })
        )

        const user = await getuserfromtoken()

        const shouldcontinue = await confirm({
            message:chalk.yellow("agent will create files in the current directory. you good?"),
            initialValue:true,
        })

        if(isCancel(shouldcontinue) || !shouldcontinue){
            cancel(chalk.yellow("agent mode cancelled"));
            process.exit(0);
        }
        const conversation = await initconversation(user.id, conversationId)
        await agentLoop(conversation)

        outro(chalk.green('maza aya baat krne me bete???'))


    } catch (error) {
        console.log(`error occured in chat mode: ${error.message}`)
        process.exit(0)
    }
}