import { useState, FormEvent } from 'react'

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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
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
      }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
      <h1 className="text-5xl md:text-6xl font-bold text-blue-500 mb-8">Chat App</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md px-4">
        <input 
          type="text" 
          placeholder="Enter your IGN"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          className="p-4 text-xl bg-gray-700 text-white rounded-lg border-none placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button 
          type="submit"
          className="p-4 text-xl bg-blue-600 text-white rounded-lg border-none cursor-pointer hover:bg-blue-700 transition-colors"
        >
          Sign In
        </button>
      </form>
    </div>
  )
}