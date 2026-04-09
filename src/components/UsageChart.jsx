import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'

const COLORS = ['#111827', '#6b7280', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export function DailyAccessChart({ data }) {
  if (!data || data.length === 0) return <EmptyChart message="No access data yet" />
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="accessGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#111827" stopOpacity={0.1} />
            <stop offset="95%" stopColor="#111827" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickFormatter={(d) => d.slice(5)}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} width={30} />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#111827"
          strokeWidth={2}
          fill="url(#accessGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function ModelDistChart({ data }) {
  if (!data || data.length === 0) return <EmptyChart message="No model data yet" />
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={75}
          dataKey="count"
          nameKey="model"
          label={({ model, percent }) => `${model} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function TopSkillsChart({ data }) {
  if (!data || data.length === 0) return <EmptyChart message="No skill access data yet" />
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10, fill: '#6b7280' }}
          width={120}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            border: '1px solid #e5e7eb',
            borderRadius: 8,
          }}
        />
        <Bar dataKey="count" fill="#111827" radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function EmptyChart({ message }) {
  return (
    <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
      {message}
    </div>
  )
}
