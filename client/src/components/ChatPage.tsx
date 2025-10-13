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
    <div className="flex h-screen max-w-6xl mx-auto">
      {/* Sidebar */}
      <div className="w-56 border-r border-gray-600 p-3 bg-gray-900">
        <h3 className="text-xl font-semibold mb-4 text-gray-200">Servers</h3>
        {botInstances.map(bot => (
          <div
            key={bot.id}
            onClick={() => setActiveBotId(bot.id)}
            className={`p-3 my-2 cursor-pointer rounded-lg break-words transition-colors ${
              activeBotId === bot.id 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            {bot.host}
          </div>
        ))}
        
        <form onSubmit={addServer} className="mt-4">
          <input 
            type="text" 
            placeholder="Server IP"
            value={newServerIp}
            onChange={(e) => setNewServerIp(e.target.value)}
            disabled={isAddingServer}
            className="w-full p-2 bg-gray-700 text-white rounded-lg border-none placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button 
            type="submit" 
            disabled={isAddingServer}
            className="mt-2 w-full p-2 bg-blue-600 text-white rounded-lg border-none cursor-pointer hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAddingServer ? '...' : '+'}
          </button>
        </form>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeBot ? (
          <>
            <div className="text-center p-4 border-b-2 border-gray-600">
              <h2 className="text-2xl font-semibold text-blue-500">
                Chat - {username} @ {activeBot.host}
              </h2>
            </div>
            <ul className="flex-1 overflow-y-auto p-4 bg-gray-700 rounded-lg m-4 min-h-[400px] max-h-[500px] list-none">
              {activeBot.messages.map((msg: string, index: number) => (
                <li 
                  key={index} 
                  dangerouslySetInnerHTML={{ __html: msg }}
                  className="mb-2 p-2 bg-gray-600 rounded"
                />
              ))}
            </ul>
            <form onSubmit={sendMessage} className="flex gap-1 mt-auto p-4">
              <input 
                ref={msgInputRef}
                type="text" 
                placeholder="Your message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 p-3 bg-gray-700 text-white rounded-lg border-none placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg border-none cursor-pointer hover:bg-blue-700 transition-colors"
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-xl">Add a server to start chatting</p>
          </div>
        )}
      </div>
    </div>
  )
}