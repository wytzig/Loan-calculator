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
  paymentFrequency: 3
});

export default function App() {

  /* ----------------------------- */
  /* State                         */
  /* ----------------------------- */
  const [loans, setLoans] = useState([createLoan(1)]);
  const [activeLoanId, setActiveLoanId] = useState(1);

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

  const addLoan = () => {
    const newId = loans.length + 1;
    const newLoan = createLoan(newId);
    setLoans([...loans, newLoan]);
    setActiveLoanId(newId);
  };

  const removeLoan = (id) => {

  if (loans.length === 1) return; // prevent deleting last

  const updated = loans.filter(l => l.id !== id);
  setLoans(updated);

  // If deleted loan was active → switch
  if (id === activeLoanId) {
    setActiveLoanId(updated[0].id);
  }
};


  /* ----------------------------- */
  /* Calculation Engine            */
  /* ----------------------------- */
  const data = useMemo(() => {

    const {
      principal,
      totalMonths,
      annualRate,
      graceMonths,
      paymentFrequency
    } = activeLoan;

    const periodsPerYear = 12 / paymentFrequency;
    const periodRate = annualRate / 100 / periodsPerYear;
    const gracePeriods = graceMonths / paymentFrequency;
    const amortPeriods = (totalMonths - graceMonths) / paymentFrequency;
    const principalPerPeriod = principal / amortPeriods;

    let balance = principal;
    let cumulativeInterest = 0;

    const periods = [];

    /* Grace */
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

    /* Amortization */
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

    return periods;

  }, [activeLoan]);

  /* ----------------------------- */
  /* Active Loan Stats             */
  /* ----------------------------- */
  const finalStats = useMemo(() => {
    const last = data[data.length - 1];
    if (!last) return { interest: 0, paid: 0, left: 0 };

    return {
      interest: last.cumulative_interest,
      paid: activeLoan.principal + last.cumulative_interest,
      left: last.remaining_balance
    };
  }, [data, activeLoan]);

  /* ----------------------------- */
  /* Portfolio Totals              */
  /* ----------------------------- */
  const portfolioTotals = useMemo(() => {

    let totalPrincipal = 0;
    let totalInterest = 0;
    let totalLeft = 0;

    loans.forEach(loan => {

      const periodsPerYear = 12 / loan.paymentFrequency;
      const rate = loan.annualRate / 100 / periodsPerYear;
      const gracePeriods = loan.graceMonths / loan.paymentFrequency;
      const amortPeriods =
        (loan.totalMonths - loan.graceMonths) /
        loan.paymentFrequency;

      const principalPerPeriod =
        loan.principal / amortPeriods;

      let balance = loan.principal;
      let interestSum = 0;

      for (let i = 0; i < gracePeriods; i++) {
        interestSum += loan.principal * rate;
      }

      for (let i = 0; i < amortPeriods; i++) {
        interestSum += balance * rate;
        balance -= principalPerPeriod;
      }

      totalPrincipal += loan.principal;
      totalInterest += interestSum;
      totalLeft += Math.max(0, balance);
    });

    const weightedRate =
      totalInterest / totalPrincipal * 100;

    return {
      totalPrincipal,
      totalInterest,
      totalLeft,
      weightedRate
    };

  }, [loans]);

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
                <div>{loan.name}</div>
                <small>€{loan.principal}</small>
              </div>

              <button
                className="delete-loan"
                onClick={(e) => {
                  e.stopPropagation(); // prevent switching loan
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
          <div>Left Due: €{portfolioTotals.totalLeft.toFixed(2)}</div>
          <div>Avg Interest: {portfolioTotals.weightedRate.toFixed(2)}%</div>
        </div>

      </div>

      {/* Main */}
      <div className="main">

        {/* Inputs */}
        <div className="inputs">

          <input
            type="number"
            value={activeLoan.principal}
            onChange={e => updateLoan('principal', +e.target.value)}
            placeholder="Principal"
          />

          <input
            type="number"
            value={activeLoan.totalMonths}
            onChange={e => updateLoan('totalMonths', +e.target.value)}
            placeholder="Months"
          />

          <input
            type="number"
            value={activeLoan.annualRate}
            onChange={e => updateLoan('annualRate', +e.target.value)}
            placeholder="Rate %"
          />

          <input
            type="number"
            value={activeLoan.graceMonths}
            onChange={e => updateLoan('graceMonths', +e.target.value)}
            placeholder="Grace"
          />

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

        {/* Stats */}
        <div className="stats">

          <Stat title="Interest" value={finalStats.interest} />
          <Stat title="Total Paid" value={finalStats.paid} />
          <Stat title="Left Due" value={finalStats.left} />

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
