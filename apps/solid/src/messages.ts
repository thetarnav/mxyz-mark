import messages from './messages.json'
import * as t from 'src/lib/trigonometry'

export const getWelcomeMessage = () => {
    const welcomeMessage = t.pickRandom(messages.welcome)
    return {
        greeting: welcomeMessage[0] ?? '',
        explanation: welcomeMessage[1] ?? '',
        farewell: welcomeMessage[2] ?? '',
    }
}
