import React, { useState } from 'react';
import { Home, Bus, BookOpen, Users, Plus, MapPin, Award, Phone, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

// 1. HOUSES PAGE
export const HousesPage: React.FC = () => {
  const houses = [
    { id: 'h-1', name: 'Blue Sapphire House', color: 'from-blue-600 to-indigo-700', master: 'Mr. Adeyemi', points: 1420, members: 84 },
    { id: 'h-2', name: 'Emerald Green House', color: 'from-emerald-600 to-teal-700', master: 'Mrs. Joy Bello', points: 1380, members: 79 },
    { id: 'h-3', name: 'Ruby Red House', color: 'from-rose-600 to-red-700', master: 'Dr. Joseph Okoro', points: 1510, members: 82 },
    { id: 'h-4', name: 'Topaz Yellow House', color: 'from-amber-500 to-orange-600', master: 'Mr. Femi Bakare', points: 1290, members: 76 }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-2">
            <Home className="w-3.5 h-3.5" />
            <span>Co-Curricular & Sports Houses</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">School Houses & Leaderboards</h1>
          <p className="text-amber-100 text-sm max-w-xl">
            House point standings, inter-house athletics allocation, and student house memberships.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {houses.map(house => (
          <div key={house.id} className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden p-5 space-y-4">
            <div className={`w-full h-24 rounded-2xl bg-gradient-to-br ${house.color} p-4 text-white flex flex-col justify-between shadow-md`}>
              <Award className="w-6 h-6 text-white/80" />
              <h3 className="font-bold text-base">{house.name}</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">House Master:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{house.master}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total Points:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">{house.points} pts</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Members:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{house.members} Students</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 2. TRANSPORT PAGE
export const TransportPage: React.FC = () => {
  const routes = [
    { id: 'tr-1', name: 'Route A: Ikeja - Maryland - EIS Main', driver: 'Musa Garba', phone: '+234 803 999 1100', capacity: '30 / 32 Seats', busNo: 'BUS-01 (Toyota Coaster)' },
    { id: 'tr-2', name: 'Route B: Lekki Phase 1 - Victoria Island', driver: 'Sunday Johnson', phone: '+234 802 888 2211', capacity: '28 / 32 Seats', busNo: 'BUS-02 (Toyota Coaster)' },
    { id: 'tr-3', name: 'Route C: Surulere - Yaba - EIS Main', driver: 'Ibrahim Alabi', phone: '+234 805 777 3322', capacity: '25 / 28 Seats', busNo: 'BUS-03 (Mercedes Sprinter)' }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="bg-gradient-to-r from-blue-700 via-cyan-700 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-2">
          <Bus className="w-3.5 h-3.5" />
          <span>Fleet & Transportation Management</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">School Bus Logistics & Routes</h1>
        <p className="text-blue-100 text-sm max-w-xl">
          Track school transit corridors, vehicle drivers, emergency contacts, and term bus levy subscriptions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {routes.map(r => (
          <div key={r.id} className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600">
                <Bus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">{r.name}</h3>
                <p className="text-xs text-gray-400">{r.busNo}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Driver / Captain:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{r.driver}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Emergency Phone:</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">{r.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Occupancy:</span>
                <span className="font-semibold text-emerald-600">{r.capacity}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 3. LIBRARY PAGE
export const LibraryPage: React.FC = () => {
  const books = [
    { id: 'bk-1', title: 'New General Mathematics for Senior Secondary Books 1-3', author: 'M.F. Macrae', isbn: '978-978-081-342-1', available: 45, borrowed: 12 },
    { id: 'bk-2', title: 'Comprehensive Certificate Chemistry for SSCE', author: 'E.N. Ike', isbn: '978-978-142-990-4', available: 38, borrowed: 8 },
    { id: 'bk-3', title: 'Things Fall Apart & Selected Works', author: 'Chinua Achebe', isbn: '978-038-547-454-2', available: 50, borrowed: 19 },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-2">
          <BookOpen className="w-3.5 h-3.5" />
          <span>E-Library & Physical Book Catalog</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">Library & Learning Resources</h1>
        <p className="text-emerald-100 text-sm max-w-xl">
          Search school library inventory, track student borrowings, and access digital e-textbooks.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 p-6 shadow-sm overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-semibold border-b">
            <tr>
              <th className="p-3.5">Book Title</th>
              <th className="p-3.5">Author</th>
              <th className="p-3.5">ISBN</th>
              <th className="p-3.5">Available Copies</th>
              <th className="p-3.5">Borrowed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {books.map(b => (
              <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className="p-3.5 font-bold text-gray-900 dark:text-white">{b.title}</td>
                <td className="p-3.5 text-gray-600 dark:text-gray-400">{b.author}</td>
                <td className="p-3.5 font-mono text-gray-500">{b.isbn}</td>
                <td className="p-3.5 font-bold text-emerald-600">{b.available} In Library</td>
                <td className="p-3.5 text-amber-600 font-semibold">{b.borrowed} On Loan</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
