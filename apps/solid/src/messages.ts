import messages_data from '../../../data/messages.json'
import { math } from 'src/lib'

export class MenuMessagesWelcome {
    greeting: string = math.pickRandom(messages_data.greeting)
    arrows: string = math.pickRandom(messages_data.arrows)
    reset: string = math.pickRandom(messages_data.reset)
    farewell: string = math.pickRandom(messages_data.farewell)
}

export class MenuMessagesNextFloor {
    new_floor: number
    next_floor: string = math.pickRandom(messages_data.next_floor)
    farewell: string = math.pickRandom(messages_data.farewell)

    constructor(floor: number) {
        this.new_floor = floor
    }
}

export type MenuMessages = MenuMessagesWelcome | MenuMessagesNextFloor
