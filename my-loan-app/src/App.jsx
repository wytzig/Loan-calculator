import React, { useState, useMemo } from 'react';
import './App.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart, Area, AreaChart } from 'recharts';

const LoanVisualization = () => {
  const [principal, setPrincipal] = useState(1000);
  const [totalMonths, setTotalMonths] = useState(60);
  const [annualRate, setAnnualRate] = useState(10);
  const [graceMonths, setGraceMonths] = useState(12);
  const [paymentFrequency, setPaymentFrequency] = useState(3); // months per payment

  const frequencyOptions = [
    { value: 1, label: 'Monthly' },
    { value: 3, label: 'Quarterly' },
    { value: 6, label: 'Semi-Annual' },
    { value: 12, label: 'Annual' }
  ];

  const data = useMemo(() => {
    const periodsPerYear = 12 / paymentFrequency;
    const periodRate = annualRate / 100 / periodsPerYear;
    const gracePeriods = graceMonths / paymentFrequency;
    const amortPeriods = (totalMonths - graceMonths) / paymentFrequency;
    const principalPerPeriod = principal / amortPeriods;

    let balance = principal;
    let cumulativeInterest = 0;
    let cumulativePrincipal = 0;

    const periods = [];

    // Grace period
    for (let p = 1; p <= gracePeriods; p++) {
      const interestPayment = principal * periodRate;
      cumulativeInterest += interestPayment;

      periods.push({
        period: p,
        period_label: `P${p}`,
        remaining_balance: balance,
        interest_payment: interestPayment,
        principal_payment: 0,
        total_payment: interestPayment,
        cumulative_interest: cumulativeInterest,
        cumulative_principal: cumulativePrincipal,
        phase: 'Grace'
      });
    }

    // Amortization period
    for (let p = 1; p <= amortPeriods; p++) {
      const interestPayment = balance * periodRate;
      const totalPayment = principalPerPeriod + interestPayment;

      balance -= principalPerPeriod;
      cumulativeInterest += interestPayment;
      cumulativePrincipal += principalPerPeriod;

      periods.push({
        period: gracePeriods + p,
        period_label: `P${gracePeriods + p}`,
        remaining_balance: Math.max(0, balance),
        interest_payment: interestPayment,
        principal_payment: principalPerPeriod,
        total_payment: totalPayment,
        cumulative_interest: cumulativeInterest,
        cumulative_principal: cumulativePrincipal,
        phase: 'Amortization'
      });
    }

    return periods;
  }, [principal, totalMonths, annualRate, graceMonths, paymentFrequency]);

  const finalStats = useMemo(() => {
    const lastPeriod = data[data.length - 1];
    const years = totalMonths / 12;
    const effectiveRate = (lastPeriod?.cumulative_interest / principal) / years * 100;

    return {
      totalInterest: lastPeriod?.cumulative_interest || 0,
      effectiveRate: effectiveRate || 0,
      totalPaid: principal + (lastPeriod?.cumulative_interest || 0)
    };
  }, [data, principal, totalMonths]);

  const frequencyLabel = frequencyOptions.find(opt => opt.value === paymentFrequency)?.label || 'Custom';

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Convex Interest Curve Visualization
        </h1>

        {/* Input Controls */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Principal (€)</label>
            <input
              type="number"
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Months</label>
            <input
              type="number"
              value={totalMonths}
              onChange={(e) => setTotalMonths(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Annual Rate (%)</label>
            <input
              type="number"
              step="0.1"
              value={annualRate}
              onChange={(e) => setAnnualRate(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (months)</label>
            <input
              type="number"
              value={graceMonths}
              onChange={(e) => setGraceMonths(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Frequency</label>
            <select
              value={paymentFrequency}
              onChange={(e) => setPaymentFrequency(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {frequencyOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Key Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold">Total Interest</h3>
            <p className="text-2xl font-bold">€{finalStats.totalInterest.toFixed(2)}</p>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold">Effective Annual Rate</h3>
            <p className="text-2xl font-bold">{finalStats.effectiveRate.toFixed(2)}%</p>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold">Total Paid</h3>
            <p className="text-2xl font-bold">€{finalStats.totalPaid.toFixed(2)}</p>
          </div>
        </div>

        <div className="text-center text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          Payment Schedule: <span className="font-semibold">{frequencyLabel}</span> ({data.length} payments total)
        </div>
      </div>

      {/* The Convex Interest Curve */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4 text-center">📈 The Convex Interest Curve</h2>
        <p className="text-gray-600 mb-4 text-center">Notice how interest payments start high then curve downward - this is the "convex" shape!</p>

        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period_label" />
            <YAxis />
            <Tooltip
              formatter={(value, name) => [
                `€${Number(value).toFixed(2)}`,
                name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
              ]}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="interest_payment"
              stackId="1"
              stroke="#ef4444"
              fill="#fee2e2"
              name="Interest Payment"
            />
            <Area
              type="monotone"
              dataKey="principal_payment"
              stackId="1"
              stroke="#3b82f6"
              fill="#dbeafe"
              name="Principal Payment"
            />
            <Line
              type="monotone"
              dataKey="total_payment"
              stroke="#8b5cf6"
              strokeWidth={3}
              name="Total Payment"
              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Remaining Balance Over Time */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4 text-center">💰 Outstanding Balance Decline</h2>
        <p className="text-gray-600 mb-4 text-center">Watch how the balance stays flat during grace period, then drops linearly</p>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period_label" />
            <YAxis />
            <Tooltip formatter={(value) => [`€${Number(value).toFixed(2)}`, 'Outstanding Balance']} />
            <Area
              type="monotone"
              dataKey="remaining_balance"
              stroke="#059669"
              fill="#d1fae5"
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative Interest Comparison */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-center">📊 Cumulative Interest Growth</h2>
        <p className="text-gray-600 mb-4 text-center">The convex curve: Fast growth during grace, then slowing growth during amortization</p>

        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period_label" />
            <YAxis />
            <Tooltip formatter={(value) => [`€${Number(value).toFixed(2)}`, 'Cumulative Interest']} />
            <Legend />
            <Line
              type="monotone"
              dataKey="cumulative_interest"
              stroke="#dc2626"
              strokeWidth={4}
              name="Cumulative Interest"
              dot={{ fill: '#dc2626', strokeWidth: 2, r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400">
          <p className="text-sm text-yellow-800">
            <strong>🔍 Mathematical Insight:</strong> The curve shows rapid interest accumulation during grace period,
            then a decreasing slope during amortization. This creates the "convex" shape - curved outward like the
            exterior of a circle!
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoanVisualization;
