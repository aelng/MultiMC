import express from 'express'
import cors from 'cors'
import { Server } from "socket.io"
import { createServer } from 'http'
import { startBot, initalizeBotInstance } from './bot';
import { Bot } from 'mineflayer';

interface botInstance {
  name: string,
  host: any,
  instance: Bot,
}

let botInstances: botInstance[] = []
let ignAuth: string[] = []

const PORT: number = parseInt(process.env.PORT || '3500')

const app = express()
app.use(cors({
    origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:5173", "http://127.0.0.1:5173"]
}))
app.use(express.json())

const expressServer = createServer(app)

expressServer.listen(PORT, () => {
    console.log(`listening on port ${PORT}`)
})

const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:5173", "http://127.0.0.1:5173"]
    }
})

io.on('connection', (socket) => {
    console.log(`User ${socket.id} connected`)

    socket.on('message', (data) => {
        console.log('Received message:', data)
        
        const botInstance = botInstances.find(bot => {
            const botId = `${bot.name}${bot.host}`
            return botId === data.id
        })
        
        if (botInstance) {
            botInstance.instance.chat(data.msg)
            console.log(`Sent message "${data.msg}" with bot ${botInstance.name} on ${botInstance.host}`)
        } else {
            console.log(`No bot found with id: ${data.id}`)
        }
    })

    socket.on('disconnect', () => {
        socket.broadcast.emit('message', `User ${socket.id.substring(0, 5)} disconnected`)
    })
});


// debug logs
/*bot.once('spawn', () => {
    console.log('Bot spawned...');
});
bot.on('kicked', console.log)
bot.on('error', console.log)*/


app.post('/api/authenticate', async (req, res) => {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing data' });
    }

    if(ignAuth.includes(name)) {
        res.json({message: "already signed in"})
    }

    try {
      const authData = await initalizeBotInstance(name); // should kill bot immediately, no memory leak
      //console.log(authData);
      ignAuth.push(name);
      res.json(authData);
    } catch (error) {
      res.status(500).json({ error: 'Something went wrong' });
    }
});

app.post('/api/start-server', async (req, res) => {
  const { name, ip } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Missing data' });
  }

  try {
    let bot = startBot(name, ip);
    const botId = `${name}${ip}`;
    
    bot.on('message', (msg) => {
      // console.log(msg);
      io.emit('bot-message', {
        botId: botId,
        message: msg
      });
    });
    
    botInstances.push({name: name, host: ip, instance: bot});
    res.json({message: "success"});
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong' });
  }

});