import React, { useState, useMemo } from 'react';
import './App.css';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Area, AreaChart, ComposedChart
} from 'recharts';

const LoanVisualization = () => {
  // ---- State ----
  const [principal, setPrincipal] = useState(1000);
  const [totalMonths, setTotalMonths] = useState(60);
  const [annualRate, setAnnualRate] = useState(10);
  const [graceMonths, setGraceMonths] = useState(12);

  // ---- Compute loan schedule ----
  const data = useMemo(() => {
    const quarterlyRate = annualRate / 100 / 4;
    const graceQuarters = graceMonths / 3;
    const amortQuarters = (totalMonths - graceMonths) / 3;
    const principalPerQuarter = principal / amortQuarters;

    let balance = principal;
    let cumulativeInterest = 0;
    let cumulativePrincipal = 0;

    const quarters = [];

    // Grace period
    for (let q = 1; q <= graceQuarters; q++) {
      const interestPayment = principal * quarterlyRate;
      cumulativeInterest += interestPayment;

      quarters.push({
        quarter: q,
        quarter_label: `Q${q}`,
        remaining_balance: balance,
        interest_payment: interestPayment,
        principal_payment: 0,
        total_payment: interestPayment,
        cumulative_interest: cumulativeInterest,
        cumulative_principal: cumulativePrincipal,
        period: 'Grace'
      });
    }

    // Amortization period
    for (let q = 1; q <= amortQuarters; q++) {
      const interestPayment = balance * quarterlyRate;
      const totalPayment = principalPerQuarter + interestPayment;
      balance -= principalPerQuarter;
      cumulativeInterest += interestPayment;
      cumulativePrincipal += principalPerQuarter;

      quarters.push({
        quarter: graceQuarters + q,
        quarter_label: `Q${graceQuarters + q}`,
        remaining_balance: Math.max(0, balance),
        interest_payment: interestPayment,
        principal_payment: principalPerQuarter,
        total_payment: totalPayment,
        cumulative_interest: cumulativeInterest,
        cumulative_principal: cumulativePrincipal,
        period: 'Amortization'
      });
    }

    return quarters;
  }, [principal, totalMonths, annualRate, graceMonths]);

  // ---- Compute final statistics ----
  const finalStats = useMemo(() => {
    const lastQuarter = data[data.length - 1] || {};
    const years = totalMonths / 12;
    const effectiveRate = lastQuarter.cumulative_interest
      ? (lastQuarter.cumulative_interest / principal) / years * 100
      : 0;

    return {
      totalInterest: lastQuarter.cumulative_interest || 0,
      effectiveRate,
      totalPaid: principal + (lastQuarter.cumulative_interest || 0)
    };
  }, [data, principal, totalMonths]);

  // ---- Render ----
  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">

      <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        Convex Interest Curve Visualization
      </h1>

      {/* Input Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <label>Principal (€)</label>
          <input type="number" value={principal} onChange={e => setPrincipal(Number(e.target.value))} className="w-full border rounded px-2 py-1" />
        </div>
        <div>
          <label>Total Months</label>
          <input type="number" value={totalMonths} onChange={e => setTotalMonths(Number(e.target.value))} className="w-full border rounded px-2 py-1" />
        </div>
        <div>
          <label>Annual Rate (%)</label>
          <input type="number" step="0.1" value={annualRate} onChange={e => setAnnualRate(Number(e.target.value))} className="w-full border rounded px-2 py-1" />
        </div>
        <div>
          <label>Grace Period (months)</label>
          <input type="number" value={graceMonths} onChange={e => setGraceMonths(Number(e.target.value))} className="w-full border rounded px-2 py-1" />
        </div>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-500 text-white p-4 rounded">
          <h3>Total Interest</h3>
          <p>€{finalStats.totalInterest.toFixed(2)}</p>
        </div>
        <div className="bg-blue-500 text-white p-4 rounded">
          <h3>Effective Annual Rate</h3>
          <p>{finalStats.effectiveRate.toFixed(2)}%</p>
        </div>
        <div className="bg-purple-500 text-white p-4 rounded">
          <h3>Total Paid</h3>
          <p>€{finalStats.totalPaid.toFixed(2)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="bg-white p-6 rounded shadow mb-6">
        <h2>Convex Interest Curve</h2>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="quarter_label" />
            <YAxis />
            <Tooltip formatter={(val) => [`€${val.toFixed(2)}`]} />
            <Legend />
            <Area type="monotone" dataKey="interest_payment" stroke="#ef4444" fill="#fee2e2" name="Interest Payment" />
            <Area type="monotone" dataKey="principal_payment" stroke="#3b82f6" fill="#dbeafe" name="Principal Payment" />
            <Line type="monotone" dataKey="total_payment" stroke="#8b5cf6" strokeWidth={2} name="Total Payment" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-6 rounded shadow mb-6">
        <h2>Outstanding Balance</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="quarter_label" />
            <YAxis />
            <Tooltip formatter={(val) => [`€${val.toFixed(2)}`]} />
            <Area type="monotone" dataKey="remaining_balance" stroke="#059669" fill="#d1fae5" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-6 rounded shadow">
        <h2>Cumulative Interest</h2>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="quarter_label" />
            <YAxis />
            <Tooltip formatter={(val) => [`€${val.toFixed(2)}`]} />
            <Legend />
            <Line type="monotone" dataKey="cumulative_interest" stroke="#dc2626" strokeWidth={2} name="Cumulative Interest" />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};

function App() {
  return <LoanVisualization />;
}

export default App;
