import messages from '../../../data/messages.json'
import { math } from 'src/lib'

export const getWelcomeMessage = () => {
    return {
        greeting: math.pickRandom(messages.greeting) ?? '',
        arrows: math.pickRandom(messages.arrows) ?? '',
        reset: math.pickRandom(messages.reset) ?? '',
        farewell: math.pickRandom(messages.farewell) ?? '',
    }
}
