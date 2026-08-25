import SiteSetting from '../models/mysql/SiteSetting.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { banIp, unbanIp } from '../middleware/botBlocker.js'

const DISPLAY_MODE_KEY = 'display_mode'
const DEFAULT_DISPLAY_MODE = 'force-off'
const ALLOWED_DISPLAY_MODES = new Set(['force-on', 'force-off'])

const HERO_SLIDER_MODE_KEY = 'hero_slider_visible'
const DEFAULT_HERO_SLIDER_MODE = 'show'
const ALLOWED_HERO_SLIDER_MODES = new Set(['show', 'hide'])

export const SystemService = {
  async getDisplayMode() {
    const raw = await SiteSetting.get(DISPLAY_MODE_KEY)
    return ALLOWED_DISPLAY_MODES.has(raw) ? raw : DEFAULT_DISPLAY_MODE
  },

  async updateDisplayMode(modeStr, user) {
    const mode = typeof modeStr === 'string' ? modeStr.trim() : ''
    if (!ALLOWED_DISPLAY_MODES.has(mode)) {
      throw new Error('โหมดการแสดงผลไม่ถูกต้อง')
    }
    await SiteSetting.set(DISPLAY_MODE_KEY, mode, user?.username || null)
    return mode
  },

  async getHeroSliderMode() {
    const raw = await SiteSetting.get(HERO_SLIDER_MODE_KEY)
    return ALLOWED_HERO_SLIDER_MODES.has(raw) ? raw : DEFAULT_HERO_SLIDER_MODE
  },

  async updateHeroSliderMode(modeStr, user) {
    const mode = typeof modeStr === 'string' ? modeStr.trim() : ''
    if (!ALLOWED_HERO_SLIDER_MODES.has(mode)) {
      throw new Error('สถานะสไลเดอร์ไม่ถูกต้อง')
    }
    await SiteSetting.set(HERO_SLIDER_MODE_KEY, mode, user?.username || null)
    return mode
  },

  getBannedIps() {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const bannedFile = path.resolve(__dirname, '../../banned-ips.json')

    if (!fs.existsSync(bannedFile)) {
      return []
    }
    const data = fs.readFileSync(bannedFile, 'utf-8')
    return JSON.parse(data)
  },

  banIpAddress(ip) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    if (!ip || !ipRegex.test(ip)) {
      throw new Error('รูปแบบ IP Address ไม่ถูกต้อง')
    }
    const result = banIp(ip, null)
    if (!result) {
      throw new Error('ไม่สามารถบันทึกการแบนได้')
    }
    return true
  },

  unbanIpAddress(ip) {
    if (!ip) throw new Error('ระบุ IP Address')
    const result = unbanIp(ip)
    if (!result) {
      throw new Error(`ไม่พบ IP ${ip} ในรายการ`)
    }
    return true
  }
}
