import type { WeightRecordResponse } from '@xiaowoniu/shared'
import { Scale } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts'

interface WeightChartProps {
  records: WeightRecordResponse[]
  loading?: boolean
}

const timeNames: Record<WeightRecordResponse['timeOfDay'], string> = { morning: '早上', evening: '晚上' }

export function sortWeightRecords(records: readonly WeightRecordResponse[]) {
  return [...records].sort((a, b) => a.date.localeCompare(b.date) || (a.timeOfDay === b.timeOfDay ? 0 : a.timeOfDay === 'morning' ? -1 : 1))
}

function chineseDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return `${year}年${month}月${day}日`
}

function WeightTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const record = payload[0].payload as WeightRecordResponse
  return <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-sm"><p className="font-medium text-foreground">{chineseDate(record.date)} · {timeNames[record.timeOfDay]}</p><p className="mt-1 text-primary">{record.weightKg} kg</p></div>
}

export default function WeightChart({ records, loading = false }: WeightChartProps) {
  const sorted = sortWeightRecords(records)
  return (
    <section className="fitness-panel" aria-labelledby="weight-chart-title" aria-busy={loading}>
      <div className="border-b border-stone-200 pb-4">
        <p className="fitness-kicker">体重趋势</p>
        <h2 id="weight-chart-title" className="text-xl font-semibold text-stone-900">体重记录</h2>
      </div>
      {sorted.length === 0 ? (
        <div className="flex h-[300px] flex-col items-center justify-center text-center text-stone-500">
          <Scale aria-hidden="true" className="mb-3 h-8 w-8 text-stone-400" />
          <p className="font-medium text-stone-700">还没有体重记录</p>
          <p className="mt-1 text-sm">记录一次体重后，趋势会显示在这里。</p>
        </div>
      ) : (
        <>
          <div className="h-[300px] min-w-0 pt-5" aria-label="体重趋势折线图">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sorted} margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
                <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5).replace('-', '/')} stroke="#78716c" fontSize={12} />
                <YAxis dataKey="weightKg" domain={['dataMin - 1', 'dataMax + 1']} stroke="#78716c" fontSize={12} unit="kg" />
                <Tooltip content={<WeightTooltip />} />
                <Line type="monotone" dataKey="weightKg" stroke="#15803d" strokeWidth={2.5} dot={{ r: sorted.length === 1 ? 5 : 3, fill: '#15803d', strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ol className="mt-2 border-t border-stone-200" aria-label="最近体重">
            {sorted.slice(-3).reverse().map((record) => <li key={record.id} className="flex items-center justify-between gap-3 border-b border-stone-100 py-3 text-sm"><span className="text-stone-600">{chineseDate(record.date)} · {timeNames[record.timeOfDay]}</span><strong className="text-stone-900">{record.weightKg} kg</strong></li>)}
          </ol>
        </>
      )}
    </section>
  )
}
