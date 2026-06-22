import { Link } from 'react-router-dom'
import { RiArrowRightSLine } from 'react-icons/ri'

export default function PageHeader({ title, breadcrumbs = [], actions }) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        <h1>{title}</h1>
        {breadcrumbs.length > 0 && (
          <div className="page-breadcrumb">
            {breadcrumbs.map((crumb, idx) => (
              <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {idx > 0 && <RiArrowRightSLine className="page-breadcrumb-sep" />}
                {crumb.path ? (
                  <Link to={crumb.path}>{crumb.label}</Link>
                ) : (
                  <span className="page-breadcrumb-current">{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
      {actions && <div className="page-header-right">{actions}</div>}
    </div>
  )
}
