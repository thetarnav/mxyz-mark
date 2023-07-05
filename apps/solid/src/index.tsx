import '@unocss/reset/tailwind-compat.css'
import 'virtual:uno.css'
import './root.css'

import * as solid_web from 'solid-js/web'
import { Game } from './game'

solid_web.render(() => <Game />, document.getElementById('root')!)

document.body.classList.add('loaded')
