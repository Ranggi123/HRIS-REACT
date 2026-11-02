import React, { useState } from 'react';
export default function Account() {
  const [activeTab, setActiveTab] = useState('personal');
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Employee Details</h2>
      <div className="mb-4">
        <ul className="flex flex-wrap -mb-px text-sm font-medium text-center border-b border-gray-200">
          <li className="mr-2">
            <button onClick={() => setActiveTab('personal')} className={`inline-block p-4 text-sm border-b-2 rounded-t-lg transition-all ${activeTab === 'personal' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-gray-600'}`}>Personal</button>
          </li>
          <li className="mr-2">
            <button onClick={() => setActiveTab('employee')} className={`inline-block p-4 text-sm border-b-2 rounded-t-lg transition-all ${activeTab === 'employee' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-gray-600'}`}>Employee</button>
          </li>
          <li className="mr-2">
            <button onClick={() => setActiveTab('bank')} className={`inline-block p-4 text-sm border-b-2 rounded-t-lg transition-all ${activeTab === 'bank' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-gray-600'}`}>Bank & Benefit</button>
          </li>
        </ul>
      </div>
      <div className="pt-2 text-gray-600 text-sm">
        {activeTab === 'personal' && <p>Informasi Data Diri.</p>}
        {activeTab === 'employee' && <p>Informasi Pekerjaan & Kontrak.</p>}
        {activeTab === 'bank' && <p>Informasi Bank & Benefit.</p>}
      </div>
    </div>
  );
}