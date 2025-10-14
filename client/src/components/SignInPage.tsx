import { useState, useEffect, FormEvent } from 'react'
import { playButtonClick } from '../utils/sounds'

interface SignInPageProps {
  onSignIn: (username: string) => void
}

interface AuthData {
  user_code: string;
  device_code: string;
  interval: number;
  expires_in: number;
  verification_uri: string;
}

export default function SignInPage({ onSignIn }: SignInPageProps): React.ReactElement {
  const [username, setUsername] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [loadingDots, setLoadingDots] = useState<string>('.')

  useEffect(() => {
    if (!isLoading) return

    const interval = setInterval(() => {
      setLoadingDots((prev) => {
        if (prev === '.') return '..'
        if (prev === '..') return '...'
        return '.'
      })
    }, 500)

    return () => clearInterval(interval)
  }, [isLoading])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:3500/api/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: username }),
      });

      const data: AuthData = await response.json();
      //console.log(data);
      if (data.verification_uri) {
        window.open(`${data.verification_uri}?otc=${data.user_code}`, '_blank');
      }

      onSignIn(username);
      } catch (err) {
        console.error('Error:', err);
        setIsLoading(false)
      }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
      <h1 className="text-5xl md:text-6xl font-bold text-white mb-8">Chat App</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md px-4">
        <input 
          type="text" 
          placeholder="Enter your IGN"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          disabled={isLoading}
          className="mc-input text-xl disabled:cursor-not-allowed"
        />
        <button 
          type="submit"
          disabled={isLoading}
          onClick={playButtonClick}
          className="mc-button disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ width: '100%', height: '50px' }}
        >
          <div className="title text-xl">
            {isLoading ? loadingDots : 'Sign In'}
          </div>
        </button>
      </form>
    </div>
  )
}