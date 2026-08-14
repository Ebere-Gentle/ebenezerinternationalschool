import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Search,
  Users,
  Smartphone,
  CheckCheck,
  Paperclip,
  Smile,
  Phone,
  Mail,
  Filter,
  DollarSign,
  AlertTriangle,
  Plus,
  ArrowLeft,
  Sparkles,
  Bot
} from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

interface ChatContact {
  id: string;
  name: string;
  role: string;
  child_name?: string;
  child_class?: string;
  unread: number;
  lastMessage: string;
  lastMessageTime: string;
  avatarColor: string;
  phone?: string;
  email?: string;
  feeStatus?: 'paid' | 'owing' | 'partial';
  balance?: number;
}

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  timestamp: string;
  is_mine: boolean;
  status: 'sent' | 'delivered' | 'read';
  attachment?: {
    name: string;
    type: 'invoice' | 'receipt' | 'image';
    size: string;
  };
}

const INITIAL_CONTACTS: ChatContact[] = [
  {
    id: 'c-01',
    name: 'Chief Adewale Johnson',
    role: 'Parent',
    child_name: 'Chinedu Okonkwo',
    child_class: 'Grade 10 - Science',
    unread: 2,
    lastMessage: 'Good day bursar, I just uploaded the transfer slip for 1st term tuition.',
    lastMessageTime: '10:45 AM',
    avatarColor: 'from-blue-500 to-indigo-600',
    phone: '+234 803 294 8192',
    email: 'adewale.j@gmail.com',
    feeStatus: 'paid',
    balance: 0
  },
  {
    id: 'c-02',
    name: 'Dr. (Mrs) Fatima Abubakar',
    role: 'Parent',
    child_name: 'Zainab Abubakar',
    child_class: 'Grade 8 - Alpha',
    unread: 0,
    lastMessage: 'Can you please confirm if the laboratory levy has been credited?',
    lastMessageTime: 'Yesterday',
    avatarColor: 'from-purple-500 to-pink-600',
    phone: '+234 812 492 0184',
    email: 'fatima.abubakar@hospital.ng',
    feeStatus: 'owing',
    balance: 45000
  },
  {
    id: 'c-03',
    name: 'Mr. Kelechi Eze',
    role: 'Parent',
    child_name: 'David Eze',
    child_class: 'Grade 11 - Art',
    unread: 0,
    lastMessage: 'Thank you for the prompt receipt verification!',
    lastMessageTime: '2 days ago',
    avatarColor: 'from-emerald-500 to-teal-600',
    phone: '+234 809 332 1199',
    email: 'k.eze@enterprise.com',
    feeStatus: 'paid',
    balance: 0
  },
  {
    id: 'c-04',
    name: 'Mrs. Folashade Adeyemi',
    role: 'Teacher (Grade 10 Lead)',
    unread: 1,
    lastMessage: 'Term assessment scores for Grade 10 have been submitted.',
    lastMessageTime: '3 days ago',
    avatarColor: 'from-amber-500 to-orange-600',
    phone: '+234 802 111 8833',
    email: 'f.adeyemi@ebenezer.sch.ng'
  }
];

const INITIAL_MESSAGES: Record<string, Message[]> = {
  'c-01': [
    {
      id: 'm-1',
      sender_id: 'c-01',
      sender_name: 'Chief Adewale Johnson',
      text: 'Good morning, please I want to verify if the 1st Term invoice reflects my payment discount.',
      timestamp: '10:20 AM',
      is_mine: false,
      status: 'read'
    },
    {
      id: 'm-2',
      sender_id: 'admin',
      sender_name: 'Bursary Desk',
      text: 'Good morning Chief Johnson. Yes, the 5% sibling scholarship discount has been automatically applied to Chinedu\'s account.',
      timestamp: '10:35 AM',
      is_mine: true,
      status: 'read'
    },
    {
      id: 'm-3',
      sender_id: 'c-01',
      sender_name: 'Chief Adewale Johnson',
      text: 'Good day bursar, I just uploaded the transfer slip for 1st term tuition.',
      timestamp: '10:45 AM',
      is_mine: false,
      status: 'read',
      attachment: {
        name: 'GTBank_Transfer_Slip_120k.pdf',
        type: 'receipt',
        size: '1.2 MB'
      }
    }
  ]
};

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ChatContact[]>(INITIAL_CONTACTS);
  const [selectedContact, setSelectedContact] = useState<ChatContact>(INITIAL_CONTACTS[0]);
  const [messages, setMessages] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastChannel, setBroadcastChannel] = useState<'sms' | 'whatsapp' | 'in_app'>('whatsapp');
  const [broadcastAudience, setBroadcastAudience] = useState<'debtors' | 'all_parents' | 'teachers'>('debtors');
  const [broadcastMessage, setBroadcastMessage] = useState(
    'Dear Parent, this is a gentle reminder that 1st Term 2025/2026 school fees balance is due. Kindly pay via our secure online gateway: https://pay.ebenezer.sch.ng'
  );

  const activeMessages = messages[selectedContact.id] || [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      sender_id: user?.id || 'admin',
      sender_name: `${user?.first_name || 'Admin'} ${user?.last_name || ''}`,
      text: inputText,
      timestamp: dayjs().format('h:mm A'),
      is_mine: true,
      status: 'delivered'
    };

    setMessages(prev => ({
      ...prev,
      [selectedContact.id]: [...(prev[selectedContact.id] || []), newMsg]
    }));

    setInputText('');

    // Simulate auto-reply after 2 seconds
    setTimeout(() => {
      const replyMsg: Message = {
        id: `msg-reply-${Date.now()}`,
        sender_id: selectedContact.id,
        sender_name: selectedContact.name,
        text: 'Thank you for the quick assistance. I will monitor the portal for the updated digital receipt.',
        timestamp: dayjs().format('h:mm A'),
        is_mine: false,
        status: 'delivered'
      };
      setMessages(prev => ({
        ...prev,
        [selectedContact.id]: [...(prev[selectedContact.id] || []), replyMsg]
      }));
    }, 2000);
  };

  const handleSendFeeReminderTemplate = () => {
    if (!selectedContact.balance) {
      toast.error('This parent currently has zero outstanding balance.');
      return;
    }
    const reminder = `Dear ${selectedContact.name}, gentle reminder regarding outstanding balance of ₦${selectedContact.balance.toLocaleString()} for ${selectedContact.child_name || 'your child'}. You may settle instantly via Paystack or direct transfer.`;
    setInputText(reminder);
  };

  const handleTriggerBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`Broadcast dispatched via ${broadcastChannel.toUpperCase()} to ${broadcastAudience === 'debtors' ? '42 Outstanding Debtors' : 'all parents'}`);
    setShowBroadcastModal(false);
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.child_name && c.child_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-10">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-cyan-700 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-2">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Communication & Broadcast Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Messages & Parent Engagement</h1>
          <p className="text-indigo-100 text-sm max-w-xl">
            Real-time direct messaging with parents, bursary inquiries, and automated WhatsApp/SMS fee reminders.
          </p>
        </div>

        <button
          onClick={() => setShowBroadcastModal(true)}
          className="px-5 py-3 rounded-2xl bg-white text-indigo-700 font-bold text-sm hover:bg-indigo-50 shadow-lg transition-all flex items-center justify-center gap-2 self-start md:self-auto"
        >
          <Smartphone className="w-4 h-4 text-emerald-600" />
          <span>SMS / WhatsApp Broadcast</span>
        </button>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[620px]">
        {/* Left Contact List Sidebar */}
        <div className="md:col-span-4 lg:col-span-4 border-r border-gray-200/80 dark:border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-200/80 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search parent or student..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/50">
            {filteredContacts.map(contact => (
              <div
                key={contact.id}
                onClick={() => {
                  setSelectedContact(contact);
                  setContacts(prev =>
                    prev.map(c => (c.id === contact.id ? { ...c, unread: 0 } : c))
                  );
                }}
                className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 ${
                  selectedContact.id === contact.id
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-blue-600'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                }`}
              >
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${contact.avatarColor} text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm`}>
                  {contact.name[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                      {contact.name}
                    </h4>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{contact.lastMessageTime}</span>
                  </div>

                  {contact.child_name && (
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium truncate">
                      Parent of: {contact.child_name} ({contact.child_class})
                    </p>
                  )}

                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {contact.lastMessage}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5">
                    {contact.feeStatus === 'owing' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                        Owes ₦{contact.balance?.toLocaleString()}
                      </span>
                    )}
                    {contact.feeStatus === 'paid' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Fees Cleared
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Active Conversation Area */}
        <div className="md:col-span-8 lg:col-span-8 flex flex-col h-[620px]">
          {/* Active Chat Header */}
          <div className="p-4 border-b border-gray-200/80 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${selectedContact.avatarColor} text-white flex items-center justify-center font-bold text-sm shadow-sm`}>
                {selectedContact.name[0]}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {selectedContact.name}
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedContact.role} {selectedContact.child_name ? `• ${selectedContact.child_name}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedContact.feeStatus === 'owing' && (
                <button
                  onClick={handleSendFeeReminderTemplate}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 transition-all flex items-center gap-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Insert Fee Notice
                </button>
              )}

              {selectedContact.phone && (
                <a
                  href={`tel:${selectedContact.phone}`}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                  title="Call Phone"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/20 dark:bg-gray-900/50">
            {activeMessages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.is_mine ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl p-3.5 text-xs sm:text-sm shadow-sm space-y-1.5 ${
                    msg.is_mine
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200/80 dark:border-gray-700 rounded-bl-none'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                  {msg.attachment && (
                    <div className={`p-2.5 rounded-xl flex items-center gap-2.5 border mt-2 ${
                      msg.is_mine ? 'bg-blue-700/80 border-blue-500' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                    }`}>
                      <Paperclip className="w-4 h-4" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs truncate">{msg.attachment.name}</p>
                        <p className="text-[10px] opacity-75">{msg.attachment.size}</p>
                      </div>
                    </div>
                  )}

                  <div className={`flex items-center justify-end gap-1 text-[10px] ${
                    msg.is_mine ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    <span>{msg.timestamp}</span>
                    {msg.is_mine && <CheckCheck className="w-3 h-3 text-blue-200" />}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input Box */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-2">
            <button
              type="button"
              onClick={() => toast.success('Attachment picker ready')}
              className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              placeholder={`Message ${selectedContact.name}...`}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              type="submit"
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-md flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Broadcast Modal */}
      <AnimatePresence>
        {showBroadcastModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      SMS & WhatsApp Broadcast Gateway
                    </h3>
                    <p className="text-xs text-gray-500">Send bulk alerts and payment reminders</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleTriggerBroadcast} className="py-4 space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Channel Delivery
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'whatsapp', label: 'WhatsApp API' },
                      { id: 'sms', label: 'Direct SMS' },
                      { id: 'in_app', label: 'Portal In-App' }
                    ].map(ch => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setBroadcastChannel(ch.id as any)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold capitalize text-center ${
                          broadcastChannel === ch.id
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {ch.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Target Group
                  </label>
                  <select
                    value={broadcastAudience}
                    onChange={e => setBroadcastAudience(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="debtors">Parents with Fee Arrears (42 recipients)</option>
                    <option value="all_parents">All Registered Parents (318 recipients)</option>
                    <option value="teachers">All Teaching Staff (24 recipients)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Message Template
                  </label>
                  <textarea
                    rows={4}
                    value={broadcastMessage}
                    onChange={e => setBroadcastMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs leading-relaxed"
                  />
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Estimated units: 2 SMS parts (WhatsApp template pre-approved)
                  </span>
                </div>

                <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBroadcastModal(false)}
                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Broadcast</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessagesPage;
