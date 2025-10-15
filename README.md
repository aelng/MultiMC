# MultiMC

MultiMC is a real-time, browser-based Minecraft client that allows you to connect to an unlimited number of servers using a single account. Whether you want to check skyblock auction houses, chat with others, or simply AFK on standby, everything can be done seamlessly across any server with MultiMC. This functionality is made possible by the way Minecraft handles server authentication (explained in detail below), enabling the creation of highly customized client systems. With MultiMC, you can create and manage multiple Minecraft server instances all from one account.

![ezgif-322e2ff99f0cb0](https://github.com/user-attachments/assets/051dfa30-4db1-4137-94ed-729cccf41e43)

## Inspiration

I’ve been playing Minecraft for a **very** long time, and over the years I’ve spent time on all kinds of servers (factions, skyblock, survival, and more). When I first started playing, though, I didn’t actually own an account. In fact, I went years without one. So how did I play?

<img width="993" height="546" alt="Screenshot from 2025-10-15 01-20-04" src="https://github.com/user-attachments/assets/2dabeb92-aa48-40af-9ca7-411b101167ba" />


Minecraft’s server authentication works differently from many other popular games. It creates a small loophole that allows two people to share the same account as long as they’re not playing on the same server. When a player tries to join a server, the game contacts Microsoft’s official servers to request a session token. As long as valid login credentials are provided, a token is returned, and that token is what allows you to play on the server.

With this, it’s possible to connect to as many different servers as you want at the same time. This isn’t just a neat trick for multi-connecting to servers, it’s an aspect of Minecraft’s system design that I’ve taken advantage of for years.

## Architecture Overview
<img width="1600" height="900" alt="image" src="https://github.com/user-attachments/assets/0e5f4cfd-b9f7-4c63-b184-2bf0fcc1d505" />

### Frontend
- **React** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Socket.io** - Real-time WebSocket communication

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **Socket.io** - WebSocket server for real-time communication
- **Mineflayer** - Minecraft bot framework for server connections
- **TypeScript** - Type-safe backend code

## Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v22 or higher)
- **npm** (v9 or higher)
- A **Microsoft Account with Minecraft** (for authentication)

## How to run

**Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   ```
Run Both Client and Server Together from the root directory:

```bash
npm run dev
```

## Usage

1. **Sign In**
   - Enter your Minecraft username (IGN)
   - Click "Sign In"
   - Complete Microsoft authentication in the popup window

2. **Add a Server**
   - Enter a Minecraft server IP address (e.g., `skyblock.net`)
   - Click "Add Server"
   - The bot will connect to the server

3. **Chat**
   - Select a server from the sidebar
   - Type your message in the input box
   - Press Enter or click "Send"
   - View real-time chat messages with full Minecraft formatting



