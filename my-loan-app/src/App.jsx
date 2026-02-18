import React, { useState, useMemo, useRef } from 'react';
import './App.css';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Area, AreaChart
} from 'recharts';

/* ----------------------------- */
/* IRR Solver                    */
/* ----------------------------- */
const computeIRR = (principal, cashflows) => {
  if (!cashflows || cashflows.length === 0 || principal <= 0) return 0;

  const npv = (r) => {
    let sum = -principal;
    for (const { payment, months } of cashflows) {
      sum += payment / Math.pow(1 + r, months);
    }
    return sum;
  };

  const npvDerivative = (r) => {
    let sum = 0;
    for (const { payment, months } of cashflows) {
      sum -= months * payment / Math.pow(1 + r, months + 1);
    }
    return sum;
  };

  let r = 0.008;
  for (let i = 0; i < 100; i++) {
    const fn = npv(r);
    const dfn = npvDerivative(r);
    if (Math.abs(dfn) < 1e-12) break;
    const rNew = r - fn / dfn;
    if (Math.abs(rNew - r) < 1e-10) { r = rNew; break; }
    r = rNew;
    if (r <= -1) r = 0.0001;
  }

  const annualized = (Math.pow(1 + r, 12) - 1) * 100;
  return isFinite(annualized) ? annualized : 0;
};

const buildCashflows = (loan) => {
  const { principal, totalMonths, annualRate, paymentFrequency, loanType, graceMonths } = loan;
  const cashflows = [];

  if (loanType === 'bullet') {
    const totalPeriods = Math.ceil(totalMonths / paymentFrequency);
    const interestPerPeriod = principal * (annualRate / 100) * (paymentFrequency / 12);
    for (let p = 1; p <= totalPeriods; p++) {
      const months = p * paymentFrequency;
      const isLast = p === totalPeriods;
      cashflows.push({
        payment: isLast ? principal + interestPerPeriod : interestPerPeriod,
        months
      });
    }
  } else {
    const periodsPerYear = 12 / paymentFrequency;
    const periodRate = annualRate / 100 / periodsPerYear;
    const gracePeriods = Math.floor(graceMonths / paymentFrequency);
    const amortPeriods = Math.ceil((totalMonths - graceMonths) / paymentFrequency);
    const principalPerPeriod = principal / amortPeriods;

    let balance = principal;
    for (let p = 1; p <= gracePeriods; p++) {
      cashflows.push({ payment: principal * periodRate, months: p * paymentFrequency });
    }
    for (let p = 1; p <= amortPeriods; p++) {
      const interest = balance * periodRate;
      cashflows.push({
        payment: principalPerPeriod + interest,
        months: (gracePeriods + p) * paymentFrequency
      });
      balance -= principalPerPeriod;
    }
  }

  return cashflows;
};

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
  loanType: 'amortizing'
});

/* ----------------------------- */
/* Export / Import Helpers       */
/* ----------------------------- */
const EXPORT_VERSION = '1.0';

const exportPortfolio = (loans) => {
  const payload = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    loans,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `loan-portfolio-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const importPortfolio = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.loans || !Array.isArray(parsed.loans)) {
          throw new Error('Invalid file: missing loans array.');
        }
        // Validate each loan has required fields
        const required = ['id', 'name', 'principal', 'totalMonths', 'annualRate', 'graceMonths', 'paymentFrequency', 'loanType'];
        parsed.loans.forEach((loan, i) => {
          required.forEach(k => {
            if (loan[k] === undefined) throw new Error(`Loan ${i + 1} is missing field "${k}".`);
          });
        });
        resolve(parsed.loans);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });

/* ----------------------------- */
/* Main App                      */
/* ----------------------------- */
export default function App() {

  /* ----------------------------- */
  /* State                         */
  /* ----------------------------- */
  const [loans, setLoans] = useState([createLoan(1)]);
  const [activeLoanId, setActiveLoanId] = useState(1);
  const [editingLoanId, setEditingLoanId] = useState(null);
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef(null);

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
    const newId = Math.max(...loans.map(l => l.id)) + 1;
    const newLoan = createLoan(newId);
    setLoans([...loans, newLoan]);
    setActiveLoanId(newId);
  };

  const removeLoan = (id) => {
    if (loans.length === 1) return;
    const updated = loans.filter(l => l.id !== id);
    setLoans(updated);
    if (id === activeLoanId) setActiveLoanId(updated[0].id);
  };

  /* ----------------------------- */
  /* Export Handler                */
  /* ----------------------------- */
  const handleExport = () => {
    exportPortfolio(loans);
  };

  /* ----------------------------- */
  /* Import Handler                */
  /* ----------------------------- */
  const handleImportClick = () => {
    setImportError(null);
    setImportSuccess(false);
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Reset so same file can be re-imported
    e.target.value = '';

    try {
      const importedLoans = await importPortfolio(file);
      setLoans(importedLoans);
      setActiveLoanId(importedLoans[0].id);
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
    } catch (err) {
      setImportError(err.message);
      setTimeout(() => setImportError(null), 5000);
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
      const periodsPerYear = 12 / paymentFrequency;
      const periodRate = annualRate / 100 / periodsPerYear;
      const gracePeriods = Math.floor(activeLoan.graceMonths / paymentFrequency);
      const amortPeriods = Math.ceil((totalMonths - activeLoan.graceMonths) / paymentFrequency);
      const principalPerPeriod = principal / amortPeriods;

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
    if (!last) return { interest: 0, paid: 0, effectiveRate: 0, irrRate: 0 };

    const interest = last.cumulative_interest;
    const paid = activeLoan.principal + interest;
    const years = activeLoan.totalMonths / 12;
    const effectiveRate = (interest / activeLoan.principal) / years * 100;
    const cashflows = buildCashflows(activeLoan);
    const irrRate = computeIRR(activeLoan.principal, cashflows);

    return { interest, paid, effectiveRate, irrRate };
  }, [data, activeLoan]);

  /* ----------------------------- */
  /* Portfolio Totals              */
  /* ----------------------------- */
  const portfolioTotals = useMemo(() => {
    if (!loans || loans.length === 0)
      return { totalPrincipal: 0, totalInterest: 0, effectiveRate: 0, irrRate: 0 };

    let totalPrincipal = 0;
    let totalInterest = 0;
    let weightedEffectiveSum = 0;
    let weightedIRRSum = 0;

    loans.forEach(loan => {
      const { principal, totalMonths, annualRate, paymentFrequency, loanType, graceMonths } = loan;

      let interestSum = 0;
      const periodsPerYear = 12 / paymentFrequency;
      const periodRate = annualRate / 100 / periodsPerYear;
      const gracePeriods = Math.floor(graceMonths / paymentFrequency);
      const amortPeriods = Math.ceil((totalMonths - graceMonths) / paymentFrequency);
      const principalPerPeriod = loanType === 'amortizing' ? principal / amortPeriods : 0;

      let balance = principal;

      for (let p = 1; p <= gracePeriods; p++) {
        interestSum += principal * periodRate;
      }
      for (let p = 1; p <= amortPeriods; p++) {
        const interestPayment = loanType === 'amortizing' ? balance * periodRate : 0;
        interestSum += interestPayment;
        balance -= principalPerPeriod;
      }

      const years = totalMonths / 12;
      const effectiveRate = (interestSum / principal) / years * 100;
      const cashflows = buildCashflows(loan);
      const irr = computeIRR(principal, cashflows);

      totalPrincipal += principal;
      totalInterest += interestSum;
      weightedEffectiveSum += effectiveRate * principal;
      weightedIRRSum += irr * principal;
    });

    return {
      totalPrincipal,
      totalInterest,
      effectiveRate: totalPrincipal > 0 ? weightedEffectiveSum / totalPrincipal : 0,
      irrRate: totalPrincipal > 0 ? weightedIRRSum / totalPrincipal : 0
    };
  }, [loans]);

  /* ----------------------------- */
  /* UI                            */
  /* ----------------------------- */
  return (
    <div className="app-container">

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

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
              className={loan.id === activeLoanId ? 'loan-item active' : 'loan-item'}
            >
              <div className="loan-info" onClick={() => setActiveLoanId(loan.id)}>
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
                  <div onDoubleClick={(e) => { e.stopPropagation(); setEditingLoanId(loan.id); }}>
                    {loan.name}
                  </div>
                )}
                <small>€{loan.principal}</small>
              </div>

              <button
                className="delete-loan"
                onClick={(e) => { e.stopPropagation(); removeLoan(loan.id); }}
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
          <div>Effective % (total): {portfolioTotals.effectiveRate.toFixed(2)}%</div>
          <div>IRR (annualized): {portfolioTotals.irrRate.toFixed(2)}%</div>
        </div>

        {/* ---- Export / Import ---- */}
        <div className="portfolio-actions">
          <button className="action-btn export-btn" onClick={handleExport} title="Download portfolio as JSON">
            ⬇ Export
          </button>
          <button className="action-btn import-btn" onClick={handleImportClick} title="Load portfolio from JSON">
            ⬆ Import
          </button>
        </div>

        {/* Feedback messages */}
        {importSuccess && (
          <div className="import-feedback success">✓ Portfolio imported!</div>
        )}
        {importError && (
          <div className="import-feedback error">✗ {importError}</div>
        )}

      </div>

      {/* Main */}
      <div className="main">

        {/* Loan Name */}
        <div className="loan-name-block">
          <label>Loan Name</label>
          <input value={activeLoan.name} onChange={e => updateLoan('name', e.target.value)} />
        </div>

        {/* Inputs */}
        <div className="inputs">

          <div className="input-group">
            <label>Principal (€)</label>
            <input type="number" value={activeLoan.principal} onChange={e => updateLoan('principal', +e.target.value)} />
          </div>

          <div className="input-group">
            <label>Total Months</label>
            <input type="number" value={activeLoan.totalMonths} onChange={e => updateLoan('totalMonths', +e.target.value)} />
          </div>

          <div className="input-group">
            <label>Annual Rate (%)</label>
            <input type="number" value={activeLoan.annualRate} onChange={e => updateLoan('annualRate', +e.target.value)} />
          </div>

          <div className="input-group">
            <label>Grace Period</label>
            <input type="number" value={activeLoan.graceMonths} onChange={e => updateLoan('graceMonths', +e.target.value)} />
          </div>

          <div className="input-group">
            <label>Payment Frequency</label>
            <select value={activeLoan.paymentFrequency} onChange={e => updateLoan('paymentFrequency', +e.target.value)}>
              <option value={1}>Monthly</option>
              <option value={3}>Quarterly</option>
              <option value={6}>Semi-Annual</option>
              <option value={12}>Annual</option>
            </select>
          </div>

          <div className="input-group">
            <label>Loan Type</label>
            <select value={activeLoan.loanType} onChange={e => updateLoan('loanType', e.target.value)}>
              <option value="amortizing">Amortizing</option>
              <option value="bullet">Bullet / Interest-only</option>
            </select>
          </div>

        </div>

        {/* Stats */}
        <div className="stats">
          <Stat title="Interest" value={finalStats.interest} />
          <Stat title="Total Paid" value={finalStats.paid} />
          <Stat title="Effective %" value={finalStats.effectiveRate} isPercent />
          <Stat title="IRR (annualized)" value={finalStats.irrRate} isPercent />
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

        <ChartBlock title="Cumulative Interest Growth">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period_label" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="cumulative_interest" strokeWidth={3} />
          </LineChart>
        </ChartBlock>

      </div>
    </div>
  );
}

/* ----------------------------- */
/* Small Components              */
/* ----------------------------- */

const Stat = ({ title, value, isPercent }) => (
  <div className="stat">
    <div>{title}</div>
    <strong>{isPercent ? `${value.toFixed(2)}%` : `€${value.toFixed(2)}`}</strong>
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