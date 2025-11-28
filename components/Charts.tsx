import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Transaction, DailySpending } from '../types';

interface ChartsProps {
  transactions: Transaction[];
}

export const Charts: React.FC<ChartsProps> = ({ transactions }) => {
  
  // 1. Daily Data
  const dailyData: DailySpending[] = useMemo(() => {
    const grouped = transactions.reduce((acc, curr) => {
      const date = curr.date;
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += curr.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(grouped)
      .sort()
      .map(date => ({
        date,
        amount: parseFloat(grouped[date].toFixed(2))
      }));
  }, [transactions]);

  // 2. Cumulative Data
  const cumulativeData = useMemo(() => {
     let sum = 0;
     return dailyData.map(d => {
       sum += d.amount;
       return { ...d, cumulative: parseFloat(sum.toFixed(2)) };
     });
  }, [dailyData]);

  // 3. Hourly Data
  const hourlyData = useMemo(() => {
    const hours = Array(24).fill(0);
    
    transactions.forEach(t => {
      if (!t.time) return;
      
      // Attempt to parse time string. Examples: "07:42 PM", "09:21 AM", "14:00"
      try {
        const cleanTime = t.time.trim();
        const isPm = cleanTime.toLowerCase().includes('pm');
        const isAm = cleanTime.toLowerCase().includes('am');
        
        // Split by colon or space to get hour part
        const parts = cleanTime.split(/[:\s]/);
        let h = parseInt(parts[0], 10);
        
        if (isNaN(h)) return;

        // Convert to 24h
        if (isPm && h < 12) h += 12;
        if (isAm && h === 12) h = 0;
        
        if (h >= 0 && h < 24) {
          hours[h] += t.amount;
        }
      } catch (e) {
        // ignore parsing errors
      }
    });

    return hours.map((amount, index) => ({
      hour: `${index.toString().padStart(2, '0')}:00`,
      amount: parseFloat(amount.toFixed(2))
    }));
  }, [transactions]);

  // 4. Weekday Data
  const weekDayData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const sums = Array(7).fill(0);

    transactions.forEach(t => {
      if (!t.date) return;
      try {
        // Parse "YYYY-MM-DD" reliably into local day
        const [y, m, d] = t.date.split('-').map(Number);
        // Note: Month is 0-indexed in JS Date
        const date = new Date(y, m - 1, d);
        
        if (!isNaN(date.getTime())) {
          sums[date.getDay()] += t.amount;
        }
      } catch (e) {
        // ignore errors
      }
    });

    return days.map((day, index) => ({
      day,
      amount: parseFloat(sums[index].toFixed(2))
    }));
  }, [transactions]);

  if (transactions.length === 0) return null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#2C2C2C] border border-[#4A4A4A] p-3 rounded-[8px] shadow-xl">
          <p className="text-[#A0A0A0] text-xs mb-1">{label}</p>
          <p className="text-[#FFFFFF] font-bold text-sm">
            €{payload[0].value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Row 1: Daily Spending (Full Width) */}
      <div className="bg-[#2C2C2C] p-6 rounded-[12px] border border-[#4A4A4A]">
        <h3 className="text-[18px] font-bold text-[#FFFFFF] mb-6">Daily Spending</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#4A4A4A" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                tick={{fontSize: 10, fill: '#A0A0A0'}} 
                axisLine={false} 
                tickLine={false}
                minTickGap={30}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getMonth()+1}/${d.getDate()}`;
                }}
              />
              <YAxis 
                tick={{fontSize: 10, fill: '#A0A0A0'}} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(value) => `€${value}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{fill: '#1A1A1A', opacity: 0.5}} />
              <Bar dataKey="amount" fill="#FF5C5C" radius={[4, 4, 0, 0]} name="Amount" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Cumulative & Hourly */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cumulative Trend Chart */}
        <div className="bg-[#2C2C2C] p-6 rounded-[12px] border border-[#4A4A4A]">
          <h3 className="text-[18px] font-bold text-[#FFFFFF] mb-6">Cumulative Spending</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeData}>
                <defs>
                  <linearGradient id="colorCum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF5C5C" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#FF5C5C" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#4A4A4A" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  tick={{fontSize: 10, fill: '#A0A0A0'}} 
                  axisLine={false} 
                  tickLine={false}
                  minTickGap={30}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return `${d.getMonth()+1}/${d.getDate()}`;
                  }}
                />
                <YAxis 
                  tick={{fontSize: 10, fill: '#A0A0A0'}} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(value) => `€${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke="#FF5C5C" 
                  fillOpacity={1} 
                  fill="url(#colorCum)" 
                  strokeWidth={2}
                  name="Total"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Distribution */}
        <div className="bg-[#2C2C2C] p-6 rounded-[12px] border border-[#4A4A4A]">
          <h3 className="text-[18px] font-bold text-[#FFFFFF] mb-6">Activity by Hour</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#4A4A4A" opacity={0.3} />
                <XAxis 
                  dataKey="hour" 
                  tick={{fontSize: 10, fill: '#A0A0A0'}} 
                  axisLine={false} 
                  tickLine={false}
                  interval={3}
                />
                <YAxis 
                  tick={{fontSize: 10, fill: '#A0A0A0'}} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(value) => `€${value}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#1A1A1A', opacity: 0.5}} />
                <Bar dataKey="amount" fill="#FF5C5C" radius={[4, 4, 0, 0]} name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Weekday Distribution (Full Width) */}
      <div className="bg-[#2C2C2C] p-6 rounded-[12px] border border-[#4A4A4A]">
        <h3 className="text-[18px] font-bold text-[#FFFFFF] mb-6">Spending by Day</h3>
          <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekDayData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#4A4A4A" opacity={0.3} />
              <XAxis 
                dataKey="day" 
                tick={{fontSize: 10, fill: '#A0A0A0'}} 
                axisLine={false} 
                tickLine={false}
              />
              <YAxis 
                tick={{fontSize: 10, fill: '#A0A0A0'}} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(value) => `€${value}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{fill: '#1A1A1A', opacity: 0.5}} />
              <Bar dataKey="amount" fill="#FF5C5C" radius={[4, 4, 0, 0]} name="Amount" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};