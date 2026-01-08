'use client'

import { motion } from 'framer-motion'
import { EnergyCard } from '@/components/cards/energy-card'
import { EnergyFlow } from '@/components/cards/energy-flow'
import { PowerTrendChart } from '@/components/cards/power-trend-chart'
import { ApplianceCard } from '@/components/cards/appliance-card'
import { useEnergy } from '@/lib/ha'
import { useConfig } from '@/lib/config/store'

export default function EnergyPage() {
  const config = useConfig()
  const energy = useEnergy()

  return (
    <div className="px-4 py-6 safe-top max-w-7xl mx-auto">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-6"
      >
        <h1 className="text-2xl font-bold text-white">Energie</h1>
      </motion.header>

      {/* Desktop: Three column layout */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Left column - Energy cards */}
        <div className="lg:col-span-2">
          {/* Energy cards grid */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3 mb-4"
          >
            <EnergyCard
              type="solar"
              value={energy.solar}
              subLabel="Production"
            />
            <EnergyCard
              type="battery"
              value={energy.battery}
              subLabel={energy.batteryPower > 0 ? 'Charging' : 'Discharging'}
              batteryLevel={energy.battery}
            />
            <EnergyCard
              type="grid"
              value={energy.grid}
              subLabel={energy.grid > 0 ? 'Importing' : 'Exporting'}
            />
            <EnergyCard
              type="house"
              value={energy.house}
              subLabel="Consumption"
            />
          </motion.section>

          {/* Energy Flow Visualization */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-4"
          >
            <EnergyFlow
              solar={energy.solar}
              battery={energy.batteryPower}
              batteryLevel={energy.battery}
              grid={energy.grid}
              house={energy.house}
            />
          </motion.section>

          {/* Power trend chart */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <PowerTrendChart />
          </motion.section>
        </div>

        {/* Right column - Consumers and Switches */}
        <div className="space-y-6">
          {/* Consumers (Sensors only) */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
              Verbraucher
            </h2>
            {config.appliances.filter(a => a.entityId.startsWith('sensor.')).length === 0 ? (
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-text-secondary text-sm">Keine Verbraucher konfiguriert</p>
              </div>
            ) : (
              <div className="space-y-2">
                {config.appliances
                  .filter(a => a.entityId.startsWith('sensor.'))
                  .map((appliance) => (
                    <ApplianceCard
                      key={appliance.id}
                      name={appliance.name}
                      entityId={appliance.entityId}
                      icon={appliance.icon}
                    />
                  ))}
              </div>
            )}
          </motion.section>

          {/* Switches */}
          {config.appliances.filter(a => !a.entityId.startsWith('sensor.')).length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
                Schalter
              </h2>
              <div className="space-y-2">
                {config.appliances
                  .filter(a => !a.entityId.startsWith('sensor.'))
                  .map((appliance) => (
                    <ApplianceCard
                      key={appliance.id}
                      name={appliance.name}
                      entityId={appliance.entityId}
                      icon={appliance.icon}
                    />
                  ))}
              </div>
            </motion.section>
          )}
        </div>
      </div>
    </div>
  )
}
