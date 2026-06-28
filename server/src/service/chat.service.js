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
            
        }
}