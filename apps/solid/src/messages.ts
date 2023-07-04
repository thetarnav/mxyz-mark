import messages from '../../../data/messages.json'
import { math } from 'src/lib'

export const getWelcomeMessage = () => {
    const welcomeMessage = math.pickRandom(messages.welcome)
    return {
        greeting: welcomeMessage[0] ?? '',
        explanation: welcomeMessage[1] ?? '',
        farewell: welcomeMessage[2] ?? '',
    }
}
