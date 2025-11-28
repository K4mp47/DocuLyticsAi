import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  colorClass: string; // Kept for interface compatibility but styling is overridden
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, trend }) => {
  return (
    <div className="bg-[#2C2C2C] rounded-[12px] border border-[#4A4A4A] p-6 flex items-start justify-between transition-all hover:border-[#666666]">
      <div>
        <p className="text-sm font-medium text-[#A0A0A0] mb-2">{title}</p>
        <h3 className="text-2xl font-bold text-[#FFFFFF] tracking-tight">{value}</h3>
        {trend && (
          <p className="text-xs mt-3 text-[#FF5C5C] font-medium bg-[#FF5C5C]/10 px-2 py-0.5 rounded-[4px] inline-block border border-[#FF5C5C]/20">
            {trend}
          </p>
        )}
      </div>
      <div className="p-3 rounded-[8px] bg-[#1A1A1A] text-[#FF5C5C] border border-[#4A4A4A]">
        {icon}
      </div>
    </div>
  );
};