import type { CharBerryAPI } from '../preload/preload'

declare global {
  interface Window {
    charberry: CharBerryAPI
  }
}
