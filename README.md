# Vibecoder

A full-stack CLI tool that brings AI-powered chat, tool calling, and application generation to the terminal. Authentication is handled through a browser-based OAuth Device Authorization Flow so no passwords are ever typed into the terminal.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Technology Stack](#technology-stack)
- [Authentication Design](#authentication-design)
- [AI Modes](#ai-modes)
- [Database Schema](#database-schema)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Installation](#installation)
  - [Server](#server)
  - [Client](#client)
  - [CLI (Global Install)](#cli-global-install)
- [Running the Project](#running-the-project)
- [CLI Usage](#cli-usage)
- [Web Application Pages](#web-application-pages)
- [API Endpoints](#api-endpoints)
- [Project Flows](#project-flows)
  - [Login Flow](#login-flow)
  - [Chat Flow](#chat-flow)
  - [Agent Application Generation Flow](#agent-application-generation-flow)
- [Token Storage](#token-storage)
- [Known Limitations](#known-limitations)

---

## Overview

Vibecoder is a developer tool split into three parts that work together:

1. **Server** — an Express.js HTTP server that handles authentication via Better Auth and exposes OAuth Device Authorization endpoints. It also connects to a PostgreSQL database through Prisma for session, user, and conversation persistence.

2. **Client** — a Next.js web application that the user visits in the browser to approve or deny device authorization requests. It also shows session information for the logged-in user.

3. **CLI** — a Node.js command-line binary (`vibecoder`) that developers run in the terminal. It supports GitHub login, user info display, and three AI interaction modes powered by Google Gemini.

---

## Architecture

```
Terminal (CLI)
    |
    | 1. Requests device code
    v
Server (Express - port 3005)
    |
    | 2. Returns device_code + user_code + verification_uri
    v
CLI prints code and opens Browser
    |
    | 3. User visits /device, enters code
    v
Client (Next.js - port 3002)
    |
    | 4. Redirects to /approve with user_code
    v
User clicks Approve / Deny
    |
    | 5. Client calls Better Auth device.approve()
    v
Server marks device authorized
    |
    | 6. CLI polls /api/auth/token until access_token arrives
    v
Token stored at ~/.better-auth/token.json
    |
    | 7. CLI uses token for all subsequent commands
    v
AI Chat / Tool Calling / Agent Mode (Google Gemini)
```

---

## Repository Structure

```
vibecoder/
├── client/                         # Next.js web application
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── sign-in/page.tsx    # GitHub OAuth sign-in page
│   │   ├── approve/page.tsx        # Device approval / denial page
│   │   ├── device/page.tsx         # User code entry page
│   │   ├── layout.tsx              # Root layout with fonts
│   │   └── page.tsx                # Dashboard (session info + sign out)
│   ├── components/ui/
│   │   ├── login-form.tsx          # GitHub sign-in button component
│   │   └── ...                     # shadcn/ui component library
│   ├── lib/
│   │   ├── auth-client.ts          # Better Auth client with device plugin
│   │   └── utils.ts                # Tailwind class merge utility
│   └── package.json
│
└── server/                         # Express server + CLI binary
    ├── prisma/
    │   ├── schema.prisma            # Database models
    │   └── migrations/             # SQL migration history
    ├── src/
    │   ├── cli/
    │   │   ├── main.js             # CLI entry point, commander setup
    │   │   ├── commands/
    │   │   │   ├── auth/login.js   # login / logout / whoami commands
    │   │   │   └── ai/wakeup.js    # wakeup command (AI mode selector)
    │   │   ├── chat/
    │   │   │   ├── chatwithai.js        # Simple chat mode
    │   │   │   ├── chatwithaitool.js    # Tool calling chat mode
    │   │   │   └── chatwithaiagent.js   # Agent (app generation) mode
    │   │   └── ai/
    │   │       └── google-service.js    # AIService class wrapping Vercel AI SDK
    │   ├── config/
    │   │   ├── google.config.js    # Google API key and model config
    │   │   ├── tool.config.js      # Available tools registry
    │   │   └── agent.config.js     # Application generation logic + Zod schema
    │   ├── lib/
    │   │   ├── auth.js             # Better Auth server instance
    │   │   ├── db.js               # Prisma client singleton
    │   │   └── token.js            # Token read / write / expiry helpers
    │   ├── service/
    │   │   └── chat.service.js     # Conversation and message CRUD (Prisma)
    │   └── index.js                # Express app bootstrap
    └── package.json
```

---

## Technology Stack

### Server and CLI

| Package | Purpose |
|---|---|
| Express 5 | HTTP server |
| Better Auth | Authentication framework (OAuth, Device Flow, sessions) |
| Prisma 5 | ORM for PostgreSQL |
| `@ai-sdk/google` | Google Gemini model adapter for Vercel AI SDK |
| `ai` (Vercel AI SDK) | `streamText`, `generateObject`, tool calling |
| Commander.js | CLI command parsing |
| `@clack/prompts` | Interactive terminal prompts (select, text, confirm) |
| Chalk | Terminal color output |
| Figlet | ASCII art banner |
| Boxen | Bordered terminal boxes |
| `marked` + `marked-terminal` | Markdown rendering in the terminal |
| `yocto-spinner` | Terminal spinner |
| `open` | Open URLs in the system browser |
| Zod | Runtime schema validation |
| dotenv | Environment variable loading |

### Client

| Package | Purpose |
|---|---|
| Next.js 16 | React framework (App Router) |
| React 19 | UI library |
| Better Auth (React) | Session management + device authorization client plugin |
| Tailwind CSS 4 | Utility-first styling |
| shadcn/ui + Radix UI | Accessible component primitives |
| Lucide React | Icon library |
| Sonner | Toast notifications |
| TypeScript 5 | Static typing |

---

## Authentication Design

Vibecoder uses the **OAuth 2.0 Device Authorization Grant (RFC 8628)**. This flow is designed for devices or applications that cannot securely accept redirects (such as CLIs), allowing authentication to happen in a browser the user already has open.

### How it works

1. The CLI calls the server to request a `device_code` and a short `user_code`.
2. The server responds with both codes plus a `verification_uri` (the web app device page).
3. The CLI displays the `user_code` to the user and optionally opens the browser.
4. The user navigates to the web app, enters the code on `/device`, and is redirected to `/approve`.
5. On `/approve`, the user sees the code and chooses to approve or deny.
6. The CLI polls the token endpoint every few seconds. When the user approves, the server returns an `access_token`.
7. The token is saved locally at `~/.better-auth/token.json`.

All subsequent CLI commands (AI chat, whoami, etc.) read this token and use it to look up the authenticated user in the database.

**GitHub OAuth** is the social provider used for the actual identity. The user signs into the web app with GitHub, which ties their GitHub account to a Vibecoder user record. The device flow then issues a token for that user to the CLI.

---

## AI Modes

After running `vibecoder wakeup`, the user picks one of three modes:

### 1. Chat

A simple, persistent conversation with Google Gemini. Messages are stored in the database (Conversation + Message tables), so history is preserved across sessions. The AI response is streamed and rendered as Markdown in the terminal.

### 2. Tool Calling

Same as Chat but the user can optionally enable one or more tools before starting:

| Tool ID | Name | Capability |
|---|---|---|
| `google_search` | Google Search | Lets the model query the web for up-to-date information |
| `code_execution` | Code Execution | Lets the model generate and run code |
| `url_context` | URL Context | Lets the model read a specific URL directly |

Tools are provided from `@ai-sdk/google`'s built-in Google tool definitions and passed to `streamText` via the Vercel AI SDK's tool calling interface.

### 3. Agent (Application Generator)

The user describes an application in natural language. The agent uses `generateObject` with a Zod schema to produce a structured JSON payload that includes:

- A kebab-case folder name
- A list of all files with their full content
- Setup commands (e.g., `npm install`, `npm run dev`)
- NPM dependency versions

Vibecoder then writes all files to disk in the current working directory. No files are stubbed or left incomplete; the prompt enforces full implementations.

---

## Database Schema

The PostgreSQL database has six models managed by Prisma:

| Model | Description |
|---|---|
| `User` | Core user record. Created on first GitHub OAuth login. |
| `Session` | Active session with a token string. Used to identify CLI requests. |
| `Account` | OAuth account linkage (GitHub provider, access + refresh tokens). |
| `Verification` | Email verification codes (managed by Better Auth). |
| `DeviceCode` | Tracks pending device authorization codes and their status. |
| `Conversation` | A named thread of messages. Has a `mode` field (`chat`, `tool`, `agent`). |
| `Message` | Individual message in a conversation. Stores `role` (`user` or `assistant`) and `content`. |

`Conversation` and `Message` cascade-delete when the parent `User` or `Conversation` is deleted, respectively.

---

## Prerequisites

- Node.js 20 or later
- npm 10 or later
- A running PostgreSQL instance
- A GitHub OAuth App (for social login)
- A Google AI API key (for Gemini)

---

## Environment Variables

### Server (`server/.env`)

```env
PORT=3005
DATABASE_URL=postgresql://user:password@localhost:5432/vibecoder
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key
VIBECODER_MODEL=gemini-2.5-flash
```

`VIBECODER_MODEL` is optional and defaults to `gemini-2.5-flash`.

### Client (`client/.env.local`)

The client connects to the auth server at `http://localhost:3005` (hardcoded in `lib/auth-client.ts`). No additional environment variables are required for local development. If you change the server port, update `baseURL` in `client/lib/auth-client.ts` and `trustedOrigins` in `server/src/lib/auth.js`.

---

## Installation

### Server

```bash
cd server
npm install
npx prisma migrate dev
```

This runs all migrations and creates the database schema. Prisma will also generate the client.

### Client

```bash
cd client
npm install
```

### CLI (Global Install)

From the `server` directory, link the binary globally so `vibecoder` is available anywhere on the system:

```bash
cd server
npm link
```

To unlink later:

```bash
npm unlink -g vibecoder
```

---

## Running the Project

Both the server and the client must be running for authentication to work.

**Terminal 1 — Server**

```bash
cd server
npm run dev
# Starts on http://localhost:3005
```

**Terminal 2 — Client**

```bash
cd client
npm run dev
# Starts on http://localhost:3000
# Note: the login callback URL in login-form.tsx is hardcoded to http://localhost:3002
# If Next.js uses a different port, update that callback URL accordingly
```

---

## CLI Usage

```
vibecoder [command] [options]
```

### Commands

#### `vibecoder login`

Starts the Device Authorization Flow. Requests a device code from the server, prints the user code, and optionally opens the browser to the verification URL. Polls for the access token until the user approves in the browser or the code expires.

```bash
vibecoder login
vibecoder login --server-url http://localhost:3005 --client-id <id>
```

Options:

| Flag | Default | Description |
|---|---|---|
| `--server-url <url>` | `http://localhost:3005` | Auth server base URL |
| `--client-id <id>` | `GITHUB_CLIENT_ID` from env | OAuth client ID |

#### `vibecoder logout`

Clears the locally stored token file (`~/.better-auth/token.json`). Confirms before proceeding.

```bash
vibecoder logout
```

#### `vibecoder whoami`

Reads the stored token, looks up the corresponding user in the database, and prints their name, email, and ID.

```bash
vibecoder whoami
```

#### `vibecoder wakeup`

Verifies the stored token and presents an interactive menu to choose an AI mode:

- **chat** — plain conversation with Gemini
- **tool calling** — conversation with optional Google Search, Code Execution, or URL Context tools
- **Agentic AI** — describe an app and have it generated and written to disk

```bash
vibecoder wakeup
```

---

## Web Application Pages

| Route | Description |
|---|---|
| `/sign-in` | GitHub OAuth sign-in button. Redirects to dashboard if already authenticated. |
| `/device` | User code entry page. Accepts the `XXXX-XXXX` format code shown in the terminal. Validates the code against the server and redirects to `/approve`. |
| `/approve?user_code=<code>` | Shows the device code and lets the authenticated user approve or deny CLI access. Requires an active browser session (user must be signed in). |
| `/` | Dashboard. Shows the current user's name, email, and truncated session ID. Provides a sign-out button. Redirects to `/sign-in` if not authenticated. |

---

## API Endpoints

All authentication endpoints are handled automatically by Better Auth under the `/api/auth/*` path.

| Method | Path | Description |
|---|---|---|
| `ALL` | `/api/auth/*` | Better Auth handler (login, token, device code, etc.) |
| `GET` | `/api/me` | Returns the current session and user from request headers |
| `GET` | `/device?user_code=<code>` | Redirects the browser to `http://localhost:3002/device?user_code=<code>` |
| `GET` | `/health` | Returns a plain text health check response |

---

## Project Flows

### Login Flow

```
vibecoder login
  |
  +--> POST /api/auth/device/code
  |       returns: device_code, user_code, verification_uri, expires_in, interval
  |
  +--> CLI prints user_code and verification_uri
  +--> CLI optionally opens browser to verification_uri
  |
  +--> [Browser] User navigates to /device
  +--> User types user_code and submits
  +--> App calls GET /device?user_code=... on server
  +--> Server redirects to /approve?user_code=...
  |
  +--> [Browser] User clicks Approve
  +--> App calls authclient.device.approve({ userCode })
  |
  +--> [CLI polling] POST /api/auth/token every N seconds
  |       status: authorization_pending  -> continue polling
  |       status: slow_down              -> increase interval
  |       status: access_denied          -> exit
  |       status: access_token present   -> done
  |
  +--> Token saved to ~/.better-auth/token.json
```

### Chat Flow

```
vibecoder wakeup -> select "chat"
  |
  +--> Read token from ~/.better-auth/token.json
  +--> Prisma: find User where sessions.some.token == access_token
  |
  +--> Prisma: create or load Conversation (mode: "chat")
  |
  +--> Loop:
  |     User types message
  |     -> Prisma: Message.create (role: "user")
  |     -> Prisma: Message.findMany (load full history)
  |     -> AIService.sendMessage(messages, onChunk, tools=undefined)
  |        -> Vercel AI SDK streamText
  |        -> stream chunks printed to terminal as they arrive
  |        -> full response rendered as Markdown
  |     -> Prisma: Message.create (role: "assistant")
  |     -> If first message, Conversation.update title
  |
  +--> User types "exit" or presses Ctrl+C -> end session
```

### Agent Application Generation Flow

```
vibecoder wakeup -> select "Agentic AI"
  |
  +--> Confirm: agent will write files to the current directory
  |
  +--> User describes an application (minimum 10 characters)
  |
  +--> generateObject(model, ApplicationSchema, prompt)
  |     Returns structured JSON:
  |       - folderName  (kebab-case)
  |       - description
  |       - files[]     (path + full content)
  |       - setupCommands[]
  |       - dependencies{}
  |
  +--> Display file tree in terminal
  +--> fs.mkdir + fs.writeFile for each file in cwd/folderName/
  +--> Print setup commands
  |
  +--> Ask: generate another application?
```

---

## Token Storage

The access token is stored as JSON at:

```
~/.better-auth/token.json
```

Structure:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "Bearer",
  "scope": "openid profile email",
  "expires_at": "2026-07-01T12:00:00.000Z",
  "created_at": "2026-06-30T12:00:00.000Z"
}
```

The `requireauth` helper in `server/src/lib/token.js` reads this file, checks whether `expires_at` is within five minutes of the current time, and exits with an error message if the token is expired. The user must run `vibecoder login` again to obtain a fresh token.

---

## Known Limitations

- The callback URL in `client/components/ui/login-form.tsx` is hardcoded to `http://localhost:3002`. If the Next.js dev server binds to a different port, GitHub OAuth will fail unless the URL is updated and the GitHub OAuth App's allowed callback URLs are also updated.
- The server URL in `client/lib/auth-client.ts` and `server/src/cli/commands/auth/login.js` is hardcoded to `http://localhost:3005`. These must be updated together for any deployment.
- There is no token refresh implementation. When the access token expires the user must log in again manually.
- The Agent mode writes files relative to wherever the `vibecoder` command is run (`process.cwd()`). Running it from an unexpected directory will place generated files there.
- The Agentic AI mode is experimental. File generation quality depends on the model and the complexity of the description provided.
