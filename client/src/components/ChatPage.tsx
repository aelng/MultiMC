import { useState, useEffect, useRef, FormEvent } from 'react'
import io from 'socket.io-client'

interface ChatPageProps {
  username: string
}

interface BotInstance {
  id: string
  host: string
  messages: string[]
}

interface BotMessage {
  botId: string
  message: any
}

export default function ChatPage({ username }: ChatPageProps): React.ReactElement {
  const [botInstances, setBotInstances] = useState<BotInstance[]>([])
  const [activeBotId, setActiveBotId] = useState<string | null>(null)
  const [newServerIp, setNewServerIp] = useState<string>('')
  const [message, setMessage] = useState<string>('')
  const [isAddingServer, setIsAddingServer] = useState<boolean>(false)
  
  const msgInputRef = useRef<HTMLInputElement>(null)
  const socketRef = useRef<ReturnType<typeof io> | null>(null)

  // function to convert incoming json to actual formatted text on the web
  const parseMinecraftMessage = (jsonMsg: any): string => {
    const parseLegacyColorCodes = (text: string): string => {
      const legacyColorMap: { [key: string]: string } = {
        '0': '#000000', // black
        '1': '#0000AA', // dark_blue
        '2': '#00AA00', // dark_green
        '3': '#00AAAA', // dark_aqua
        '4': '#AA0000', // dark_red
        '5': '#AA00AA', // dark_purple
        '6': '#FFAA00', // gold
        '7': '#AAAAAA', // gray
        '8': '#555555', // dark_gray
        '9': '#5555FF', // blue
        'a': '#55FF55', // green
        'b': '#55FFFF', // aqua
        'c': '#FF5555', // red
        'd': '#FF55FF', // light_purple
        'e': '#FFFF55', // yellow
        'f': '#FFFFFF', // white
      }

      const parts = text.split('§')
      if (parts.length === 1) return text

      let result = parts[0]
      
      for (let i = 1; i < parts.length; i++) {
        const code = parts[i][0]?.toLowerCase()
        const content = parts[i].substring(1)
        
        if (legacyColorMap[code]) {
          result += `<span style="color: ${legacyColorMap[code]}">${content}</span>`
        } else if (code === 'l') { // bold
          result += `<span style="font-weight: bold">${content}</span>`
        } else if (code === 'o') { // italic
          result += `<span style="font-style: italic">${content}</span>`
        } else if (code === 'n') { // underline
          result += `<span style="text-decoration: underline">${content}</span>`
        } else if (code === 'm') { // strikethrough
          result += `<span style="text-decoration: line-through">${content}</span>`
        } else if (code === 'r') { // reset
          result += content
        } else {
          result += '§' + parts[i] // Unknown code, keep as-is
        }
      }
      
      return result
    }

    if (typeof jsonMsg === 'string') {
      return parseLegacyColorCodes(jsonMsg)
    }

    const colorMap: { [key: string]: string } = {
      'black': '#000000',
      'dark_blue': '#0000AA',
      'dark_green': '#00AA00',
      'dark_aqua': '#00AAAA',
      'dark_red': '#AA0000',
      'dark_purple': '#AA00AA',
      'gold': '#FFAA00',
      'gray': '#AAAAAA',
      'dark_gray': '#555555',
      'blue': '#5555FF',
      'green': '#55FF55',
      'aqua': '#55FFFF',
      'red': '#FF5555',
      'light_purple': '#FF55FF',
      'yellow': '#FFFF55',
      'white': '#FFFFFF'
    }

    const formatPart = (part: any): string => {
      if (part.extra && Array.isArray(part.extra)) {
        return part.extra.map(formatPart).join('')
      }
      
      let text = part.text || ''
      if (!text) return ''
      if (text.includes('§')) {
        text = parseLegacyColorCodes(text)
      }
      
      const color = colorMap[part.color] || part.color || '#FFFFFF'
      const bold = part.bold ? 'font-weight: bold;' : ''
      const italic = part.italic ? 'font-style: italic;' : ''
      const underlined = part.underlined ? 'text-decoration: underline;' : ''
      const strikethrough = part.strikethrough ? 'text-decoration: line-through;' : ''
      
      const style = `color: ${color}; ${bold} ${italic} ${underlined} ${strikethrough}`
      if (text.includes('<span')) {
        return `<span style="${style}">${text}</span>`
      }
      return `<span style="${style}">${text}</span>`
    }

    let result = ''

 
    if (jsonMsg.json?.extra) {
      result = jsonMsg.json.extra.map(formatPart).join('')
    }
    else if (jsonMsg.extra) {
      result = jsonMsg.extra.map(formatPart).join('')
    }
    else if (jsonMsg.text) {
      result = formatPart(jsonMsg)
    }
    return result || ''
  }

  useEffect(() => {
    if (botInstances.length > 0 && !socketRef.current) {
      socketRef.current = io('ws://localhost:3500')
      const socket = socketRef.current
   
      socket.on("bot-message", (data: BotMessage) => {
        const parsedMessage = parseMinecraftMessage(data.message)
        
        if (parsedMessage.trim()) {
          setBotInstances(prev => 
            prev.map(bot => 
              bot.id === data.botId 
                ? { ...bot, messages: [...bot.messages, parsedMessage] }
                : bot
            )
          )
        }
      })

      return () => {
        socket.off("bot-message")
        socket.disconnect()
      }
    }
  }, [botInstances.length > 0])

  const addServer = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    if (!newServerIp.trim()) return
    
    setIsAddingServer(true)
    try {
      const response = await fetch('http://localhost:3500/api/start-server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: username, ip: newServerIp }),
      })
      
      if (response.ok) {
        const botId = `${username}${newServerIp}`
        const newBot: BotInstance = {
          id: botId,
          host: newServerIp,
          messages: []
        }
        setBotInstances(prev => [...prev, newBot])
        setActiveBotId(botId)
        setNewServerIp('')
      }
    } catch (err) {
      console.error('Error adding server:', err)
    } finally {
      setIsAddingServer(false)
    }
  }

  const sendMessage = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    if (message.trim() && socketRef.current && activeBotId) {
      socketRef.current.emit('message', {msg: `${username}: ${message}`, id: activeBotId})
      setMessage("")
    }
    msgInputRef.current?.focus()
  }

  const activeBot = botInstances.find(bot => bot.id === activeBotId)

  return (
    <div className="chat-container" style={{ display: 'flex', height: '100vh' }}>

      <div className="sidebar" style={{ width: '200px', borderRight: '1px solid #ccc', padding: '10px' }}>
        <h3>Servers</h3>
        {botInstances.map(bot => (
          <div
            key={bot.id}
            onClick={() => setActiveBotId(bot.id)}
            style={{
              padding: '10px',
              margin: '5px 0',
              backgroundColor: activeBotId === bot.id ? '#007bff' : '#f0f0f0',
              color: activeBotId === bot.id ? 'white' : 'black',
              cursor: 'pointer',
              borderRadius: '5px',
              wordBreak: 'break-word'
            }}
          >
            {bot.host}
          </div>
        ))}
        
        <form onSubmit={addServer} style={{ marginTop: '10px' }}>
          <input 
            type="text" 
            placeholder="Server IP"
            value={newServerIp}
            onChange={(e) => setNewServerIp(e.target.value)}
            disabled={isAddingServer}
            style={{ width: '140px', padding: '5px' }}
          />
          <button 
            type="submit" 
            disabled={isAddingServer}
            style={{ marginTop: '5px', width: '100%' }}
          >
            {isAddingServer ? '...' : '+'}
          </button>
        </form>
      </div>


      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeBot ? (
          <>
            <div className="chat-header">
              <h2>Chat - {username} @ {activeBot.host}</h2>
            </div>
            <ul className="messages" style={{ flex: 1, overflowY: 'auto' }}>
              {activeBot.messages.map((msg: string, index: number) => (
                <li key={index} dangerouslySetInnerHTML={{ __html: msg }} />
              ))}
            </ul>
            <form onSubmit={sendMessage} className="message-form">
              <input 
                ref={msgInputRef}
                type="text" 
                placeholder="Your message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button type="submit">Send</button>
            </form>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <p>Add a server to start chatting</p>
          </div>
        )}
      </div>
    </div>
  )
}