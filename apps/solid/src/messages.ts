import messages from './messages.json'
import { t } from 'src/lib'

export const getWelcomeMessage = () => {
    const welcomeMessage = t.pickRandom(messages.welcome)
    return {
        greeting: welcomeMessage[0] ?? '',
        explanation: welcomeMessage[1] ?? '',
        farewell: welcomeMessage[2] ?? '',
    }
}
