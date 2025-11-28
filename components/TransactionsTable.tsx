import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';

interface TransactionsTableProps {
  transactions: Transaction[];
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({ transactions }) => {
  const [filter, setFilter] = useState('');

  const filteredTransactions = useMemo(() => {
    if (!filter) return transactions;
    const lowerFilter = filter.toLowerCase();
    return transactions.filter(tx => 
      (tx.description && tx.description.toLowerCase().includes(lowerFilter)) ||
      (tx.id && tx.id.toLowerCase().includes(lowerFilter)) ||
      tx.amount.toString().includes(lowerFilter) ||
      tx.date.includes(lowerFilter)
    );
  }, [transactions, filter]);

  return (
    <div className="bg-[#2C2C2C] rounded-[12px] border border-[#4A4A4A] overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-[#4A4A4A] flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-[18px] font-bold text-[#FFFFFF]">Transaction History</h3>
          <p className="text-sm text-[#A0A0A0] mt-1">
            {filteredTransactions.length} {filteredTransactions.length === 1 ? 'transaction' : 'transactions'} found
          </p>
        </div>
        
        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-[#A0A0A0]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            className="bg-[#1A1A1A] border border-[#4A4A4A] text-[#FFFFFF] text-sm rounded-[8px] focus:ring-1 focus:ring-[#FF5C5C] focus:border-[#FF5C5C] block w-full pl-10 p-2.5 placeholder-[#A0A0A0] transition-colors outline-none"
            placeholder="Search..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar flex-grow">
        <table className="w-full text-left text-sm text-[#A0A0A0]">
          <thead className="bg-[#1A1A1A] text-xs uppercase text-[#A0A0A0] font-semibold sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 tracking-wider">Date</th>
              <th className="px-6 py-4 tracking-wider">ID / Ref</th>
              <th className="px-6 py-4 tracking-wider w-1/3">Description</th>
              <th className="px-6 py-4 tracking-wider text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#4A4A4A]">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((tx, index) => (
                <tr key={`${tx.id}-${index}`} className="hover:bg-[#333333] transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-[#FFFFFF] font-medium">{tx.date}</div>
                    <div className="text-xs text-[#A0A0A0]">{tx.time}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-[#A0A0A0]">
                    {tx.id || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="break-words whitespace-normal text-[#FFFFFF] max-w-[300px] leading-relaxed">
                       {tx.description || 'Transaction'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-[#FFFFFF]">
                    <span className="text-[#A0A0A0] mr-1">{tx.currency}</span>
                    {tx.amount.toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-[#A0A0A0]">
                  No transactions match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};