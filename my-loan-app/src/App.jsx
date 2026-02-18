import React, { useState, useMemo } from 'react';
import './App.css';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Area, AreaChart
} from 'recharts';

/* ----------------------------- */
/* Loan Factory */
/* ----------------------------- */
const createLoan = (id) => ({
  id,
  name: `Loan ${id}`,
  principal: 1000,
  totalMonths: 60,
  annualRate: 10,
  graceMonths: 12,
  paymentFrequency: 3,
  loanType: 'amortizing' // default to amortizing
});

export default function App() {

  /* ----------------------------- */
  /* State                         */
  /* ----------------------------- */
  const [loans, setLoans] = useState([createLoan(1)]);
  const [activeLoanId, setActiveLoanId] = useState(1);
  const [editingLoanId, setEditingLoanId] = useState(null);

  const activeLoan = loans.find(l => l.id === activeLoanId);

  /* ----------------------------- */
  /* Loan Updates                  */
  /* ----------------------------- */
  const updateLoan = (field, value) => {
    setLoans(loans.map(loan =>
      loan.id === activeLoanId
        ? { ...loan, [field]: value }
        : loan
    ));
  };

  const updateLoanName = (id, value) => {
    setLoans(loans.map(l =>
      l.id === id ? { ...l, name: value || `Loan ${id}` } : l
    ));
  };

  const addLoan = () => {
    const newId = loans.length + 1;
    const newLoan = createLoan(newId);
    setLoans([...loans, newLoan]);
    setActiveLoanId(newId);
  };

  const removeLoan = (id) => {
    if (loans.length === 1) return;

    const updated = loans.filter(l => l.id !== id);
    setLoans(updated);

    if (id === activeLoanId) {
      setActiveLoanId(updated[0].id);
    }
  };

  /* ----------------------------- */
  /* Calculation Engine            */
  /* ----------------------------- */
  const data = useMemo(() => {

    const { principal, totalMonths, annualRate, paymentFrequency, loanType } = activeLoan;

    const monthsPerPayment = paymentFrequency;
    const totalPeriods = Math.ceil(totalMonths / monthsPerPayment);

    let periods = [];
    let cumulativeInterest = 0;
    let balance = principal;

    if (loanType === 'bullet') {
      // Interest-only / bullet loan
      const interestPerPeriod = principal * (annualRate / 100) * (monthsPerPayment / 12);

      for (let p = 1; p <= totalPeriods; p++) {
        cumulativeInterest += interestPerPeriod;
        periods.push({
          period_label: `P${p}`,
          remaining_balance: p === totalPeriods ? 0 : principal,
          interest_payment: interestPerPeriod,
          principal_payment: p === totalPeriods ? principal : 0,
          total_payment: p === totalPeriods ? principal + interestPerPeriod : interestPerPeriod,
          cumulative_interest: cumulativeInterest
        });
      }

    } else {
      // Amortizing loan
      const periodsPerYear = 12 / paymentFrequency;
      const periodRate = annualRate / 100 / periodsPerYear;
      const gracePeriods = Math.floor(activeLoan.graceMonths / paymentFrequency);
      const amortPeriods = Math.ceil((totalMonths - activeLoan.graceMonths) / paymentFrequency);
      const principalPerPeriod = principal / amortPeriods;

      // Grace period interest
      for (let p = 1; p <= gracePeriods; p++) {
        const interestPayment = principal * periodRate;
        cumulativeInterest += interestPayment;
        periods.push({
          period_label: `P${p}`,
          remaining_balance: balance,
          interest_payment: interestPayment,
          principal_payment: 0,
          total_payment: interestPayment,
          cumulative_interest: cumulativeInterest
        });
      }

      // Amortization period
      for (let p = 1; p <= amortPeriods; p++) {
        const interestPayment = balance * periodRate;
        const totalPayment = principalPerPeriod + interestPayment;
        balance -= principalPerPeriod;
        cumulativeInterest += interestPayment;
        periods.push({
          period_label: `P${gracePeriods + p}`,
          remaining_balance: Math.max(0, balance),
          interest_payment: interestPayment,
          principal_payment: principalPerPeriod,
          total_payment: totalPayment,
          cumulative_interest: cumulativeInterest
        });
      }
    }

    return periods;

  }, [activeLoan]);


  /* ----------------------------- */
  /* Active Loan Stats             */
  /* ----------------------------- */
  const finalStats = useMemo(() => {
    const last = data[data.length - 1];
    if (!last) return { interest: 0, paid: 0 };

    return {
      interest: last.cumulative_interest,
      paid: activeLoan.principal + last.cumulative_interest    };
  }, [data, activeLoan]);

  /* ----------------------------- */
  /* Portfolio Totals (FIXED)      */
  /* ----------------------------- */
  const portfolioTotals = useMemo(() => {

    let totalPrincipal = 0;
    let totalInterest = 0;

    loans.forEach(loan => {
      const { principal, totalMonths, annualRate, paymentFrequency, loanType, graceMonths } = loan;
      const monthsPerPayment = paymentFrequency;

      if (loanType === 'bullet') {
        const totalPeriods = Math.ceil(totalMonths / monthsPerPayment);
        const interestPerPeriod = principal * (annualRate / 100) * (monthsPerPayment / 12);
        totalInterest += interestPerPeriod * totalPeriods;
        totalPrincipal += principal;
      } else {
        // amortizing
        const periodsPerYear = 12 / paymentFrequency;
        const periodRate = annualRate / 100 / periodsPerYear;
        const gracePeriods = Math.floor(graceMonths / paymentFrequency);
        const amortPeriods = Math.ceil((totalMonths - graceMonths) / paymentFrequency);
        const principalPerPeriod = principal / amortPeriods;

        let balance = principal;
        let interestSum = 0;

        for (let i = 0; i < gracePeriods; i++) {
          interestSum += principal * periodRate;
        }

        for (let i = 0; i < amortPeriods; i++) {
          interestSum += balance * periodRate;
          balance -= principalPerPeriod;
        }

        totalPrincipal += principal;
        totalInterest += interestSum;
      }
    });

    const weightedRate = (totalInterest / totalPrincipal) / (activeLoan.totalMonths / 12) * 100;

    return {
      totalPrincipal,
      totalInterest,
      weightedRate
    };

  }, [loans, activeLoan.totalMonths]);


  /* ----------------------------- */
  /* UI                            */
  /* ----------------------------- */
  return (
    <div className="app-container">

      {/* Sidebar */}
      <div className="sidebar">

        <div className="sidebar-header">
          <h2>Loans</h2>
          <button onClick={addLoan}>+</button>
        </div>

        <div className="loan-list">
          {loans.map(loan => (
            <div
              key={loan.id}
              className={
                loan.id === activeLoanId
                  ? 'loan-item active'
                  : 'loan-item'
              }
            >

              <div
                className="loan-info"
                onClick={() => setActiveLoanId(loan.id)}
              >

                {editingLoanId === loan.id ? (
                  <input
                    className="loan-name-input"
                    autoFocus
                    defaultValue={loan.name}
                    onBlur={(e) => {
                      updateLoanName(loan.id, e.target.value);
                      setEditingLoanId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateLoanName(loan.id, e.target.value);
                        setEditingLoanId(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingLoanId(loan.id);
                    }}
                  >
                    {loan.name}
                  </div>
                )}

                <small>€{loan.principal}</small>
              </div>

              <button
                className="delete-loan"
                onClick={(e) => {
                  e.stopPropagation();
                  removeLoan(loan.id);
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Portfolio totals */}
        <div className="portfolio">
          <h4>Portfolio</h4>
          <div>Total Principal: €{portfolioTotals.totalPrincipal.toFixed(2)}</div>
          <div>Total Interest: €{portfolioTotals.totalInterest.toFixed(2)}</div>
          <div>Avg Interest: {portfolioTotals.weightedRate.toFixed(2)}%</div>
        </div>

      </div>

      {/* Main */}
      <div className="main">

        {/* Loan Name */}
        <div className="loan-name-block">
          <label>Loan Name</label>
          <input
            value={activeLoan.name}
            onChange={e => updateLoan('name', e.target.value)}
          />
        </div>

        {/* Inputs with labels */}
        <div className="inputs">

          <div className="input-group">
            <label>Principal (€)</label>
            <input
              type="number"
              value={activeLoan.principal}
              onChange={e => updateLoan('principal', +e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Total Months</label>
            <input
              type="number"
              value={activeLoan.totalMonths}
              onChange={e => updateLoan('totalMonths', +e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Annual Rate (%)</label>
            <input
              type="number"
              value={activeLoan.annualRate}
              onChange={e => updateLoan('annualRate', +e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Grace Period</label>
            <input
              type="number"
              value={activeLoan.graceMonths}
              onChange={e => updateLoan('graceMonths', +e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Payment Frequency</label>
            <select
              value={activeLoan.paymentFrequency}
              onChange={e =>
                updateLoan('paymentFrequency', +e.target.value)
              }
            >
              <option value={1}>Monthly</option>
              <option value={3}>Quarterly</option>
              <option value={6}>Semi-Annual</option>
              <option value={12}>Annual</option>
            </select>
          </div>
          <div className="input-group">
            <label>Loan Type</label>
            <select
              value={activeLoan.loanType}
              onChange={e => updateLoan('loanType', e.target.value)}
            >
              <option value="amortizing">Amortizing</option>
              <option value="bullet">Bullet / Interest-only</option>
            </select>
          </div>

        </div>

        {/* Stats */}
        <div className="stats">
          <Stat title="Interest" value={finalStats.interest} />
          <Stat title="Total Paid" value={finalStats.paid} />
        </div>

        {/* Charts */}
        <ChartBlock title="Interest vs Principal">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period_label" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area dataKey="interest_payment" stackId="1" />
            <Area dataKey="principal_payment" stackId="1" />
            <Line dataKey="total_payment" />
          </ComposedChart>
        </ChartBlock>

        <ChartBlock title="Outstanding Balance">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period_label" />
            <YAxis />
            <Tooltip />
            <Area dataKey="remaining_balance" />
          </AreaChart>
        </ChartBlock>

        {/* RESTORED SCREEN */}
        <ChartBlock title="Cumulative Interest Growth">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period_label" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="cumulative_interest"
              strokeWidth={3}
            />
          </LineChart>
        </ChartBlock>

      </div>
    </div>
  );
}

/* ----------------------------- */
/* Small Components              */
/* ----------------------------- */

const Stat = ({ title, value }) => (
  <div className="stat">
    <div>{title}</div>
    <strong>€{value.toFixed(2)}</strong>
  </div>
);

const ChartBlock = ({ title, children }) => (
  <div className="chart-block">
    <h3>{title}</h3>
    <ResponsiveContainer width="100%" height={300}>
      {children}
    </ResponsiveContainer>
  </div>
);