import * as solid_web from 'solid-js/web'
import * as game from './game'

import '@unocss/reset/tailwind-compat.css'
import 'virtual:uno.css'
import './root.css'

solid_web.render(() => <game.Game />, document.getElementById('root')!)
