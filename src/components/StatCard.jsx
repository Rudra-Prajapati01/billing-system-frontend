import { RiArrowUpLine, RiArrowDownLine } from 'react-icons/ri'

export default function StatCard({ label, value, icon, iconBg, trend, trendValue, trendLabel }) {
  const isUp = trend === 'up'

  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: iconBg }}>
        {icon}
      </div>
      <div className="stat-card-body">
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-footer">
          <span className={`stat-badge ${isUp ? 'up' : 'down'}`}>
            {isUp ? <RiArrowUpLine /> : <RiArrowDownLine />}
            {trendValue}
          </span>
          <span>{trendLabel}</span>
        </div>
      </div>
    </div>
  )
}
