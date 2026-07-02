import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import {
  FiArrowUp,
  FiArrowDown,
  FiMoreVertical,
  FiUsers,
  FiBriefcase,
  FiDollarSign,
  FiActivity,
  FiPieChart,
  FiUserPlus
} from "react-icons/fi";
import apiClient from "../services/apiClient";

/* ---------------------------------------------------------------------- */
/*  Small reusable bits                                                   */
/* ---------------------------------------------------------------------- */

const Sparkline = ({ color }) => {
  const options = {
    chart: { sparkline: { enabled: true } },
    colors: [color],
    plotOptions: { bar: { columnWidth: "55%", borderRadius: 2 } },
    tooltip: { enabled: false },
  };
  const series = [{ data: [4, 7, 5, 9, 6, 10, 8] }];
  return <Chart options={options} series={series} type="bar" height={48} width={90} />;
};

const RadialMini = ({ color }) => {
  const options = {
    chart: { sparkline: { enabled: true } },
    colors: [color],
    stroke: { width: 8 },
    plotOptions: {
      radialBar: {
        hollow: { size: "60%" },
        track: { background: "#d7deea", strokeWidth: "100%" },
        dataLabels: { show: false },
      },
    },
  };
  return <Chart options={options} series={[70]} type="radialBar" height={56} width={56} />;
};

const StatCard = ({ card }) => (
  <div className="mn-stat-card">
    <div className="mn-stat-card__top">
      <div>
        <h3 className="mn-stat-card__value">{card.value}</h3>
        <p className="mn-stat-card__label">{card.label}</p>
      </div>
      <div className="mn-stat-card__spark">
        {card.spark === "bar" ? (
          <Sparkline color={card.color} />
        ) : card.spark === "radial" ? (
          <RadialMini color={card.color} />
        ) : (
          <div style={{ color: card.color, backgroundColor: card.color + "20", padding: "12px", borderRadius: "10px" }}>
            {card.icon}
          </div>
        )}
      </div>
    </div>
    {card.delta && (
      <div className="mn-stat-card__footer">
        <span
          className={
            "mn-stat-card__delta " +
            (card.trend === "up" ? "mn-stat-card__delta--up" : card.trend === "down" ? "mn-stat-card__delta--down" : "")
          }
        >
          {card.trend === "up" ? <FiArrowUp size={12} /> : card.trend === "down" ? <FiArrowDown size={12} /> : null}
          {card.delta}
        </span>
        <span className="mn-stat-card__since">Overall</span>
      </div>
    )}
  </div>
);

const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val || 0);
const formatNumber = (val) => Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const colorsArray = ["#5156be", "#299cdb", "#0ab39c", "#f7b84b", "#7e3af2"];

/* ---------------------------------------------------------------------- */
/*  CompanyDashboard                                                       */
/* ---------------------------------------------------------------------- */

const CompanyDashboard = ({ data, range, setRange, productsRange, setProductsRange, customersRange, setCustomersRange, activityType, setActivityType, leadRange, setLeadRange }) => {
  const statCards = [
    { label: "Total Revenue", value: formatCurrency(data.totalRevenue), delta: "N/A", trend: "up", spark: "bar", color: "#5156be" },
    { label: "Total Invoices", value: formatNumber(data.totalInvoices), delta: "N/A", trend: "up", spark: "radial", color: "#0ab39c" },
    { label: "Total Customers", value: formatNumber(data.totalCustomers), delta: "N/A", trend: "up", spark: "radial", color: "#299cdb" },
    { label: "Pending Amount", value: formatCurrency(data.pendingAmount), delta: "N/A", trend: "down", spark: "bar", color: "#f7b84b" },
  ];

  const totalTopQty = data.topProducts?.reduce((sum, p) => sum + parseFloat(p.totalQty), 0) || 1;

  const salesChartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "inherit" },
    stroke: { width: [0, 0, 3], curve: "smooth" },
    fill: { type: ["solid", "gradient", "solid"], gradient: { opacityFrom: 0.45, opacityTo: 0.05 } },
    colors: ["#5156be", "#eef0f4", "#f7b84b"],
    plotOptions: { bar: { columnWidth: "45%", borderRadius: 3 } },
    dataLabels: { enabled: false },
    legend: { position: "bottom", markers: { radius: 12 }, labels: { colors: "#7a7f9a" } },
    grid: { borderColor: "#eef0f4", strokeDashArray: 4 },
    xaxis: { categories: data.chartData?.months || [], axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: "#9aa0bb", fontSize: "12px" } } },
    yaxis: { title: { text: "Amount (INR)", style: { color: "#9aa0bb" } }, labels: { style: { colors: "#9aa0bb" }, formatter: (value) => formatNumber(value) } },
    tooltip: { shared: true, y: { formatter: (value) => formatNumber(value) } },
  };

  const salesChartSeries = [
    { name: "Revenue", type: "column", data: data.chartData?.revenue || [] },
    { name: "Collections", type: "area", data: data.chartData?.collections || [] },
    { name: "Invoices", type: "line", data: data.chartData?.invoices || [] },
  ];

  const leadStatusEntries = Object.entries(data.leadStatusSummary || {});

  const rangeOptions = [
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "quarter", label: "This Quarter" },
    { value: "year", label: "This Year" },
  ];

  return (
    <>
      <div className="mn-page-header">
        <h2 className="mn-page-title">Dashboard</h2>
        <div className="mn-breadcrumb">
          <span>Billing</span>
          <span className="mn-breadcrumb__sep">/</span>
          <span className="mn-breadcrumb__current">Dashboard</span>
        </div>
      </div>

      <div className="row g-3 mn-row">
        {statCards.map((card) => (
          <div className="col-12 col-sm-6 col-xl-3" key={card.label}>
            <StatCard card={card} />
          </div>
        ))}
      </div>

      <div className="row g-3 mn-row">
        <div className="col-12 col-xl-8">
          <div className="mn-card mn-card--chart">
            <div className="mn-card__header">
              <h3 className="mn-card__title">Sales Analytics</h3>
              <div className="mn-sortby">
                Sort By: 
                <select value={range} onChange={(e) => setRange(e.target.value)} style={{ border: 'none', fontWeight: 'bold', background: 'transparent', cursor: 'pointer', outline: 'none', marginLeft: '5px' }}>
                  {rangeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="mn-chart-stats">
              <div className="mn-chart-stats__item">
                <span className="mn-chart-stats__value mn-chart-stats__value--accent">{formatCurrency(data.chartData?.revenue?.reduce((a,b)=>a+b, 0))}</span>
                <span className="mn-chart-stats__label">Total Income</span>
              </div>
              <div className="mn-chart-stats__item">
                <span className="mn-chart-stats__value">{formatNumber(data.chartData?.invoices?.reduce((a,b)=>a+b, 0))}</span>
                <span className="mn-chart-stats__label">Sales</span>
              </div>
              <div className="mn-chart-stats__item">
                <span className="mn-chart-stats__value">{formatCurrency(data.chartData?.collections?.reduce((a,b)=>a+b, 0))}</span>
                <span className="mn-chart-stats__label">Collections</span>
              </div>
            </div>

            <Chart options={salesChartOptions} series={salesChartSeries} type="line" height={330} />
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="mn-card mn-top-products">
            <div className="mn-card__header">
              <h3 className="mn-card__title">Top Selling Products</h3>
              <div className="mn-sortby">
                Sort By: 
                <select value={productsRange} onChange={(e) => setProductsRange(e.target.value)} style={{ border: 'none', fontWeight: 'bold', background: 'transparent', cursor: 'pointer', outline: 'none', marginLeft: '5px' }}>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                  <option value="overall">Overall</option>
                </select>
              </div>
            </div>

            <ul className="mn-top-products__list">
              {data.topProducts?.map((p, index) => {
                const color = colorsArray[index % colorsArray.length];
                const percent = Math.min(100, Math.round((p.totalQty / totalTopQty) * 100));
                return (
                <li key={p.name} className="mn-top-products__item">
                  <span className="mn-top-products__dot" style={{ background: color }} />
                  <span className="mn-top-products__name">{p.name} ({formatNumber(p.totalQty)})</span>
                  <span className="mn-top-products__bar">
                    <span className="mn-top-products__bar-fill" style={{ width: `${percent}%`, background: color }} />
                  </span>
                </li>
              )})}
              {!data.topProducts?.length && (
                <li className="mn-top-products__item">
                  <span className="mn-top-products__name">0 products sold</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="row g-3 mn-row">
        <div className="col-12 col-xl-4">
          <div className="mn-card">
            <div className="mn-card__header">
              <h3 className="mn-card__title">Latest Customers</h3>
              <div className="mn-sortby">
                <select value={customersRange} onChange={(e) => setCustomersRange(e.target.value)} style={{ border: 'none', fontWeight: 'bold', background: 'transparent', cursor: 'pointer', outline: 'none' }}>
                  <option value="recent">Recent</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </select>
              </div>
            </div>
            <ul className="mn-simple-list">
              {data.latestCustomers?.map((c, i) => (
                <li key={i} className="mn-simple-list__item">
                  <img className="mn-simple-list__avatar" src={`https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random`} alt={c.name} />
                  <div className="mn-simple-list__body">
                    <span className="mn-simple-list__title">{c.name}</span>
                    <span className="mn-simple-list__sub">{c.company || "N/A"}</span>
                  </div>
                  <span className="mn-simple-list__amount" style={{fontSize: "12px", color: "#9aa0bb"}}>{c.city}</span>
                </li>
              ))}
              {!data.latestCustomers?.length && <div style={{padding: "1rem"}}>0 customers found</div>}
            </ul>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="mn-card">
            <div className="mn-card__header">
              <h3 className="mn-card__title">Recent Activity</h3>
              <div className="mn-sortby">
                <select value={activityType} onChange={(e) => setActivityType(e.target.value)} style={{ border: 'none', fontWeight: 'bold', background: 'transparent', cursor: 'pointer', outline: 'none' }}>
                  <option value="system">System</option>
                  <option value="invoices">Invoices</option>
                  <option value="payments">Payments</option>
                  <option value="leads">Leads</option>
                  <option value="customers">Customers</option>
                  <option value="quotations">Quotations</option>
                </select>
              </div>
            </div>
            <ul className="mn-timeline" style={{ maxHeight: "350px", overflowY: "auto" }}>
              {data.recentActivities?.map((a, i) => (
                <li key={i} className="mn-timeline__item">
                  <span className="mn-timeline__dot" />
                  <div className="mn-timeline__body">
                    <span className="mn-timeline__title">{a.title}</span>
                    <span className="mn-timeline__time">{a.time}</span>
                  </div>
                  <FiMoreVertical className="mn-timeline__more" size={14} />
                </li>
              ))}
              {!data.recentActivities?.length && <div style={{padding: "1rem"}}>0 activities found</div>}
            </ul>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="mn-card">
            <div className="mn-card__header">
              <h3 className="mn-card__title">Lead Status Overview</h3>
              <div className="mn-sortby">
                <select value={leadRange} onChange={(e) => setLeadRange(e.target.value)} style={{ border: 'none', fontWeight: 'bold', background: 'transparent', cursor: 'pointer', outline: 'none' }}>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </select>
              </div>
            </div>
            <ul className="mn-simple-list">
              {leadStatusEntries.map(([statusName, count], index) => {
                const color = colorsArray[index % colorsArray.length];
                return (
                <li key={statusName} className="mn-simple-list__item">
                  <span className="mn-simple-list__swatch" style={{ background: color }} />
                  <div className="mn-simple-list__body">
                    <span className="mn-simple-list__title">{statusName}</span>
                  </div>
                  <span className="mn-simple-list__amount">{formatNumber(count)}</span>
                </li>
              )})}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

/* ---------------------------------------------------------------------- */
/*  SuperAdminDashboard                                                    */
/* ---------------------------------------------------------------------- */

const SuperAdminDashboard = ({ data }) => {
  const statCards = [
    { label: "Total Companies", value: formatNumber(data.totalCompanies), delta: "N/A", trend: "up", spark: "bar", color: "#5156be" },
    { label: "Active Companies", value: formatNumber(data.activeCompanies), delta: "N/A", trend: "up", spark: "radial", color: "#0ab39c" },
    { label: "Inactive Companies", value: formatNumber(data.inactiveCompanies), delta: "N/A", trend: "down", spark: "radial", color: "#f7b84b" },
    { label: "Total Users", value: formatNumber(data.totalUsers), delta: "N/A", trend: "up", spark: "bar", color: "#299cdb" },
    { label: "Active Users", value: formatNumber(data.activeUsers), delta: "N/A", trend: "up", spark: "radial", color: "#0ab39c" },
    { label: "Inactive Users", value: formatNumber(data.inactiveUsers), delta: "N/A", trend: "down", spark: "radial", color: "#f7b84b" },
    { label: "New Companies (30d)", value: formatNumber(data.newCompanies), delta: "N/A", trend: "up", spark: "bar", color: "#7e3af2" },
    { label: "New Users (30d)", value: formatNumber(data.newUsers), delta: "N/A", trend: "up", spark: "bar", color: "#299cdb" },
  ];

  const growthChartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "inherit" },
    stroke: { width: [3, 3], curve: "smooth" },
    fill: { type: ["gradient", "gradient"], gradient: { opacityFrom: 0.45, opacityTo: 0.05 } },
    colors: ["#5156be", "#0ab39c"],
    dataLabels: { enabled: false },
    legend: { position: "bottom" },
    grid: { borderColor: "#eef0f4", strokeDashArray: 4 },
    xaxis: { categories: data.chartData?.months || [], axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { title: { text: "Registrations" } },
    tooltip: { shared: true },
  };

  const growthChartSeries = [
    { name: "New Companies", type: "area", data: data.chartData?.newCompanies || [] },
    { name: "New Users", type: "area", data: data.chartData?.newUsers || [] },
  ];

  return (
    <>
      <div className="mn-page-header">
        <h2 className="mn-page-title">Platform Overview</h2>
        <div className="mn-breadcrumb">
          <span>Platform</span>
          <span className="mn-breadcrumb__sep">/</span>
          <span className="mn-breadcrumb__current">Overview</span>
        </div>
      </div>

      <div className="row g-3 mn-row">
        {statCards.map((card) => (
          <div className="col-12 col-sm-6 col-xl-3" key={card.label}>
            <StatCard card={card} />
          </div>
        ))}
      </div>

      <div className="row g-3 mn-row">
        <div className="col-12 col-xl-8">
          <div className="mn-card mn-card--chart">
            <div className="mn-card__header">
              <h3 className="mn-card__title">Platform Analytics (Growth)</h3>
            </div>
            <Chart options={growthChartOptions} series={growthChartSeries} type="area" height={330} />
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="mn-card">
            <div className="mn-card__header">
              <h3 className="mn-card__title">Platform Status</h3>
            </div>
            <ul className="mn-simple-list">
              <li className="mn-simple-list__item">
                <div className="mn-simple-list__body">
                  <span className="mn-simple-list__title">Total Companies</span>
                </div>
                <span className="mn-simple-list__amount">{formatNumber(data.totalCompanies)}</span>
              </li>
              <li className="mn-simple-list__item">
                <div className="mn-simple-list__body">
                  <span className="mn-simple-list__title">Total Users</span>
                </div>
                <span className="mn-simple-list__amount">{formatNumber(data.totalUsers)}</span>
              </li>
              <li className="mn-simple-list__item">
                <div className="mn-simple-list__body">
                  <span className="mn-simple-list__title">Active Sessions</span>
                </div>
                <span className="mn-simple-list__amount">{formatNumber(data.activeUsers)}</span>
              </li>
              <li className="mn-simple-list__item">
                <div className="mn-simple-list__body">
                  <span className="mn-simple-list__title">System Status</span>
                </div>
                <span className="mn-badge mn-badge--success">Online</span>
              </li>
              <li className="mn-simple-list__item">
                <div className="mn-simple-list__body">
                  <span className="mn-simple-list__title">Database Status</span>
                </div>
                <span className="mn-badge mn-badge--success">Connected</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="row g-3 mn-row">
        <div className="col-12 col-xl-6">
          <div className="mn-card">
            <div className="mn-card__header">
              <h3 className="mn-card__title">Recently Registered Companies</h3>
            </div>
            <ul className="mn-simple-list">
              {data.recentCompanies?.map((c, i) => (
                <li key={i} className="mn-simple-list__item">
                  <div className="mn-simple-list__body">
                    <span className="mn-simple-list__title">{c.company_name}</span>
                    <span className="mn-simple-list__sub">{c.company_code}</span>
                  </div>
                  <span className={`mn-badge ${c.status === 'Active' ? 'mn-badge--success' : 'mn-badge--warning'}`}>
                    {c.status}
                  </span>
                </li>
              ))}
              {!data.recentCompanies?.length && <div style={{padding: "1rem"}}>No recent companies</div>}
            </ul>
          </div>
        </div>

        <div className="col-12 col-xl-6">
          <div className="mn-card">
            <div className="mn-card__header">
              <h3 className="mn-card__title">Recently Created Users</h3>
            </div>
            <ul className="mn-simple-list">
              {data.recentUsers?.map((u, i) => (
                <li key={i} className="mn-simple-list__item">
                  <div className="mn-simple-list__body">
                    <span className="mn-simple-list__title">{u.name}</span>
                    <span className="mn-simple-list__sub">{u.username} • {u.company_name || "Platform"}</span>
                  </div>
                  <span className="mn-badge mn-badge--info">
                    {u.role}
                  </span>
                </li>
              ))}
              {!data.recentUsers?.length && <div style={{padding: "1rem"}}>No recent users</div>}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

/* ---------------------------------------------------------------------- */
/*  Main Dashboard Wrapper                                                 */
/* ---------------------------------------------------------------------- */

const Dashboard = () => {
  const [range, setRange] = useState("year");
  const [productsRange, setProductsRange] = useState("overall");
  const [customersRange, setCustomersRange] = useState("recent");
  const [activityType, setActivityType] = useState("system");
  const [leadRange, setLeadRange] = useState("year");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        let isSuperAdmin = false;
        const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.role === "SuperAdmin" && user.impersonation !== true) {
            isSuperAdmin = true;
          }
        }

        const endpoint = isSuperAdmin ? "/dashboard/superadmin" : "/dashboard";

        const response = await apiClient.get(endpoint, {
          params: { range, productsRange, customersRange, activityType, leadRange }
        });

        if (isSuperAdmin) {
          const payload = response.data.data || response.data;
          setData({ ...payload, superAdmin: true });
        } else {
          setData(response.data);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [range, productsRange, customersRange, activityType, leadRange]);

  if (loading || !data) {
    return <div style={{ padding: "2rem" }}>Loading dashboard data...</div>;
  }

  if (data.superAdmin) {
    return <SuperAdminDashboard data={data} />;
  }

  return (
    <CompanyDashboard 
      data={data}
      range={range} setRange={setRange}
      productsRange={productsRange} setProductsRange={setProductsRange}
      customersRange={customersRange} setCustomersRange={setCustomersRange}
      activityType={activityType} setActivityType={setActivityType}
      leadRange={leadRange} setLeadRange={setLeadRange}
    />
  );
};

export default Dashboard;