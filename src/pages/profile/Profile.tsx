import React from 'react';
import { User, Mail, Phone, MapPin, Camera } from 'lucide-react';

const Profile = () => {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="glass-card p-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-3xl font-bold text-white">
                JD
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">John Doe</h1>
              <p className="text-gray-600 dark:text-gray-300">Super Administrator</p>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm mt-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Active
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value="John" className="w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value="Doe" className="w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" value="john.doe@school.edu" className="w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="tel" value="+234 801 234 5678" className="w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800" />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <textarea rows={2} className="w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 resize-none">
                Owo, Ondo State, Nigeria
              </textarea>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button className="px-6 py-2.5 gradient-bg text-white rounded-xl font-medium hover:opacity-90 transition">
              Save Changes
            </button>
            <button className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
