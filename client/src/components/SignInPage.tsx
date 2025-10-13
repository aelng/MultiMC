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
    <div className="signin-container">
      <h1>Chat App</h1>
      <form onSubmit={handleSubmit} className="signin-form">
        <input 
          type="text" 
          placeholder="Enter your IGN"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />
        <button type="submit">Sign In</button>
      </form>
    </div>
  )
}