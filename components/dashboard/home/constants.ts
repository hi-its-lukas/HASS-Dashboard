import { Lightbulb, Blinds, Sun, Thermometer, Bot, Lock } from 'lucide-react'

export type TabId = 'lights' | 'covers' | 'awnings' | 'climate' | 'vacuum' | 'locks'

export const TABS: { id: TabId; label: string; icon: typeof Lightbulb; bgColor: string; textColor: string }[] = [
  { id: 'lights', label: 'Licht', icon: Lightbulb, bgColor: 'rgba(255, 255, 255, 0.15)', textColor: '#ffffff' },
  { id: 'covers', label: 'Rollos', icon: Blinds, bgColor: 'rgba(255, 255, 255, 0.15)', textColor: '#ffffff' },
  { id: 'awnings', label: 'Markisen', icon: Sun, bgColor: 'rgba(255, 255, 255, 0.15)', textColor: '#ffffff' },
  { id: 'climate', label: 'Klima', icon: Thermometer, bgColor: 'rgba(255, 255, 255, 0.15)', textColor: '#ffffff' },
  { id: 'vacuum', label: 'Staubsauger', icon: Bot, bgColor: 'rgba(255, 255, 255, 0.15)', textColor: '#ffffff' },
  { id: 'locks', label: 'Schlösser', icon: Lock, bgColor: 'rgba(255, 255, 255, 0.15)', textColor: '#ffffff' },
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
