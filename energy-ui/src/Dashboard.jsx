import React, { useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ComposedChart, Line, BarChart, Bar, Legend
} from 'recharts';
import { 
  Zap, Battery, Sun, DollarSign, Activity, Play, 
  Database, AlertCircle, CheckCircle2, TrendingUp, IndianRupee, ArrowDownToLine, ArrowUpFromLine
} from 'lucide-react';

// Helpers
const createEmptyArray = () => Array(24).fill(0);

// API base URL: set VITE_API_URL for the deployed backend, falls back to
// the local dev server.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Sample Data
const SAMPLE_M = 10;
const SAMPLE_Z = 3;
const SAMPLE_D = [2, 2, 2, 2, 2, 3, 4, 5, 4, 3, 3, 3, 3, 3, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2];
const SAMPLE_X = [0, 0, 0, 0, 0, 0, 1, 3, 5, 6, 7, 8, 8, 7, 5, 3, 1, 0, 0, 0, 0, 0, 0, 0];
const SAMPLE_Y = [1, 1, 1, 1, 1, 2, 3, 3, 2, 2, 2, 2, 2, 3, 4, 5, 8, 10, 10, 8, 5, 3, 2, 1];

export default function Dashboard() {
  // --- STATE ---
  const [M, setM] = useState(0);
  const [Z, setZ] = useState(0);
  const [D, setD] = useState(createEmptyArray());
  const [X, setX] = useState(createEmptyArray());
  const [Y, setY] = useState(createEmptyArray());
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  // --- HANDLERS ---
  const handleLoadSample = () => {
    setM(SAMPLE_M);
    setZ(SAMPLE_Z);
    setD([...SAMPLE_D]);
    setX([...SAMPLE_X]);
    setY([...SAMPLE_Y]);
    setResults(null);
    setError(null);
  };

  const handleGridChange = (hour, arrayName, value) => {
    const numValue = value === '' ? '' : Number(value);
    if (arrayName === 'D') {
      const newD = [...D]; newD[hour] = numValue; setD(newD);
    } else if (arrayName === 'X') {
      const newX = [...X]; newX[hour] = numValue; setX(newX);
    } else if (arrayName === 'Y') {
      const newY = [...Y]; newY[hour] = numValue; setY(newY);
    }
  };

  const handleRunOptimization = async () => {
    setIsLoading(true);
    setError(null);
    
    // Ensure all empty strings are converted to 0 for API
    const cleanD = D.map(v => Number(v) || 0);
    const cleanX = X.map(v => Number(v) || 0);
    const cleanY = Y.map(v => Number(v) || 0);
    const cleanM = Number(M) || 0;
    const cleanZ = Number(Z) || 0;

    const payload = { M: cleanM, Z: cleanZ, D: cleanD, X: cleanX, Y: cleanY };

    try {
      const response = await fetch(`${API_URL}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message || 'Failed to connect to the optimization server.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- COMPUTATIONS FOR CHARTS ---
  // If we have results, format them for Recharts
  // results should match API output: { schedule: [{hour, demand, solar, price, B_bought, B_sold, B_charged, B_discharged, SOC}], total_cost: number }
  const chartData = results ? results.schedule.map(row => ({
    hour: row.hour,
    demand: row.demand,
    solar: row.solar,
    price: row.price,
    bought: row.B_bought,
    sold: -row.B_sold, // Show sold as negative on bar chart? Or keep positive and stack? Let's keep positive for stacking, or just stack appropriately.
    charged: -row.B_charged, // Usually charge is negative power to grid perspective, let's keep it straight numbers for now
    realSold: row.B_sold,
    realCharged: row.B_charged,
    discharged: row.B_discharged,
    soc: row.SOC
  })) : [];
  
  // KPI Calculations (fallback if backend doesn't provide them all)
  const totalCost = results?.total_cost ?? 0;
  const totalBought = results ? results.schedule.reduce((acc, row) => acc + row.B_bought, 0) : 0;
  const totalSold = results ? results.schedule.reduce((acc, row) => acc + row.B_sold, 0) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* LEFT COLUMN: Input & Configuration */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        
        {/* Hardware Limits Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Battery className="w-4 h-4 text-blue-600" />
              Hardware Constraints
            </h2>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Battery Capacity (M) kWh</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                  value={M} 
                  onChange={(e) => setM(e.target.value)} 
                  placeholder="e.g. 10" 
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Max Rate (Z) kW</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                  value={Z} 
                  onChange={(e) => setZ(e.target.value)} 
                  placeholder="e.g. 3" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* 24-Hour Data Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[600px]">
           <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              24-Hour Forecast Data
            </h2>
            <button 
              onClick={handleLoadSample}
              className="text-xs font-semibold text-slate-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-blue-600 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              Load Sample
            </button>
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar p-0">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-white sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="py-3 px-4 font-semibold text-slate-500 w-16 text-center border-b border-gray-100">Hr</th>
                  <th className="py-3 px-2 font-semibold text-slate-500 border-b border-gray-100">Demand <span className="text-[10px] font-normal text-slate-400 block -mt-1">kW</span></th>
                  <th className="py-3 px-2 font-semibold text-slate-500 border-b border-gray-100">Solar <span className="text-[10px] font-normal text-slate-400 block -mt-1">kW</span></th>
                  <th className="py-3 px-2 font-semibold text-slate-500 border-b border-gray-100">Price <span className="text-[10px] font-normal text-slate-400 block -mt-1">Rs/kWh</span></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 24 }).map((_, hour) => (
                  <tr key={hour} className="border-b border-gray-50 hover:bg-slate-50/50 group transition-colors">
                    <td className="py-2 px-4 text-center text-slate-400 font-medium font-mono text-xs">{hour.toString().padStart(2, '0')}:00</td>
                    <td className="py-1.5 px-2">
                      <input 
                        type="number"
                        className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-md text-slate-700 text-sm font-medium focus:outline-none transition-all"
                        value={D[hour]} 
                        onChange={(e) => handleGridChange(hour, 'D', e.target.value)} 
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input 
                        type="number"
                        className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-md text-slate-700 text-sm font-medium focus:outline-none transition-all"
                        value={X[hour]} 
                        onChange={(e) => handleGridChange(hour, 'X', e.target.value)} 
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input 
                        type="number"
                        className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-md text-slate-700 text-sm font-medium focus:outline-none transition-all"
                        value={Y[hour]} 
                        onChange={(e) => handleGridChange(hour, 'Y', e.target.value)} 
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-gray-100 bg-white">
            <button 
              onClick={handleRunOptimization}
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                isLoading 
                  ? 'bg-blue-400 text-white cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  Optimizing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Optimization
                </>
              )}
            </button>
            {error && (
              <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-xs font-medium flex items-start gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Results & Visualization */}
      <div className="lg:col-span-8 flex flex-col h-full min-h-[800px]">
        {!results && !isLoading && (
           <div className="flex-1 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center bg-gray-50/50 text-slate-400 p-8 text-center min-h-[500px]">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 border border-gray-100">
                <Zap className="w-8 h-8 text-blue-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">Waiting for data...</h3>
              <p className="max-w-md text-sm leading-relaxed">Fill in the hardware constraints and 24-hour forecast data on the left, then run the optimization algorithm to see the generated schedule.</p>
           </div>
        )}

        {isLoading && (
          <div className="flex-1 border border-gray-200 rounded-xl flex flex-col items-center justify-center bg-white shadow-sm min-h-[500px]">
             <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-gray-100"></div>
                <div className="w-16 h-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin absolute top-0 left-0"></div>
             </div>
             <h3 className="text-lg font-bold text-slate-700 mt-6 animate-pulse">Running Optimizer...</h3>
             <p className="text-slate-400 text-sm mt-2">Solving linear programming formulation</p>
          </div>
        )}

        {results && !isLoading && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-50 to-green-100 rounded-full blur-2xl -mr-10 -mt-10 opacity-70"></div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider relative z-10">Optimized 24h Bill</h3>
                </div>
                <div className="flex items-baseline gap-1 relative z-10">
                  <span className="text-sm font-medium text-slate-500">₹</span>
                  <span className="text-3xl font-black text-slate-800 tracking-tight">{totalCost.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full blur-2xl -mr-10 -mt-10 opacity-70"></div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <ArrowDownToLine className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider relative z-10">Total Bought (Grid)</h3>
                </div>
                <div className="flex items-baseline gap-1 relative z-10">
                  <span className="text-3xl font-black text-slate-800 tracking-tight">{totalBought.toFixed(1)}</span>
                  <span className="text-sm font-medium text-slate-500">kWh</span>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-full blur-2xl -mr-10 -mt-10 opacity-70"></div>
                <div className="flex items-center gap-2 mb-3">
                   <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <ArrowUpFromLine className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider relative z-10">Total Sold (Grid)</h3>
                </div>
                <div className="flex items-baseline gap-1 relative z-10">
                  <span className="text-3xl font-black text-slate-800 tracking-tight">{totalSold.toFixed(1)}</span>
                  <span className="text-sm font-medium text-slate-500">kWh</span>
                </div>
              </div>
            </div>

            {/* Combined Chart (Demand, Solar, Price) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Demand, Solar & Target Price Profile
              </h3>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="hour" tickFormatter={(tick) => `${tick}:00`} tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} kW`}/>
                    <YAxis yAxisId="right" orientation="right" tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`}/>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}
                      labelFormatter={(l) => `Time: ${l}:00`}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle"/>
                    
                    <Area yAxisId="left" type="monotone" dataKey="demand" name="Demand (kW)" stroke="#64748b" strokeWidth={2} fill="url(#colorDemand)" activeDot={{ r: 6 }} />
                    <Area yAxisId="left" type="monotone" dataKey="solar" name="Solar (kW)" stroke="#f59e0b" strokeWidth={2} fill="url(#colorSolar)" />
                    <Line yAxisId="right" type="stepAfter" dataKey="price" name="Grid Price (Rs)" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Action Bar Chart (Bought, Sold, Charge, Discharge) and SOC Line */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" />
                Energy Actions & State of Charge
              </h3>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="hour" tickFormatter={(tick) => `${tick}:00`} tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} kW`}/>
                    <YAxis yAxisId="right" orientation="right" tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`}/>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 'bold', color: '#334155' }}
                      formatter={(val, name) => {
                         if(name === "SOC (%)") return [`${Number(val).toFixed(1)}%`, name];
                         return [`${Number(val).toFixed(2)} kW`, name];
                      }}
                      labelFormatter={(l) => `Time: ${l}:00`}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle"/>
                    
                    <Bar yAxisId="left" dataKey="bought" name="Grid Buy (+)" stackId="a" fill="#c084fc" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar yAxisId="left" dataKey="discharged" name="Discharge (+)" stackId="a" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    
                    {/* Downward stack for sold and charged */}
                    <Bar yAxisId="left" dataKey="sold" name="Grid Sell (-)" stackId="b" fill="#10b981" radius={[0, 0, 4, 4]} barSize={20} />
                    <Bar yAxisId="left" dataKey="charged" name="Charge (-)" stackId="b" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                    
                    <Line yAxisId="right" type="monotone" dataKey="soc" name="SOC (%)" stroke="#1d4ed8" strokeWidth={3} dot={{r: 3, fill: '#1d4ed8', strokeWidth: 0}} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  Detailed Action Plan
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-gray-100 uppercase text-[10px] font-bold text-slate-500 tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Hour</th>
                      <th className="px-4 py-3 text-right">Demand (kW)</th>
                      <th className="px-4 py-3 text-right">Solar (kW)</th>
                      <th className="px-4 py-3 text-right">Price (Rs)</th>
                      <th className="px-4 py-3 text-right">Buy (kW)</th>
                      <th className="px-4 py-3 text-right">Sell (kW)</th>
                      <th className="px-4 py-3 text-right">Charge (kW)</th>
                      <th className="px-4 py-3 text-right">Discharge (kW)</th>
                      <th className="px-4 py-3 text-right bg-blue-50/50">SOC (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {chartData.map((row) => (
                      <tr key={row.hour} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2 font-mono text-slate-500 text-xs">{row.hour.toString().padStart(2, '0')}:00</td>
                        <td className="px-4 py-2 text-right font-medium text-slate-700">{row.demand.toFixed(1)}</td>
                        <td className="px-4 py-2 text-right font-medium text-amber-600">{row.solar.toFixed(1)}</td>
                        <td className="px-4 py-2 text-right font-medium text-rose-600">{row.price.toFixed(1)}</td>
                        <td className="px-4 py-2 text-right font-medium text-purple-600">{row.bought.toFixed(1)}</td>
                        <td className="px-4 py-2 text-right font-medium text-emerald-600">{row.realSold.toFixed(1)}</td>
                        <td className="px-4 py-2 text-right font-medium text-blue-600">{row.realCharged.toFixed(1)}</td>
                        <td className="px-4 py-2 text-right font-medium text-sky-600">{row.discharged.toFixed(1)}</td>
                        <td className="px-4 py-2 text-right font-bold text-blue-800 bg-blue-50/50">{row.soc.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
