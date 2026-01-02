'use client'

import { usePowerTrend } from '@/lib/ha'
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from 'recharts'

export function PowerTrendChart() {
  const data = usePowerTrend()

  const chartData = data.map((d, i) => ({
    time: i,
    value: d.value,
    avg: d.avg,
  }))

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">Power Trend</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-accent-cyan" />
            <span className="text-text-secondary">Now</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-text-muted" />
            <span className="text-text-secondary">Avg</span>
          </div>
        </div>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickFormatter={(v) => {
                if (v === 0) return '-6h'
                if (v === 12) return '-4h'
                if (v === 24) return '-2h'
                if (v === 36) return 'Now'
                return ''
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#151c2c',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#9ca3af' }}
              itemStyle={{ color: '#22d3ee' }}
              formatter={(value: number) => [`${value}W`, 'Power']}
            />
            <Area
              type="monotone"
              dataKey="avg"
              stroke="#6b7280"
              strokeWidth={1}
              strokeDasharray="4 4"
              fill="none"
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#22d3ee"
              strokeWidth={2}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
