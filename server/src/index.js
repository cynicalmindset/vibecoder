import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
dotenv.config();

const app = express();



app.use(
  cors({
    origin: "http://localhost:3002", 
    methods: ["GET", "POST", "PUT", "DELETE"], 
    credentials: true, 
  })
);
app.use(express.json());

app.all("/api/auth/*splat", toNodeHandler(auth));

app.get("/api/me", async (req, res) => {
 	const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
	return res.json(session);
});

app.get("/health",(req,res)=>{
    res.send("Server is running");
})


app.listen(process.env.PORT,()=>{
    console.log(`Server is running on port ${process.env.PORT}`);
})