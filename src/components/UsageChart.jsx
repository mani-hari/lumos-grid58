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

const MONO_COLORS = ['#000', '#333', '#555', '#777', '#999', '#bbb', '#ddd']

const tooltipStyle = {
  fontSize: 12,
  border: '1px solid #222',
  borderRadius: 4,
  background: '#fff',
  boxShadow: 'none',
}

export function DailyAccessChart({ data }) {
  if (!data || data.length === 0) return <EmptyChart message="No access data yet" />
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#aaa' }}
          tickFormatter={(d) => d.slice(5)}
          interval="preserveStartEnd"
          stroke="#e5e5e5"
        />
        <YAxis tick={{ fontSize: 10, fill: '#aaa' }} width={30} stroke="#e5e5e5" />
        <Tooltip contentStyle={tooltipStyle} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#000"
          strokeWidth={1.5}
          fill="#f5f5f5"
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
          stroke="#fff"
          strokeWidth={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={MONO_COLORS[i % MONO_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function TopSkillsChart({ data }) {
  if (!data || data.length === 0) return <EmptyChart message="No skill access data yet" />
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: '#aaa' }} stroke="#e5e5e5" />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10, fill: '#666' }}
          width={120}
          stroke="#e5e5e5"
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="count" fill="#000" radius={[0, 2, 2, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function EmptyChart({ message }) {
  return (
    <div className="flex items-center justify-center" style={{ height: 200, fontSize: 13, color: '#aaa' }}>
      {message}
    </div>
  )
}
