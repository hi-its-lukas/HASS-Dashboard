import { Lightbulb, Blinds, Sun, Thermometer, Bot, Lock } from 'lucide-react'

export type TabId = 'lights' | 'covers' | 'awnings' | 'climate' | 'vacuum' | 'locks'

export const TABS: { id: TabId; label: string; icon: typeof Lightbulb; bgColor: string; textColor: string }[] = [
  { id: 'lights', label: 'Licht', icon: Lightbulb, bgColor: 'rgba(255, 204, 0, 0.2)', textColor: '#ffcc00' },
  { id: 'covers', label: 'Rollos', icon: Blinds, bgColor: 'rgba(168, 85, 247, 0.2)', textColor: '#a855f7' },
  { id: 'awnings', label: 'Markisen', icon: Sun, bgColor: 'rgba(245, 158, 11, 0.2)', textColor: '#f59e0b' },
  { id: 'climate', label: 'Klima', icon: Thermometer, bgColor: 'rgba(255, 149, 0, 0.2)', textColor: '#ff9500' },
  { id: 'vacuum', label: 'Staubsauger', icon: Bot, bgColor: 'rgba(100, 210, 255, 0.2)', textColor: '#64d2ff' },
  { id: 'locks', label: 'Schlösser', icon: Lock, bgColor: 'rgba(192, 132, 252, 0.2)', textColor: '#c084fc' },
]

export const COLOR_PRESETS = [
  { name: 'Warmweiß', rgb: [255, 180, 107], kelvin: 2700 },
  { name: 'Neutralweiß', rgb: [255, 228, 206], kelvin: 4000 },
  { name: 'Kaltweiß', rgb: [255, 255, 255], kelvin: 6500 },
  { name: 'Rot', rgb: [255, 0, 0] },
  { name: 'Orange', rgb: [255, 165, 0] },
  { name: 'Gelb', rgb: [255, 255, 0] },
  { name: 'Grün', rgb: [0, 255, 0] },
  { name: 'Cyan', rgb: [0, 255, 255] },
  { name: 'Blau', rgb: [0, 0, 255] },
  { name: 'Lila', rgb: [128, 0, 255] },
  { name: 'Pink', rgb: [255, 0, 128] },
]
