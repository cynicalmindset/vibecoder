// import { includes } from "zod";
import prisma from "../lib/db.js";


export class Chatservice{
    /***
     * @param {string} userId
        @param {string} node
        @param {string} title
    */

        async createconverstion(userId, mode="chat", title=null){
            return prisma.conversation.create({
                data:{
                    userId,
                    mode,
                    title:title || `New ${mode} conversation`
                }
            })
        }




        /***
         * @param {string} userId
         * @param {string} conversationId 
         * @param {string} mode 
         * 
         * 
         * 
         */

        async getorcreaeteconversation(userId, conversatoinId=null, mode="chat"){
            if(conversatoinId){
                const conversation = await prisma.conversation.findFirst({
                    where:{
                        id:conversatoinId,
                        userId
                    },
                    include:{
                        messages:{
                            orderBy:{
                                createdAt:"asc"
                            }
                        }
                    }
                });
                if(conversation ) return conversation
            }

            return await this.createconverstion(userId,mode)
        }



        /***
         * @param {string} conversationId
         * @param {string} role
         * @param {string|object} content
         */

        async addmessage(conversationId, role, content){
            const contentstr = typeof content === "string"
                ? content
                : JSON.stringify(content);
                return await prisma.message.create({
                    data:{
                        conversationId,
                        role,
                        content:contentstr
                    }
                })
        }

        /***
         * 
         * @param {string} conversationId
         * 
         */

        async getmessages(conversationId){
            const message = await prisma.message.findMany({
                where:{conversationId},
                orderBy:{createdAt:"asc"},
            });

            return message.map((msg)=>({
                ...msg,
                content:this.parsecontent(msg.content),
            }))
        }

        /***
         * 
         * @param {strong} userId
         * 
         * 
         */

        async getuserconversation(userId){
            return await prisma.conversation.findMany({
                where:{userId},
                orederBy:{updatedAt:"desc"},
                include:{
                    messages:{
                        take:1,
                        orederBy:{createdAt:"desc"}
                    }
                }
            })
        }

        /***
         * @param {string} conversationId
         * @param {string} userId
         * 
         * 
         * 
         * */

        async deleteconversation(conversationId, userId){
            return await prisma.conversation.deleteMany({
                where:{
                    id:conversationId,
                    userId
                }
            })
        }

        /***
         * @param {string} conversationId
         * @param {stirng} title
         * 
         */

        async updateTitle(conversationId, title){
            return await prisma.conversation.update({
                where:{id:conversationId},
                data:{title},
            })
        }

        parsecontent(content){
            try {
                return JSON.parse(content)
            } catch (error) {
                return content;
            }
        }

        /***
         * @param {Array} messages
         * 
         */

        formatmessagesforai(messages){
            return messages.map((msg)=>({
                role:msg.role,
                content:typeof msg.content === "string" ? msg.content: JSON.stringify(msg.content),
            }))
        }
}