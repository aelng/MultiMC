import buttonClickSound from '../assets/click.mp3'

let audio: HTMLAudioElement | null = null

export const playButtonClick = () => {
  try {
    audio = new Audio(buttonClickSound)
    audio.volume = 0.5
    audio.play().catch(err => console.error('Error playing sound:', err))
  } catch (err) {
    console.error('Error creating audio:', err)
  }
}

