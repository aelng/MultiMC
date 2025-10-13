import { useState } from 'react'
import SignInPage from './components/SignInPage'
import ChatPage from './components/ChatPage'
import './App.css'

function App(): React.ReactElement {
  const [currentUser, setCurrentUser] = useState<string | null>(null)

  const handleSignIn = (username: string): void => {
    setCurrentUser(username)
  }

  return (
    <div className="min-h-screen bg-gray-800 text-white">
      {currentUser ? <ChatPage username={currentUser}/> : <SignInPage onSignIn={handleSignIn} />}
    </div>
  )
}

export default App