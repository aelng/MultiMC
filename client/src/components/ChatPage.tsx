import { useState, useEffect, useRef, FormEvent } from 'react'
import io from 'socket.io-client'
import { playButtonClick } from '../utils/sounds'

interface ChatPageProps {
  username: string
}

interface BotInstance {
  id: string
  host: string
  messages: MessagePart[][]
}

interface BotMessage {
  botId: string
  message: any
}

interface MessagePart {
  text: string
  color?: string
  bold?: boolean
  italic?: boolean
  underlined?: boolean
  strikethrough?: boolean
}

function MessagePart({ text, color, bold, italic, underlined, strikethrough }: MessagePart): React.ReactElement {
  const style: React.CSSProperties = {
    color: color || '#FFFFFF',
    fontWeight: bold ? 'bold' : 'normal',
    fontStyle: italic ? 'italic' : 'normal',
    textDecoration: underlined && strikethrough ? 'underline line-through' : 
                    underlined ? 'underline' : 
                    strikethrough ? 'line-through' : 'none'
  }
  
  return <span style={style}>{text}</span>
}

export default function ChatPage({ username }: ChatPageProps): React.ReactElement {
  const [botInstances, setBotInstances] = useState<BotInstance[]>([])
  const [activeBotId, setActiveBotId] = useState<string | null>(null)
  const [newServerIp, setNewServerIp] = useState<string>('')
  const [message, setMessage] = useState<string>('')
  const [isAddingServer, setIsAddingServer] = useState<boolean>(false)
  
  const msgInputRef = useRef<HTMLInputElement>(null)
  const socketRef = useRef<ReturnType<typeof io> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // function to convert incoming json to structured message parts
  const parseMinecraftMessage = (jsonMsg: any): MessagePart[] => {
    const parseLegacyColorCodes = (text: string): MessagePart[] => {
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
      if (parts.length === 1) return [{ text }]

      const result: MessagePart[] = []
      
      if (parts[0]) {
        result.push({ text: parts[0] })
      }
      
      for (let i = 1; i < parts.length; i++) {
        const code = parts[i][0]?.toLowerCase()
        const content = parts[i].substring(1)
        
        if (!content) continue
        
        if (legacyColorMap[code]) {
          result.push({ text: content, color: legacyColorMap[code] })
        } else if (code === 'l') { // bold
          result.push({ text: content, bold: true })
        } else if (code === 'o') { // italic
          result.push({ text: content, italic: true })
        } else if (code === 'n') { // underline
          result.push({ text: content, underlined: true })
        } else if (code === 'm') { // strikethrough
          result.push({ text: content, strikethrough: true })
        } else if (code === 'r') { // reset
          result.push({ text: content })
        } else {
          result.push({ text: '§' + parts[i] }) // Unknown code, keep as-is
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

    const formatPart = (part: any): MessagePart[] => {
      if (part.extra && Array.isArray(part.extra)) {
        return part.extra.flatMap(formatPart)
      }
      
      let text = part.text || ''
      if (!text) return []
      
      if (text.includes('§')) {
        return parseLegacyColorCodes(text)
      }
      
      const color = colorMap[part.color] || part.color || '#FFFFFF'
      
      return [{
        text,
        color,
        bold: part.bold,
        italic: part.italic,
        underlined: part.underlined,
        strikethrough: part.strikethrough
      }]
    }

    let result: MessagePart[] = []

 
    if (jsonMsg.json?.extra) {
      result = jsonMsg.json.extra.flatMap(formatPart)
    }
    else if (jsonMsg.extra) {
      result = jsonMsg.extra.flatMap(formatPart)
    }
    else if (jsonMsg.text) {
      result = formatPart(jsonMsg)
    }
    return result
  }

  useEffect(() => {
    if (botInstances.length > 0 && !socketRef.current) {
      socketRef.current = io('ws://localhost:3500')
      const socket = socketRef.current
   
      socket.on("bot-message", (data: BotMessage) => {
        const parsedMessage = parseMinecraftMessage(data.message)
        
        if (parsedMessage.length > 0) {
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
      socketRef.current.emit('message', {msg: `${message}`, id: activeBotId})
      setMessage("")
    }
    msgInputRef.current?.focus()
  }

  const activeBot = botInstances.find(bot => bot.id === activeBotId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeBot?.messages])

  return (
    <>
      <div className="absolute top-4 left-4 z-10">
        <p className="text-white text-lg">Signed in as: <span className="font-semibold">{username}</span></p>
      </div>
      <div className="flex h-screen max-w-6xl mx-auto p-4 gap-4 min-h-0">
        <div className="w-56 p-3 mc-sidebar flex-shrink-0">
        <h3 className="text-xl font-semibold mb-4 text-white">Servers</h3>
        {botInstances.map(bot => (
          <button
            key={bot.id}
            onClick={() => {
              playButtonClick()
              setActiveBotId(bot.id)
            }}
            className={`mc-button my-2 ${activeBotId === bot.id ? 'ring-2 ring-white' : ''}`}
            style={{ width: '100%', height: 'auto', minHeight: '40px' }}
          >
            <div className="title break-words text-sm px-2">
              {bot.host}
            </div>
          </button>
        ))}
        
        <form onSubmit={addServer} className="mt-4">
          <input 
            type="text" 
            placeholder="Server IP"
            value={newServerIp}
            onChange={(e) => setNewServerIp(e.target.value)}
            disabled={isAddingServer}
            className="mc-input w-full"
          />
          <button 
            type="submit" 
            disabled={isAddingServer}
            onClick={playButtonClick}
            className="mt-2 mc-button full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="title">{isAddingServer ? '...' : 'Add Server'}</div>
          </button>
        </form>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {activeBot ? (
          <>
            <div className="text-center p-4 flex-shrink-0">
              <h2 className="text-2xl font-semibold text-white">
                IP: {activeBot.host}
              </h2>
            </div>
            <ul className="flex-1 overflow-y-auto p-4 mc-chat-feed mb-4 list-none minimal-scrollbar min-h-0">
              {activeBot.messages.map((msgParts: MessagePart[], index: number) => (
                <li 
                  key={index} 
                  className="mb-1 leading-tight"
                >
                  {msgParts.map((part, partIndex) => (
                    <MessagePart key={partIndex} {...part} />
                  ))}
                </li>
              ))}
              <div ref={messagesEndRef} />
            </ul>
            <form onSubmit={sendMessage} className="flex gap-4 mt-auto p-4">
              <input 
                ref={msgInputRef}
                type="text" 
                placeholder="Your message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mc-input flex-1"
              />
              <button 
                type="submit"
                className="mc-button"
                style={{ width: 'auto', minWidth: '150px' }}
              >
                <div className="title">Send</div>
              </button>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-neutral-400 text-xl">Add a server to start chatting</p>
          </div>
        )}
      </div>
      </div>
    </>
  )
}