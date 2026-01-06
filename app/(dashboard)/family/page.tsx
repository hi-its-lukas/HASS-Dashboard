'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarGroup } from '@/components/ui/avatar'
import { PersonCard } from '@/components/cards/person-card'
import { useHAStore, usePersonsAtHome } from '@/lib/ha'
import { useConfig } from '@/lib/config/store'

export default function FamilyPage() {
  const config = useConfig()
  const personsAtHome = usePersonsAtHome()
  const states = useHAStore((s) => s.states)
  
  const homePersons = config.persons.filter(
    (p) => states[p.entityId]?.state === 'home'
  )

  return (
    <div className="px-4 py-6 safe-top max-w-7xl mx-auto">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-white">Family</h1>
        <p className="text-sm text-text-secondary">Updated just now</p>
      </motion.header>

      {/* At home summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card accent="cyan" className="mb-6">
          <div className="p-4">
            <span className="text-xs font-medium text-accent-cyan uppercase tracking-wider">
              At Home
            </span>
            <div className="flex items-center justify-between mt-2">
              <div>
                <span className="text-5xl font-bold text-white">{personsAtHome}</span>
                <p className="text-sm text-text-secondary mt-1">
                  {personsAtHome === config.persons.length
                    ? 'Everyone is home'
                    : `${personsAtHome} of ${config.persons.length} home`}
                </p>
              </div>
              <AvatarGroup>
                {homePersons.map((person) => (
                  <Avatar
                    key={person.id}
                    name={person.name}
                    src={person.avatarUrl}
                    size="lg"
                  />
                ))}
              </AvatarGroup>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Activity section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
          Activity
        </h2>
        {config.persons.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-text-secondary mb-2">No family members configured</p>
            <a href="/settings" className="text-accent-cyan hover:underline text-sm">
              Go to Settings to select your persons
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {config.persons.map((person, index) => (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <PersonCard person={person} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>
    </div>
  )
}
