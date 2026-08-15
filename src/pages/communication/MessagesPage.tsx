// src/pages/messages/MessagesPage.tsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Pause,
  Phone,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Smartphone,
  Trash2,
  UserMinus,
  Users,
  Video,
  X,
} from 'lucide-react';

import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

/* ============================================================
   TYPES
============================================================ */

type Audience = 'parents' | 'teachers' | 'all';
type Channel = 'in_app' | 'sms' | 'whatsapp';

interface Contact {
  conversationId: string;
  userId: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  studentId?: string;
  studentName?: string;
  className?: string;
  unread: number;
  lastMessage: string;
  lastMessageAt?: string;
  avatar: string;
  isOnline?: boolean;
  lastSeen?: string;
}

interface NewUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  email: string | null;
  phone_number: string | null;
  role: string | null;
  branch_id: string | null;
  profile_image_url: string | null;
  is_active: boolean | null;
  studentId?: string;
  studentName?: string;
  className?: string;
}

interface MessageRow {
  id: string;
  conversation_id?: string;
  sender_id: string | null;
  body: string | null;
  message_type: string;
  status: string;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  deleted_at: string | null;
  sender_first_name: string | null;
  sender_last_name: string | null;
  sender_middle_name: string | null;
  sender_profile_image_url: string | null;
}

interface Attachment {
  id: string;
  name: string;
  url?: string;
  type: 'image' | 'video' | 'pdf' | 'file';
  mimeType?: string;
  size: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  body: string;
  sentAt: string;
  isMine: boolean;
  status: string;
  messageType: string;
  attachment?: Attachment;
  optimistic?: boolean;
}

interface Debtor {
  id: string;
  userId?: string;
  studentId?: string;
  name: string;
  phone: string;
  role: string;
  profileImage?: string;
  studentName?: string;
  className?: string;
  balance: number;
  status: 'active' | 'paused' | 'paid' | 'removed';
  smsEnabled: boolean;
  frequencyHours: number;
  lastSmsSentAt?: string;
  nextSmsAt?: string;
  totalSmsSent: number;
  addedAt: string;
}

interface DebtorSettings {
  enabled: boolean;
  frequencyHours: number;
  message: string;
  maxRemindersPerDay: number;
  startTime: string;
  endTime: string;
  stopWhenPaid: boolean;
  senderId: string;
}

interface MenuState {
  conversationId: string | null;
  x: number;
  y: number;
}

/* ============================================================
   CONSTANTS
============================================================ */

const BUCKET = 'message-attachments';

const DEFAULT_DEBTOR_SETTINGS: DebtorSettings = {
  enabled: false,
  frequencyHours: 6,
  message:
    'Dear {parent_name}, this is a reminder that {student_name} has an outstanding school fee balance of {balance}. Kindly make payment through the school portal. Thank you.',
  maxRemindersPerDay: 3,
  startTime: '08:00',
  endTime: '18:00',
  stopWhenPaid: true,
  senderId: '',
};

const gradients = [
  'from-blue-500 to-indigo-600',
  'from-purple-500 to-pink-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-cyan-500 to-blue-600',
  'from-rose-500 to-red-600',
  'from-violet-500 to-purple-600',
];

/* ============================================================
   HELPERS
============================================================ */

const initials = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join('') || 'U';

const avatar = (id: string) => {
  let hash = 0;

  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  return gradients[Math.abs(hash) % gradients.length];
};

const nameOf = (
  first?: string | null,
  last?: string | null,
  middle?: string | null,
  email?: string | null
) =>
  [first, middle, last]
    .filter(Boolean)
    .join(' ')
    .trim() ||
  email ||
  'User';

const roleOf = (role?: string | null) =>
  role
    ? role
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (x) => x.toUpperCase())
    : 'User';

const errorMessage = (e: any, fallback: string) =>
  e?.message ||
  e?.details ||
  e?.hint ||
  fallback;

const rpcId = (value: any): string | null => {
  if (!value) return null;

  if (typeof value === 'string') return value;

  if (Array.isArray(value)) {
    return rpcId(value[0]);
  }

  return (
    value.id ||
    value.conversation_id ||
    value.message_id ||
    value.broadcast_id ||
    null
  );
};

const formatBytes = (size?: number | null) => {
  if (!size) return '';

  if (size < 1024) return `${size} B`;

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const timeOf = (value?: string | null) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
  });
};

const lastSeenText = (value?: string | null) => {
  if (!value) return 'Last seen unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Last seen unavailable';
  }

  return `Last seen ${date.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
};

const attachmentType = (
  mime?: string | null
): Attachment['type'] => {
  if (!mime) return 'file';

  if (mime.startsWith('image/')) return 'image';

  if (mime.startsWith('video/')) return 'video';

  if (mime.includes('pdf')) return 'pdf';

  return 'file';
};

const formatCurrency = (amount: number) =>
  `₦${Number(amount || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

/* ============================================================
   COMPONENT
============================================================ */

const MessagesPage: React.FC = () => {
  const { user } = useAuth();

  const uid = user?.id;

  const [me, setMe] = useState<any>(null);

  const [contacts, setContacts] =
    useState<Contact[]>([]);

  const [selected, setSelected] =
    useState<Contact | null>(null);

  const [messages, setMessages] =
    useState<Record<string, ChatMessage[]>>({});

  const [loading, setLoading] = useState(true);

  const [loadingMessages, setLoadingMessages] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [search, setSearch] =
    useState('');

  const [text, setText] =
    useState('');

  const [file, setFile] =
    useState<File | null>(null);

  const [newOpen, setNewOpen] =
    useState(false);

  const [newSearch, setNewSearch] =
    useState('');

  const [newUsers, setNewUsers] =
    useState<NewUser[]>([]);

  const [loadingUsers, setLoadingUsers] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [mobile, setMobile] =
    useState(false);

  const [broadcastOpen, setBroadcastOpen] =
    useState(false);

  const [broadcastTitle, setBroadcastTitle] =
    useState('School Broadcast');

  const [broadcastMessage, setBroadcastMessage] =
    useState('');

  const [audience, setAudience] =
    useState<Audience>('parents');

  const [channel, setChannel] =
    useState<Channel>('in_app');

  const [broadcasting, setBroadcasting] =
    useState(false);

  /* ==========================================================
     DEBTORS
  ========================================================== */

  const [debtors, setDebtors] =
    useState<Debtor[]>([]);

  const [debtorSettings, setDebtorSettings] =
    useState<DebtorSettings>(
      DEFAULT_DEBTOR_SETTINGS
    );

  const [debtorSettingsOpen, setDebtorSettingsOpen] =
    useState(false);

  const [selectedDebtor, setSelectedDebtor] =
    useState<Debtor | null>(null);

  const [debtorSearch, setDebtorSearch] =
    useState('');

  const [dragOverDebtors, setDragOverDebtors] =
    useState(false);

  const [savingDebtorSettings, setSavingDebtorSettings] =
    useState(false);

  /* ==========================================================
     MENUS
  ========================================================== */

  const [menu, setMenu] =
    useState<MenuState>({
      conversationId: null,
      x: 0,
      y: 0,
    });

  /* ==========================================================
     REFS
  ========================================================== */

  const endRef =
    useRef<HTMLDivElement | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const realtimeRef =
    useRef<any>(null);

  const searchTimer =
    useRef<number | null>(null);

  /* ==========================================================
     LOAD CURRENT USER
  ========================================================== */

  const loadMe = useCallback(async () => {
    if (!uid) return null;

    const { data, error } =
      await supabase
        .from('users')
        .select(
          `
          id,
          first_name,
          last_name,
          middle_name,
          email,
          phone_number,
          role,
          branch_id,
          profile_image_url,
          is_active,
          last_login,
          updated_at
        `
        )
        .eq('id', uid)
        .maybeSingle();

    if (error) throw error;

    setMe(data);

    return data;
  }, [uid]);

  /* ==========================================================
     LOAD CONTACTS
  ========================================================== */

  const loadContacts = useCallback(async () => {
    if (!uid) return [];

    const { data, error } =
      await supabase.rpc(
        'get_my_conversations'
      );

    if (error) throw error;

    const result: Contact[] = (data || [])
      .filter(
        (row: any) =>
          row.other_user_id
      )
      .map((row: any) => {
        const lastSeen =
          row.other_user_last_login ||
          row.other_user_updated_at ||
          undefined;

        return {
          conversationId:
            row.conversation_id,

          userId:
            row.other_user_id,

          name:
            nameOf(
              row.other_user_first_name,
              row.other_user_last_name,
              row.other_user_middle_name,
              row.other_user_email
            ),

          role:
            roleOf(
              row.other_user_role
            ),

          email:
            row.other_user_email ||
            undefined,

          phone:
            row.other_user_phone ||
            undefined,

          profileImage:
            row.other_user_profile_image_url ||
            row.student_passport_url ||
            undefined,

          studentId:
            row.student_id ||
            undefined,

          studentName:
            row.student_first_name
              ? nameOf(
                  row.student_first_name,
                  row.student_last_name,
                  row.student_middle_name
                )
              : undefined,

          className:
            row.class_name ||
            undefined,

          unread:
            Number(
              row.unread_count || 0
            ),

          lastMessage:
            row.last_message_preview ||
            (row.last_message_id
              ? 'Message'
              : 'No messages yet'),

          lastMessageAt:
            row.last_message_at ||
            undefined,

          avatar:
            avatar(row.other_user_id),

          lastSeen,

          isOnline:
            lastSeen
              ? Date.now() -
                  new Date(lastSeen).getTime() <
                5 * 60 * 1000
              : false,
        };
      });

    setContacts(result);

    setSelected((current) => {
      if (!current) return current;

      return (
        result.find(
          (x) =>
            x.conversationId ===
            current.conversationId
        ) || current
      );
    });

    return result;
  }, [uid]);

  /* ==========================================================
     LOAD DEBTORS FROM DATABASE
  ========================================================== */

  const loadDebtors = useCallback(async () => {
    if (!me?.branch_id) return;

    const { data, error } =
      await supabase
        .from('debtors')
        .select('*')
        .eq('branch_id', me.branch_id)
        .neq('status', 'removed')
        .order('created_at', {
          ascending: false,
        });

    if (error) {
      console.error(
        'Debtor loading error:',
        error
      );
      return;
    }

    setDebtors(
      (data || []).map(
        (row: any): Debtor => ({
          id: row.id,
          userId: row.user_id || undefined,
          studentId:
            row.student_id || undefined,
          name:
            row.parent_name ||
            'Parent',
          phone:
            row.phone_number ||
            '',
          role: 'Parent',
          profileImage:
            undefined,
          studentName:
            row.student_name ||
            undefined,
          className:
            undefined,
          balance:
            Number(
              row.outstanding_balance || 0
            ),
          status:
            row.status || 'active',
          smsEnabled:
            Boolean(
              row.sms_enabled
            ),
          frequencyHours:
            Number(
              row.sms_frequency_hours || 24
            ),
          lastSmsSentAt:
            row.last_sms_sent_at ||
            undefined,
          nextSmsAt:
            row.next_sms_at ||
            undefined,
          totalSmsSent:
            Number(
              row.total_sms_sent || 0
            ),
          addedAt:
            row.created_at,
        })
      )
    );
  }, [me?.branch_id]);

  /* ==========================================================
     LOAD SMS SETTINGS
  ========================================================== */

  const loadDebtorSettings =
    useCallback(async () => {
      if (!me?.branch_id) return;

      const { data, error } =
        await supabase
          .from(
            'debtor_sms_settings'
          )
          .select('*')
          .eq(
            'branch_id',
            me.branch_id
          )
          .maybeSingle();

      if (error) {
        console.error(
          'SMS settings error:',
          error
        );
        return;
      }

      if (!data) return;

      setDebtorSettings({
        enabled:
          Boolean(data.enabled),

        frequencyHours:
          Number(
            data.frequency_hours || 24
          ),

        message:
          data.message_template ||
          DEFAULT_DEBTOR_SETTINGS.message,

        maxRemindersPerDay:
          Number(
            data.max_sms_per_day || 3
          ),

        startTime:
          String(
            data.start_time ||
              '08:00'
          ).slice(0, 5),

        endTime:
          String(
            data.end_time ||
              '18:00'
          ).slice(0, 5),

        stopWhenPaid: true,

        senderId:
          data.sender_id || '',
      });
    }, [me?.branch_id]);

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!uid) {
        setLoading(false);
        return;
      }

      try {
        const current = await loadMe();

        if (cancelled) return;

        if (current?.branch_id) {
          await Promise.all([
            loadContacts(),
            loadDebtors(),
            loadDebtorSettings(),
          ]);
        }
      } catch (e) {
        console.error(e);

        if (!cancelled) {
          toast.error(
            errorMessage(
              e,
              'Could not load messaging.'
            )
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [
    uid,
    loadMe,
    loadContacts,
    loadDebtors,
    loadDebtorSettings,
  ]);

  /* ==========================================================
     LOAD MESSAGES
  ========================================================== */

  const loadMessages = useCallback(
    async (
      conversationId: string,
      silent = false
    ) => {
      if (!uid || !conversationId) return;

      if (!silent) {
        setLoadingMessages(true);
      }

      try {
        const {
          data,
          error,
        } =
          await supabase.rpc(
            'get_conversation_messages',
            {
              p_conversation_id:
                conversationId,
            }
          );

        if (error) throw error;

        const rows =
          (data || []) as MessageRow[];

        let attachments: any[] = [];

        if (rows.length) {
          const ids =
            rows.map(
              (row) => row.id
            );

          const attachmentResult =
            await supabase.rpc(
              'get_message_attachments',
              {
                p_message_ids:
                  ids,
              }
            );

          if (
            !attachmentResult.error
          ) {
            attachments =
              attachmentResult.data ||
              [];
          }
        }

        const attachmentMap =
          new Map<
            string,
            any[]
          >();

        for (const item of attachments) {
          const current =
            attachmentMap.get(
              item.message_id
            ) || [];

          current.push(item);

          attachmentMap.set(
            item.message_id,
            current
          );
        }

        const formatted: ChatMessage[] =
          rows.map((row) => {
            let status =
              row.status ||
              'sent';

            if (
              row.sender_id ===
              uid
            ) {
              if (row.read_at) {
                status = 'read';
              } else if (
                row.delivered_at
              ) {
                status =
                  'delivered';
              }
            }

            const attachment =
              attachmentMap.get(
                row.id
              )?.[0];

            return {
              id: row.id,

              senderId:
                row.sender_id ||
                '',

              senderName:
                nameOf(
                  row.sender_first_name,
                  row.sender_last_name,
                  row.sender_middle_name
                ),

              senderImage:
                row.sender_profile_image_url ||
                undefined,

              body:
                row.deleted_at
                  ? 'This message was deleted.'
                  : row.body || '',

              sentAt:
                row.sent_at,

              isMine:
                row.sender_id ===
                uid,

              status,

              messageType:
                row.message_type,

              attachment:
                attachment
                  ? {
                      id:
                        attachment.id,

                      name:
                        attachment.file_name,

                      url:
                        attachment.file_url ||
                        undefined,

                      type:
                        attachmentType(
                          attachment.mime_type
                        ),

                      mimeType:
                        attachment.mime_type ||
                        undefined,

                      size:
                        formatBytes(
                          attachment.file_size
                        ),
                    }
                  : undefined,
            };
          });

        setMessages((current) => ({
          ...current,
          [conversationId]:
            formatted,
        }));

        if (rows.length) {
          void supabase.rpc(
            'mark_conversation_read',
            {
              p_conversation_id:
                conversationId,

              p_message_id:
                rows[
                  rows.length - 1
                ].id,
            }
          );

          setContacts((current) =>
            current.map((contact) =>
              contact.conversationId ===
              conversationId
                ? {
                    ...contact,
                    unread: 0,
                  }
                : contact
            )
          );
        }
      } catch (e) {
        console.error(e);

        if (!silent) {
          toast.error(
            errorMessage(
              e,
              'Could not load messages.'
            )
          );
        }
      } finally {
        if (!silent) {
          setLoadingMessages(false);
        }
      }
    },
    [uid]
  );

  /* ==========================================================
     REALTIME
  ========================================================== */

  useEffect(() => {
    if (
      !uid ||
      !me?.branch_id
    ) {
      return;
    }

    if (realtimeRef.current) {
      void supabase.removeChannel(
        realtimeRef.current
      );
    }

    const channel =
      supabase
        .channel(
          `messages-${uid}`
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter:
              `branch_id=eq.${me.branch_id}`,
          },
          (payload: any) => {
            const row =
              payload.new;

            if (
              row.conversation_id ===
              selected?.conversationId
            ) {
              void loadMessages(
                row.conversation_id,
                true
              );
            } else {
              void loadContacts();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter:
              `branch_id=eq.${me.branch_id}`,
          },
          (payload: any) => {
            const row =
              payload.new;

            if (
              row.conversation_id ===
              selected?.conversationId
            ) {
              void loadMessages(
                row.conversation_id,
                true
              );
            }

            void loadContacts();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table:
              'conversation_participants',
            filter:
              `user_id=eq.${uid}`,
          },
          () => {
            void loadContacts();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'debtors',
            filter:
              `branch_id=eq.${me.branch_id}`,
          },
          () => {
            void loadDebtors();
          }
        )
        .subscribe();

    realtimeRef.current =
      channel;

    return () => {
      if (realtimeRef.current) {
        void supabase.removeChannel(
          realtimeRef.current
        );

        realtimeRef.current =
          null;
      }
    };
  }, [
    uid,
    me?.branch_id,
    selected?.conversationId,
    loadMessages,
    loadContacts,
    loadDebtors,
  ]);

  /* ==========================================================
     ACTIVE MESSAGES
  ========================================================== */

  const activeMessages =
    useMemo(
      () =>
        selected
          ? messages[
              selected
                .conversationId
            ] || []
          : [],
      [
        messages,
        selected,
      ]
    );

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [
    activeMessages.length,
    selected?.conversationId,
  ]);

  /* ==========================================================
     FILTERS
  ========================================================== */

  const filteredContacts =
    useMemo(() => {
      const q =
        search
          .trim()
          .toLowerCase();

      if (!q) {
        return contacts;
      }

      return contacts.filter(
        (contact) =>
          [
            contact.name,
            contact.role,
            contact.email,
            contact.phone,
            contact.studentName,
          ].some((value) =>
            value
              ?.toLowerCase()
              .includes(q)
          )
      );
    }, [
      contacts,
      search,
    ]);

  const filteredDebtors =
    useMemo(() => {
      const q =
        debtorSearch
          .trim()
          .toLowerCase();

      if (!q) {
        return debtors;
      }

      return debtors.filter(
        (debtor) =>
          debtor.name
            .toLowerCase()
            .includes(q) ||
          debtor.phone
            .toLowerCase()
            .includes(q) ||
          debtor.studentName
            ?.toLowerCase()
            .includes(q)
      );
    }, [
      debtors,
      debtorSearch,
    ]);

  /* ==========================================================
     USER SEARCH
  ========================================================== */

  const searchUsers =
    useCallback(
      async (query: string) => {
        if (!uid) return;

        setLoadingUsers(true);

        try {
          const {
            data,
            error,
          } =
            await supabase.rpc(
              'search_message_users',
              {
                p_search:
                  query.trim(),
              }
            );

          if (error) throw error;

          setNewUsers(
            (data || [])
              .filter(
                (row: any) =>
                  row.id !== uid
              )
              .map(
                (
                  row: any
                ): NewUser => ({
                  id: row.id,

                  first_name:
                    row.first_name,

                  last_name:
                    row.last_name,

                  middle_name:
                    row.middle_name,

                  email:
                    row.email,

                  phone_number:
                    row.phone_number,

                  role:
                    row.role,

                  branch_id:
                    row.branch_id,

                  profile_image_url:
                    row.profile_image_url,

                  is_active:
                    row.is_active,

                  studentId:
                    row.student_id ||
                    undefined,

                  studentName:
                    row.student_first_name
                      ? nameOf(
                          row.student_first_name,
                          row.student_last_name,
                          row.student_middle_name
                        )
                      : undefined,

                  className:
                    row.class_name ||
                    undefined,
                })
              )
          );
        } catch (e) {
          console.error(e);

          toast.error(
            errorMessage(
              e,
              'Unable to search users.'
            )
          );
        } finally {
          setLoadingUsers(false);
        }
      },
      [uid]
    );

  useEffect(() => {
    if (!newOpen) return;

    if (searchTimer.current) {
      window.clearTimeout(
        searchTimer.current
      );
    }

    searchTimer.current =
      window.setTimeout(
        () => {
          void searchUsers(
            newSearch
          );
        },
        newSearch.trim()
          ? 180
          : 0
      );

    return () => {
      if (searchTimer.current) {
        window.clearTimeout(
          searchTimer.current
        );
      }
    };
  }, [
    newOpen,
    newSearch,
    searchUsers,
  ]);

  /* ==========================================================
     START CONVERSATION
  ========================================================== */

  const startConversation =
    async (newUser: NewUser) => {
      if (!uid) return;

      setCreating(true);

      try {
        const {
          data,
          error,
        } =
          await supabase.rpc(
            'create_direct_conversation',
            {
              p_other_user_id:
                newUser.id,

              p_student_id:
                newUser.studentId ||
                null,
            }
          );

        if (error) throw error;

        const conversationId =
          rpcId(data);

        if (!conversationId) {
          throw new Error(
            'Conversation ID was not returned.'
          );
        }

        const contact: Contact = {
          conversationId,

          userId:
            newUser.id,

          name:
            nameOf(
              newUser.first_name,
              newUser.last_name,
              newUser.middle_name,
              newUser.email
            ),

          role:
            roleOf(
              newUser.role
            ),

          email:
            newUser.email ||
            undefined,

          phone:
            newUser.phone_number ||
            undefined,

          profileImage:
            newUser.profile_image_url ||
            undefined,

          studentId:
            newUser.studentId,

          studentName:
            newUser.studentName,

          className:
            newUser.className,

          unread: 0,

          lastMessage:
            'No messages yet',

          avatar:
            avatar(newUser.id),
        };

        setContacts(
          (current) => [
            contact,
            ...current.filter(
              (item) =>
                item.conversationId !==
                conversationId
            ),
          ]
        );

        setSelected(contact);

        setNewOpen(false);

        setMobile(true);

        await loadMessages(
          conversationId
        );

        void loadContacts();

        toast.success(
          `Conversation with ${contact.name} is ready.`
        );
      } catch (e) {
        console.error(e);

        toast.error(
          errorMessage(
            e,
            'Unable to start conversation.'
          )
        );
      } finally {
        setCreating(false);
      }
    };

  /* ==========================================================
     ATTACHMENT PICKER
  ========================================================== */

  const pickFile = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const picked =
      event.target.files?.[0];

    if (!picked) return;

    if (
      picked.size >
      10 * 1024 * 1024
    ) {
      toast.error(
        'Maximum attachment size is 10 MB.'
      );

      event.target.value =
        '';

      return;
    }

    setFile(picked);
  };

  /* ==========================================================
     UPLOAD ATTACHMENT
  ========================================================== */

  const uploadAttachment =
    async (
      messageId: string,
      conversationId: string,
      selectedFile: File
    ): Promise<Attachment> => {
      if (!me?.branch_id) {
        throw new Error(
          'School branch could not be identified.'
        );
      }

      const extension =
        selectedFile.name.includes('.')
          ? selectedFile.name
              .split('.')
              .pop()
              ?.toLowerCase() ||
            'file'
          : 'file';

      const path =
        `${me.branch_id}/messages/${conversationId}/${messageId}/${crypto.randomUUID()}.${extension}`;

      /*
       * IMPORTANT:
       * The SQL migration creates this exact bucket.
       */
      const {
        error:
          storageError,
      } =
        await supabase.storage
          .from(BUCKET)
          .upload(
            path,
            selectedFile,
            {
              upsert: false,
              cacheControl:
                '3600',
              contentType:
                selectedFile.type ||
                'application/octet-stream',
            }
          );

      if (storageError) {
        throw storageError;
      }

      const {
        data:
          publicUrlData,
      } =
        supabase.storage
          .from(BUCKET)
          .getPublicUrl(path);

      const publicUrl =
        publicUrlData
          ?.publicUrl;

      /*
       * Use the SECURITY DEFINER RPC that you already fixed.
       * Do NOT directly insert into message_attachments.
       */
      const {
        data:
          attachmentResult,
        error:
          attachmentError,
      } =
        await supabase.rpc(
          'create_message_attachment',
          {
            p_message_id:
              messageId,

            p_file_name:
              selectedFile.name,

            p_storage_bucket:
              BUCKET,

            p_storage_path:
              path,

            p_file_url:
              publicUrl || null,

            p_file_size:
              selectedFile.size,

            p_mime_type:
              selectedFile.type ||
              'application/octet-stream',
          }
        );

      if (attachmentError) {
        await supabase.storage
          .from(BUCKET)
          .remove([path]);

        throw attachmentError;
      }

      return {
        id:
          rpcId(
            attachmentResult
          ) ||
          crypto.randomUUID(),

        name:
          selectedFile.name,

        url:
          publicUrl,

        type:
          attachmentType(
            selectedFile.type
          ),

        mimeType:
          selectedFile.type,

        size:
          formatBytes(
            selectedFile.size
          ),
      };
    };

  /* ==========================================================
     SEND MESSAGE
  ========================================================== */

  const sendMessage =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();

      if (
        !selected ||
        !uid
      ) {
        return;
      }

      const body =
        text.trim();

      const selectedFile =
        file;

      if (
        !body &&
        !selectedFile
      ) {
        return;
      }

      const conversation =
        selected;

      const optimisticId =
        `optimistic-${crypto.randomUUID()}`;

      const optimisticMessage: ChatMessage =
        {
          id:
            optimisticId,

          senderId:
            uid,

          senderName:
            nameOf(
              me?.first_name,
              me?.last_name,
              me?.middle_name,
              me?.email
            ),

          senderImage:
            me?.profile_image_url ||
            undefined,

          body,

          sentAt:
            new Date().toISOString(),

          isMine:
            true,

          status:
            'sending',

          messageType:
            selectedFile
              ? selectedFile.type.startsWith(
                  'image/'
                )
                ? 'image'
                : selectedFile.type.startsWith(
                    'video/'
                  )
                  ? 'video'
                  : 'file'
              : 'text',

          optimistic:
            true,
        };

      /*
       * Instant UI.
       */
      setMessages(
        (current) => ({
          ...current,

          [conversation.conversationId]:
            [
              ...(current[
                conversation
                  .conversationId
              ] || []),

              optimisticMessage,
            ],
        })
      );

      setText('');
      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value =
          '';
      }

      setSending(true);

      try {
        /*
         * Message itself is sent immediately.
         * Attachment does NOT block the message.
         */
        const {
          data,
          error,
        } =
          await supabase.rpc(
            'send_message',
            {
              p_conversation_id:
                conversation.conversationId,

              p_body:
                body || null,

              p_message_type:
                selectedFile
                  ? selectedFile.type.startsWith(
                      'image/'
                    )
                    ? 'image'
                    : selectedFile.type.startsWith(
                        'video/'
                      )
                      ? 'video'
                      : 'file'
                  : 'text',

              p_student_id:
                conversation.studentId ||
                null,
            }
          );

        if (error) throw error;

        const messageId =
          rpcId(data);

        if (!messageId) {
          throw new Error(
            'Message ID was not returned.'
          );
        }

        /*
         * Replace optimistic ID immediately.
         */
        setMessages(
          (current) => ({
            ...current,

            [conversation.conversationId]:
              (
                current[
                  conversation
                    .conversationId
                ] || []
              ).map((message) =>
                message.id ===
                optimisticId
                  ? {
                      ...message,
                      id:
                        messageId,
                      status:
                        'sent',
                      optimistic:
                        false,
                    }
                  : message
              ),
          })
        );

        /*
         * Move conversation to top.
         */
        setContacts(
          (current) =>
            current
              .map((contact) =>
                contact.conversationId ===
                conversation.conversationId
                  ? {
                      ...contact,
                      lastMessage:
                        body ||
                        `Attachment: ${
                          selectedFile?.name ||
                          'file'
                        }`,
                      lastMessageAt:
                        new Date().toISOString(),
                      unread: 0,
                    }
                  : contact
              )
              .sort(
                (a, b) =>
                  new Date(
                    b.lastMessageAt ||
                      0
                  ).getTime() -
                  new Date(
                    a.lastMessageAt ||
                      0
                  ).getTime()
              )
        );

        setSending(false);

        toast.success(
          'Message sent.',
          {
            duration: 1400,
          }
        );

        /*
         * Attachment uploads in background.
         */
        if (selectedFile) {
          void uploadAttachment(
            messageId,
            conversation.conversationId,
            selectedFile
          )
            .then(
              (
                attachment
              ) => {
                setMessages(
                  (current) => ({
                    ...current,

                    [conversation.conversationId]:
                      (
                        current[
                          conversation
                            .conversationId
                        ] || []
                      ).map(
                        (message) =>
                          message.id ===
                          messageId
                            ? {
                                ...message,
                                attachment,
                              }
                            : message
                      ),
                  })
                );
              }
            )
            .catch((uploadError) => {
              console.error(
                'Attachment upload failed:',
                uploadError
              );

              toast.error(
                `Message sent, but attachment failed: ${errorMessage(
                  uploadError,
                  'Upload failed.'
                )}`
              );
            });
        }

        void loadMessages(
          conversation.conversationId,
          true
        );

        void loadContacts();
      } catch (sendError) {
        setMessages(
          (current) => ({
            ...current,

            [conversation.conversationId]:
              (
                current[
                  conversation
                    .conversationId
                ] || []
              ).filter(
                (message) =>
                  message.id !==
                  optimisticId
              ),
          })
        );

        setText(body);
        setFile(selectedFile);
        setSending(false);

        toast.error(
          errorMessage(
            sendError,
            'Unable to send message.'
          )
        );
      }
    };

  /* ==========================================================
     ADD DEBTOR
  ========================================================== */

  const addDebtor =
    async (
      contact: Contact
    ) => {
      if (
        !me?.branch_id ||
        !contact.userId
      ) {
        toast.error(
          'This user cannot be added as a debtor.'
        );
        return;
      }

      /*
       * Always fetch fresh phone/profile data.
       */
      const {
        data: userRow,
        error: userError,
      } =
        await supabase
          .from('users')
          .select(
            `
            id,
            first_name,
            last_name,
            middle_name,
            phone_number,
            email,
            role,
            branch_id,
            profile_image_url
          `
          )
          .eq(
            'id',
            contact.userId
          )
          .maybeSingle();

      if (userError) {
        toast.error(
          errorMessage(
            userError,
            'Unable to fetch parent information.'
          )
        );
        return;
      }

      const phone =
        userRow?.phone_number ||
        contact.phone ||
        '';

      if (!phone) {
        toast.error(
          `${contact.name} has no phone number.`
        );
        return;
      }

      /*
       * Check existing debtor.
       */
      const {
        data: existing,
      } =
        await supabase
          .from('debtors')
          .select('id,status')
          .eq(
            'branch_id',
            me.branch_id
          )
          .eq(
            'user_id',
            contact.userId
          )
          .in(
            'status',
            ['active', 'paused']
          )
          .maybeSingle();

      if (existing) {
        toast(
          `${contact.name} is already in Debtors.`
        );
        return;
      }

      const {
        data,
        error,
      } =
        await supabase
          .from('debtors')
          .insert({
            branch_id:
              me.branch_id,

            user_id:
              contact.userId,

            student_id:
              contact.studentId ||
              null,

            parent_name:
              nameOf(
                userRow?.first_name,
                userRow?.last_name,
                userRow?.middle_name,
                userRow?.email
              ),

            student_name:
              contact.studentName ||
              null,

            phone_number:
              phone,

            email:
              userRow?.email ||
              contact.email ||
              null,

            outstanding_balance:
              0,

            status:
              'active',

            sms_enabled:
              debtorSettings.enabled,

            sms_frequency_hours:
              debtorSettings.frequencyHours,

            max_sms_per_day:
              debtorSettings.maxRemindersPerDay,

            sms_start_time:
              debtorSettings.startTime,

            sms_end_time:
              debtorSettings.endTime,

            sms_message:
              debtorSettings.message,

            created_by:
              uid,
          })
          .select()
          .single();

      if (error) {
        toast.error(
          errorMessage(
            error,
            'Unable to add debtor.'
          )
        );
        return;
      }

      setDebtors(
        (current) => [
          {
            id:
              data.id,

            userId:
              data.user_id,

            studentId:
              data.student_id ||
              undefined,

            name:
              data.parent_name ||
              contact.name,

            phone:
              data.phone_number ||
              phone,

            role:
              contact.role,

            profileImage:
              userRow?.profile_image_url ||
              contact.profileImage,

            studentName:
              data.student_name ||
              contact.studentName,

            className:
              contact.className,

            balance:
              Number(
                data.outstanding_balance ||
                0
              ),

            status:
              data.status,

            smsEnabled:
              Boolean(
                data.sms_enabled
              ),

            frequencyHours:
              Number(
                data.sms_frequency_hours ||
                debtorSettings.frequencyHours
              ),

            lastSmsSentAt:
              data.last_sms_sent_at ||
              undefined,

            nextSmsAt:
              data.next_sms_at ||
              undefined,

            totalSmsSent:
              Number(
                data.total_sms_sent ||
                0
              ),

            addedAt:
              data.created_at,
          },

          ...current,
        ]
      );

      toast.success(
        `${contact.name} added to Debtors.`
      );
    };

  /* ==========================================================
     REMOVE DEBTOR
  ========================================================== */

  const removeDebtor =
    async (
      debtor: Debtor
    ) => {
      const { error } =
        await supabase
          .from('debtors')
          .update({
            status:
              'removed',

            sms_enabled:
              false,

            removed_at:
              new Date().toISOString(),
          })
          .eq(
            'id',
            debtor.id
          );

      if (error) {
        toast.error(
          errorMessage(
            error,
            'Unable to remove debtor.'
          )
        );
        return;
      }

      setDebtors(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              debtor.id
          )
      );

      if (
        selectedDebtor?.id ===
        debtor.id
      ) {
        setSelectedDebtor(null);
      }

      toast.success(
        `${debtor.name} removed from Debtors.`
      );
    };

  /* ==========================================================
     PAUSE / RESUME DEBTOR
  ========================================================== */

  const toggleDebtor =
    async (
      debtor: Debtor
    ) => {
      const newStatus =
        debtor.status ===
        'paused'
          ? 'active'
          : 'paused';

      const { error } =
        await supabase
          .from('debtors')
          .update({
            status:
              newStatus,

            sms_enabled:
              newStatus ===
              'active',
          })
          .eq(
            'id',
            debtor.id
          );

      if (error) {
        toast.error(
          errorMessage(
            error,
            'Unable to update debtor.'
          )
        );
        return;
      }

      setDebtors(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              debtor.id
                ? {
                    ...item,
                    status:
                      newStatus,
                    smsEnabled:
                      newStatus ===
                      'active',
                  }
                : item
          )
      );

      toast.success(
        newStatus === 'active'
          ? 'Debtor reminders resumed.'
          : 'Debtor reminders paused.'
      );
    };

  /* ==========================================================
     DRAG AND DROP
  ========================================================== */

  const handleDragStart = (
    event: React.DragEvent,
    contact: Contact
  ) => {
    event.dataTransfer.effectAllowed =
      'copy';

    event.dataTransfer.setData(
      'application/x-eis-contact',
      JSON.stringify(contact)
    );
  };

  const handleDebtorDragOver = (
    event: React.DragEvent
  ) => {
    event.preventDefault();

    event.dataTransfer.dropEffect =
      'copy';

    setDragOverDebtors(true);
  };

  const handleDebtorDrop = (
    event: React.DragEvent
  ) => {
    event.preventDefault();

    setDragOverDebtors(false);

    const raw =
      event.dataTransfer.getData(
        'application/x-eis-contact'
      );

    if (!raw) return;

    try {
      const contact =
        JSON.parse(
          raw
        ) as Contact;

      void addDebtor(contact);
    } catch (e) {
      console.error(e);

      toast.error(
        'Unable to add this user as a debtor.'
      );
    }
  };

  /* ==========================================================
     SAVE SMS SETTINGS
  ========================================================== */

  const saveDebtorSettings =
    async () => {
      if (!me?.branch_id) {
        toast.error(
          'School branch not found.'
        );
        return;
      }

      setSavingDebtorSettings(
        true
      );

      try {
        const payload = {
          branch_id:
            me.branch_id,

          enabled:
            debtorSettings.enabled,

          provider:
            'termii',

          sender_id:
            debtorSettings.senderId ||
            null,

          frequency_hours:
            debtorSettings.frequencyHours,

          max_sms_per_day:
            debtorSettings.maxRemindersPerDay,

          start_time:
            debtorSettings.startTime,

          end_time:
            debtorSettings.endTime,

          message_template:
            debtorSettings.message,

          created_by:
            uid,
        };

        const {
          error,
        } =
          await supabase
            .from(
              'debtor_sms_settings'
            )
            .upsert(
              payload,
              {
                onConflict:
                  'branch_id',
              }
            );

        if (error) {
          throw error;
        }

        /*
         * Update existing debtors too.
         */
        const {
          error:
            debtorUpdateError,
        } =
          await supabase
            .from('debtors')
            .update({
              sms_enabled:
                debtorSettings.enabled,

              sms_frequency_hours:
                debtorSettings.frequencyHours,

              max_sms_per_day:
                debtorSettings.maxRemindersPerDay,

              sms_start_time:
                debtorSettings.startTime,

              sms_end_time:
                debtorSettings.endTime,

              sms_message:
                debtorSettings.message,
            })
            .eq(
              'branch_id',
              me.branch_id
            )
            .in(
              'status',
              ['active', 'paused']
            );

        if (debtorUpdateError) {
          console.warn(
            'Existing debtor settings update:',
            debtorUpdateError
          );
        }

        await loadDebtors();

        toast.success(
          'Debtor SMS settings saved.'
        );

        setDebtorSettingsOpen(
          false
        );
      } catch (e) {
        console.error(e);

        toast.error(
          errorMessage(
            e,
            'Unable to save SMS settings.'
          )
        );
      } finally {
        setSavingDebtorSettings(
          false
        );
      }
    };

  /* ==========================================================
     BROADCAST
  ========================================================== */

  const createBroadcast =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();

      if (
        !broadcastMessage.trim()
      ) {
        toast.error(
          'Enter a broadcast message.'
        );
        return;
      }

      setBroadcasting(true);

      try {
        /*
         * Keep this aligned with your existing
         * create_message_broadcast function.
         */
        const {
          data,
          error,
        } =
          await supabase.rpc(
            'create_message_broadcast',
            {
              p_title:
                broadcastTitle.trim() ||
                'School Broadcast',

              p_message:
                broadcastMessage.trim(),

              p_channel:
                channel,

              p_audience_type:
                audience,
            }
          );

        if (error) {
          throw error;
        }

        if (!rpcId(data)) {
          throw new Error(
            'Broadcast ID was not returned.'
          );
        }

        toast.success(
          'Broadcast campaign created.'
        );

        setBroadcastOpen(
          false
        );
      } catch (e) {
        console.error(e);

        toast.error(
          errorMessage(
            e,
            'Unable to create broadcast.'
          )
        );
      } finally {
        setBroadcasting(false);
      }
    };

  /* ==========================================================
     CONVERSATION MENU
  ========================================================== */

  const openConversationMenu = (
    event: React.MouseEvent,
    contact: Contact
  ) => {
    event.stopPropagation();

    const rect =
      (
        event.currentTarget as HTMLElement
      ).getBoundingClientRect();

    setMenu({
      conversationId:
        contact.conversationId,

      x:
        Math.min(
          rect.left,
          window.innerWidth -
            220
        ),

      y:
        Math.min(
          rect.bottom + 6,
          window.innerHeight -
            160
        ),
    });
  };

  const closeMenu = () => {
    setMenu({
      conversationId: null,
      x: 0,
      y: 0,
    });
  };

  useEffect(() => {
    const close = () =>
      closeMenu();

    window.addEventListener(
      'click',
      close
    );

    window.addEventListener(
      'scroll',
      close,
      true
    );

    return () => {
      window.removeEventListener(
        'click',
        close
      );

      window.removeEventListener(
        'scroll',
        close,
        true
      );
    };
  }, []);

  const archiveConversation =
    async (
      contact: Contact
    ) => {
      try {
        /*
         * The existing schema has is_archived
         * on conversation_participants.
         */
        const {
          error,
        } =
          await supabase
            .from(
              'conversation_participants'
            )
            .update({
              is_archived:
                true,
            })
            .eq(
              'conversation_id',
              contact.conversationId
            )
            .eq(
              'user_id',
              uid
            );

        if (error) {
          throw error;
        }

        setContacts(
          (current) =>
            current.filter(
              (item) =>
                item.conversationId !==
                contact.conversationId
            )
        );

        if (
          selected?.conversationId ===
          contact.conversationId
        ) {
          setSelected(null);
          setMobile(false);
        }

        closeMenu();

        toast.success(
          'Conversation archived.'
        );
      } catch (e) {
        toast.error(
          errorMessage(
            e,
            'Unable to archive conversation.'
          )
        );
      }
    };

  /* ==========================================================
     OPEN CONTACT
  ========================================================== */

  const openConversation =
    (contact: Contact) => {
      setSelected(contact);

      setMobile(true);

      closeMenu();

      void loadMessages(
        contact.conversationId
      );
    };

  /* ==========================================================
     REFRESH
  ========================================================== */

  const refresh =
    async () => {
      setLoading(true);

      try {
        await Promise.all([
          loadMe(),
          loadContacts(),
          loadDebtors(),
          loadDebtorSettings(),
        ]);

        if (selected) {
          await loadMessages(
            selected.conversationId,
            true
          );
        }
      } catch (e) {
        toast.error(
          errorMessage(
            e,
            'Unable to refresh messages.'
          )
        );
      } finally {
        setLoading(false);
      }
    };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 pb-10">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="rounded-3xl bg-gradient-to-r from-indigo-700 via-blue-700 to-cyan-700 p-5 sm:p-7 text-white shadow-xl">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold mb-2">
              <MessageCircle className="w-3.5 h-3.5" />
              Communication & Broadcast Hub
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold">
              Messages & Parent Engagement
            </h1>

            <p className="text-sm text-blue-100 mt-1">
              Real-time communication with parents,
              teachers and school staff.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">

            <button
              onClick={() =>
                void refresh()
              }
              disabled={loading}
              className="p-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/20"
              title="Refresh"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  loading
                    ? 'animate-spin'
                    : ''
                }`}
              />
            </button>

            <button
              onClick={() =>
                setDebtorSettingsOpen(
                  true
                )
              }
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/20 text-xs font-bold"
            >
              <Settings className="w-4 h-4" />
              Debtor Settings
            </button>

            <button
              onClick={() =>
                setBroadcastOpen(
                  true
                )
              }
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white text-blue-700 font-bold text-xs"
            >
              <Megaphone className="w-4 h-4" />
              Broadcast
            </button>

          </div>
        </div>
      </div>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden min-h-[720px] grid grid-cols-1 md:grid-cols-12">

        {/* ====================================================
            CONTACTS
        ==================================================== */}

        <aside
          className={`md:col-span-3 border-r border-gray-200 dark:border-gray-800 flex flex-col ${
            mobile
              ? 'hidden md:flex'
              : 'flex'
          }`}
        >

          <div className="p-4 border-b border-gray-200 dark:border-gray-800">

            <div className="flex items-center justify-between mb-3">

              <div>
                <h2 className="font-bold text-sm">
                  Conversations
                </h2>

                <p className="text-[11px] text-gray-500">
                  {contacts.length}{' '}
                  conversation
                  {contacts.length ===
                  1
                    ? ''
                    : 's'}
                </p>
              </div>

              <button
                onClick={() => {
                  setNewOpen(true);
                  setNewSearch('');
                }}
                className="p-2.5 rounded-xl bg-blue-600 text-white"
              >
                <Plus className="w-4 h-4" />
              </button>

            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs"
              />
            </div>

          </div>

          <div className="flex-1 overflow-y-auto">

            {loading ? (
              <div className="flex justify-center p-10">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : filteredContacts.length ===
              0 ? (
              <div className="p-8 text-center">

                <MessageSquare className="w-12 h-12 mx-auto text-blue-600 opacity-30" />

                <h3 className="mt-3 text-sm font-bold">
                  No conversations
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                  Start a conversation from
                  the user directory.
                </p>

                <button
                  onClick={() =>
                    setNewOpen(true)
                  }
                  className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                >
                  New Conversation
                </button>

              </div>
            ) : (
              filteredContacts.map(
                (contact) => (
                  <div
                    key={
                      contact.conversationId
                    }
                    draggable
                    onDragStart={(event) =>
                      handleDragStart(
                        event,
                        contact
                      )
                    }
                    className="relative"
                  >

                    <button
                      onClick={() =>
                        openConversation(
                          contact
                        )
                      }
                      className={`w-full text-left p-3.5 border-b border-gray-100 dark:border-gray-800 flex gap-3 ${
                        selected?.conversationId ===
                        contact.conversationId
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-l-4 border-l-blue-600'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >

                      <div className="relative flex-shrink-0">

                        {contact.profileImage ? (
                          <img
                            src={
                              contact.profileImage
                            }
                            alt={
                              contact.name
                            }
                            className="w-11 h-11 rounded-2xl object-cover"
                            onError={(
                              event
                            ) => {
                              event.currentTarget.style.display =
                                'none';
                            }}
                          />
                        ) : (
                          <div
                            className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${contact.avatar} text-white flex items-center justify-center font-bold text-sm`}
                          >
                            {initials(
                              contact.name
                            )}
                          </div>
                        )}

                        <span
                          className={`absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
                            contact.isOnline
                              ? 'bg-emerald-500'
                              : 'bg-gray-400'
                          }`}
                        />

                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex justify-between gap-2">

                          <h3 className="text-xs sm:text-sm font-bold truncate">
                            {contact.name}
                          </h3>

                          <span className="text-[10px] text-gray-400">
                            {timeOf(
                              contact.lastMessageAt
                            )}
                          </span>

                        </div>

                        <p className="text-[10px] text-blue-600 font-semibold truncate">
                          {contact.role}

                          {contact.studentName
                            ? ` • ${contact.studentName}`
                            : ''}

                          {contact.className
                            ? ` • ${contact.className}`
                            : ''}
                        </p>

                        <p className="text-xs text-gray-500 truncate mt-1">
                          {contact.lastMessage}
                        </p>

                        <p className="text-[9px] text-gray-400 mt-0.5">
                          {contact.isOnline
                            ? 'Online'
                            : lastSeenText(
                                contact.lastSeen
                              )}
                        </p>

                        {contact.unread >
                          0 && (
                          <span className="inline-flex mt-1 min-w-5 h-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold items-center justify-center">
                            {contact.unread >
                            99
                              ? '99+'
                              : contact.unread}
                          </span>
                        )}

                      </div>

                    </button>

                    <button
                      type="button"
                      onClick={(event) =>
                        openConversationMenu(
                          event,
                          contact
                        )
                      }
                      className="absolute right-2 top-2 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                      title="Conversation options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                  </div>
                )
              )
            )}

          </div>
        </aside>

        {/* ====================================================
            CHAT
        ==================================================== */}

        <section
          className={`md:col-span-6 flex flex-col ${
            mobile
              ? 'flex'
              : 'hidden md:flex'
          }`}
        >

          {!selected ? (
            <div className="flex-1 flex items-center justify-center p-8">

              <div className="text-center">

                <MessageSquare className="w-12 h-12 mx-auto text-blue-600 opacity-30" />

                <h2 className="mt-4 font-bold">
                  Select a conversation
                </h2>

                <p className="text-xs text-gray-500 mt-1">
                  Or start a new conversation
                  using the + button.
                </p>

              </div>

            </div>
          ) : (
            <>

              {/* CHAT HEADER */}

              <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/70 dark:bg-gray-800/40">

                <div className="flex items-center gap-3">

                  <button
                    onClick={() =>
                      setMobile(false)
                    }
                    className="md:hidden p-2 rounded-xl"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="relative">

                    {selected.profileImage ? (
                      <img
                        src={
                          selected.profileImage
                        }
                        alt={
                          selected.name
                        }
                        className="w-10 h-10 rounded-2xl object-cover"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${selected.avatar} text-white flex items-center justify-center font-bold`}
                      >
                        {initials(
                          selected.name
                        )}
                      </div>
                    )}

                    <span
                      className={`absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
                        selected.isOnline
                          ? 'bg-emerald-500'
                          : 'bg-gray-400'
                      }`}
                    />

                  </div>

                  <div>

                    <h2 className="text-sm font-bold">
                      {selected.name}
                    </h2>

                    <p className="text-[10px] text-gray-500">
                      {selected.isOnline
                        ? 'Online'
                        : lastSeenText(
                            selected.lastSeen
                          )}
                    </p>

                    <p className="text-[10px] text-blue-600">
                      {selected.role}

                      {selected.studentName
                        ? ` • ${selected.studentName}`
                        : ''}

                      {selected.className
                        ? ` • ${selected.className}`
                        : ''}
                    </p>

                  </div>

                </div>

                <div className="flex items-center gap-1">

                  {selected.phone && (
                    <a
                      href={`tel:${selected.phone}`}
                      className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                      title="Call"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}

                  <button
                    onClick={() =>
                      void addDebtor(
                        selected
                      )
                    }
                    title="Add to debtors"
                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(event) =>
                      openConversationMenu(
                        event,
                        selected
                      )
                    }
                    className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                    title="More"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                </div>

              </div>

              {/* MESSAGES */}

              <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30 dark:bg-gray-950/20">

                {loadingMessages ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : activeMessages.length ===
                  0 ? (
                  <div className="h-full flex items-center justify-center">

                    <div className="text-center">

                      <MessageCircle className="w-12 h-12 mx-auto text-blue-600 opacity-25" />

                      <p className="mt-3 text-sm font-semibold">
                        No messages yet
                      </p>

                      <p className="text-xs text-gray-500">
                        Send the first message.
                      </p>

                    </div>

                  </div>
                ) : (
                  <div className="space-y-3">

                    {activeMessages.map(
                      (message) => (
                        <div
                          key={
                            message.id
                          }
                          className={`flex ${
                            message.isMine
                              ? 'justify-end'
                              : 'justify-start'
                          }`}
                        >

                          <div
                            className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                              message.isMine
                                ? 'bg-blue-600 text-white rounded-br-md'
                                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-md'
                            } ${
                              message.optimistic
                                ? 'opacity-80'
                                : ''
                            }`}
                          >

                            {!message.isMine && (
                              <p className="text-[10px] font-bold text-blue-600 mb-1">
                                {
                                  message.senderName
                                }
                              </p>
                            )}

                            {message.body && (
                              <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                                {
                                  message.body
                                }
                              </p>
                            )}

                            {/* IMAGE */}

                            {message.attachment?.type ===
                              'image' &&
                              message.attachment.url && (
                                <div className="mt-2 overflow-hidden rounded-xl">

                                  <a
                                    href={
                                      message.attachment.url
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <img
                                      src={
                                        message.attachment.url
                                      }
                                      alt={
                                        message.attachment.name
                                      }
                                      className="max-h-80 max-w-full object-contain rounded-xl cursor-pointer"
                                    />
                                  </a>

                                  <p className="text-[9px] opacity-70 mt-1">
                                    {
                                      message.attachment.name
                                    }
                                  </p>

                                </div>
                            )}

                            {/* VIDEO */}

                            {message.attachment?.type ===
                              'video' &&
                              message.attachment.url && (
                                <div className="mt-2">

                                  <video
                                    src={
                                      message.attachment.url
                                    }
                                    controls
                                    preload="metadata"
                                    className="max-h-80 max-w-full rounded-xl"
                                  />

                                  <div className="flex items-center gap-2 mt-1">
                                    <Video className="w-3.5 h-3.5" />

                                    <span className="text-[9px] truncate">
                                      {
                                        message.attachment.name
                                      }
                                    </span>
                                  </div>

                                </div>
                            )}

                            {/* PDF */}

                            {message.attachment?.type ===
                              'pdf' && (
                                <div className="mt-2 rounded-xl border border-white/20 p-3">

                                  <div className="flex items-center gap-3">

                                    <div className="p-2 rounded-lg bg-red-500/15">
                                      <FileText className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold truncate">
                                        {
                                          message.attachment.name
                                        }
                                      </p>

                                      <p className="text-[9px] opacity-70">
                                        PDF • {
                                          message.attachment.size
                                        }
                                      </p>
                                    </div>

                                    {message.attachment.url && (
                                      <a
                                        href={
                                          message.attachment.url
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-2 rounded-lg hover:bg-white/10"
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                      </a>
                                    )}

                                  </div>

                                </div>
                            )}

                            {/* OTHER FILE */}

                            {message.attachment?.type ===
                              'file' && (
                                <div className="mt-2 rounded-xl border border-white/20 p-3">

                                  <div className="flex items-center gap-3">

                                    <div className="p-2 rounded-lg bg-white/10">
                                      <FileText className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1 min-w-0">

                                      <p className="text-xs font-bold truncate">
                                        {
                                          message.attachment.name
                                        }
                                      </p>

                                      <p className="text-[9px] opacity-70">
                                        {
                                          message.attachment.size
                                        }
                                      </p>

                                    </div>

                                    {message.attachment.url && (
                                      <a
                                        href={
                                          message.attachment.url
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-2 rounded-lg hover:bg-white/10"
                                      >
                                        <Download className="w-4 h-4" />
                                      </a>
                                    )}

                                  </div>

                                </div>
                            )}

                            <div className="mt-1 flex justify-end items-center gap-1 text-[9px] opacity-75">

                              <span>
                                {timeOf(
                                  message.sentAt
                                )}
                              </span>

                              {message.isMine &&
                                (message.status ===
                                'sending' ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : message.status ===
                                  'read' ? (
                                  <CheckCheck className="w-3 h-3" />
                                ) : message.status ===
                                  'delivered' ? (
                                  <CheckCheck className="w-3 h-3" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                ))}

                            </div>

                          </div>

                        </div>
                      )
                    )}

                    <div
                      ref={
                        endRef
                      }
                    />

                  </div>
                )}

              </div>

              {/* FILE PREVIEW */}

              {file && (
                <div className="px-3 pt-2">

                  <div className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">

                    {file.type.startsWith(
                      'image/'
                    ) ? (
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                    ) : file.type.startsWith(
                        'video/'
                      ) ? (
                      <Video className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Paperclip className="w-4 h-4 text-blue-600" />
                    )}

                    <div className="flex-1 min-w-0">

                      <p className="text-xs font-semibold truncate">
                        {file.name}
                      </p>

                      <p className="text-[10px] text-gray-500">
                        {formatBytes(
                          file.size
                        )}
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setFile(
                          null
                        );

                        if (
                          fileInputRef.current
                        ) {
                          fileInputRef.current.value =
                            '';
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                  </div>

                </div>
              )}

              {/* COMPOSER */}

              <form
                onSubmit={
                  sendMessage
                }
                className="p-3 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2"
              >

                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={
                    pickFile
                  }
                />

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Attach"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  value={text}
                  onChange={(event) =>
                    setText(
                      event.target.value
                    )
                  }
                  placeholder={`Message ${selected.name}...`}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button
                  type="submit"
                  disabled={
                    sending ||
                    (!text.trim() &&
                      !file)
                  }
                  className="p-2.5 rounded-xl bg-blue-600 text-white disabled:bg-gray-400"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>

              </form>

            </>
          )}

        </section>

        {/* ====================================================
            DEBTOR SIDEBAR
        ==================================================== */}

        <aside
          onDragOver={
            handleDebtorDragOver
          }
          onDragLeave={() =>
            setDragOverDebtors(
              false
            )
          }
          onDrop={
            handleDebtorDrop
          }
          className={`md:col-span-3 border-l border-gray-200 dark:border-gray-800 flex flex-col ${
            dragOverDebtors
              ? 'bg-amber-50 dark:bg-amber-950/30 ring-2 ring-inset ring-amber-400'
              : 'bg-gray-50/40 dark:bg-gray-950/20'
          }`}
        >

          <div className="p-4 border-b border-gray-200 dark:border-gray-800">

            <div className="flex items-center justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/50">
                    <Smartphone className="w-4 h-4 text-amber-600" />
                  </div>

                  <h2 className="font-bold text-sm">
                    Debtors
                  </h2>

                </div>

                <p className="text-[10px] text-gray-500 mt-1">
                  Drag a conversation here.
                </p>

              </div>

              <span className="min-w-7 h-7 px-2 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                {debtors.length}
              </span>

            </div>

            <div className="relative mt-3">

              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />

              <input
                value={
                  debtorSearch
                }
                onChange={(event) =>
                  setDebtorSearch(
                    event.target.value
                  )
                }
                placeholder="Search debtors..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
              />

            </div>

          </div>

          {/* SMS STATUS */}

          <div className="p-3">

            <button
              onClick={() =>
                setDebtorSettingsOpen(
                  true
                )
              }
              className="w-full text-left rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3"
            >

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-2">

                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      debtorSettings.enabled
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-gray-400'
                    }`}
                  />

                  <span className="text-xs font-bold">
                    Automatic SMS
                  </span>

                </div>

                <Settings className="w-3.5 h-3.5 text-gray-500" />

              </div>

              <p className="text-[10px] text-gray-500 mt-1">
                {debtorSettings.enabled
                  ? `Every ${debtorSettings.frequencyHours} hour${
                      debtorSettings.frequencyHours ===
                      1
                        ? ''
                        : 's'
                    } • max ${
                      debtorSettings.maxRemindersPerDay
                    }/day`
                  : 'Disabled'}
              </p>

            </button>

          </div>

          {/* DROP AREA */}

          {debtors.length ===
            0 && (
            <div
              className={`mx-3 mb-3 p-6 rounded-2xl border-2 border-dashed text-center ${
                dragOverDebtors
                  ? 'border-amber-500 bg-amber-100'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            >

              <Users className="w-8 h-8 mx-auto text-amber-500" />

              <p className="text-xs font-bold mt-2">
                Drop debtor here
              </p>

              <p className="text-[10px] text-gray-500 mt-1">
                Drag a conversation from
                the left.
              </p>

            </div>
          )}

          {/* DEBTOR LIST */}

          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">

            {filteredDebtors.map(
              (debtor) => (
                <button
                  type="button"
                  key={
                    debtor.id
                  }
                  onClick={() =>
                    setSelectedDebtor(
                      debtor
                    )
                  }
                  className="w-full text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3 shadow-sm hover:border-amber-400 transition"
                >

                  <div className="flex items-start gap-2">

                    {debtor.profileImage ? (
                      <img
                        src={
                          debtor.profileImage
                        }
                        alt={
                          debtor.name
                        }
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatar(
                          debtor.userId ||
                            debtor.id
                        )} text-white flex items-center justify-center font-bold text-xs`}
                      >
                        {initials(
                          debtor.name
                        )}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">

                      <div className="flex items-center justify-between">

                        <p className="text-xs font-bold truncate">
                          {debtor.name}
                        </p>

                        <span
                          className={`text-[8px] px-1.5 py-0.5 rounded-full ${
                            debtor.status ===
                            'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {debtor.status}
                        </span>

                      </div>

                      <p className="text-[10px] text-gray-500">
                        {debtor.phone}
                      </p>

                      {debtor.studentName && (
                        <p className="text-[10px] text-blue-600 truncate">
                          {debtor.studentName}
                        </p>
                      )}

                      <p className="text-sm font-bold text-red-600 mt-1">
                        {formatCurrency(
                          debtor.balance
                        )}
                      </p>

                      <div className="flex items-center gap-2 mt-1">

                        <span className="text-[9px] text-gray-400">
                          SMS{' '}
                          {debtor.smsEnabled
                            ? 'ON'
                            : 'OFF'}
                        </span>

                        {debtor.nextSmsAt && (
                          <span className="text-[9px] text-gray-400">
                            Next:{' '}
                            {timeOf(
                              debtor.nextSmsAt
                            )}
                          </span>
                        )}

                      </div>

                    </div>

                  </div>

                </button>
              )
            )}

          </div>

        </aside>

      </div>

      {/* ======================================================
          CONVERSATION MENU
      ====================================================== */}

      {menu.conversationId && (
        <div
          onClick={(event) =>
            event.stopPropagation()
          }
          style={{
            position:
              'fixed',
            left: menu.x,
            top: menu.y,
            zIndex: 100,
          }}
          className="w-52 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl p-1.5"
        >

          {(() => {
            const contact =
              contacts.find(
                (item) =>
                  item.conversationId ===
                  menu.conversationId
              );

            if (!contact) {
              return null;
            }

            return (
              <>
                <button
                  onClick={() => {
                    void addDebtor(
                      contact
                    );
                    closeMenu();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs hover:bg-amber-50 flex items-center gap-2"
                >
                  <UserMinus className="w-4 h-4 text-amber-600" />
                  Add to Debtors
                </button>

                <button
                  onClick={() => {
                    void archiveConversation(
                      contact
                    );
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4 text-gray-500" />
                  Archive Conversation
                </button>
              </>
            );
          })()}

        </div>
      )}

      {/* ======================================================
          NEW CONVERSATION MODAL
      ====================================================== */}

      {newOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="w-full max-w-lg max-h-[85vh] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">

            <div className="p-5 border-b flex justify-between">

              <div>
                <h2 className="font-bold">
                  New Conversation
                </h2>

                <p className="text-xs text-gray-500">
                  Search parents, teachers,
                  students and staff.
                </p>
              </div>

              <button
                onClick={() =>
                  setNewOpen(false)
                }
                className="p-2 rounded-xl hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            <div className="p-4">

              <div className="relative">

                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                <input
                  autoFocus
                  value={
                    newSearch
                  }
                  onChange={(event) =>
                    setNewSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search name, email, phone, role or student..."
                  className="w-full pl-9 pr-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border text-xs"
                />

              </div>

            </div>

            <div className="px-4 pb-4 overflow-y-auto max-h-[55vh]">

              {loadingUsers ? (
                <div className="py-10 text-center">
                  <Loader2 className="w-6 h-6 mx-auto animate-spin text-blue-600" />
                </div>
              ) : newUsers.length ===
                0 ? (
                <div className="py-10 text-center">

                  <Users className="w-9 h-9 mx-auto text-gray-300" />

                  <p className="text-sm font-semibold mt-2">
                    No users found
                  </p>

                </div>
              ) : (
                <div className="space-y-2">

                  {newUsers.map(
                    (newUser) => {
                      const name =
                        nameOf(
                          newUser.first_name,
                          newUser.last_name,
                          newUser.middle_name,
                          newUser.email
                        );

                      return (
                        <button
                          key={
                            newUser.id
                          }
                          onClick={() =>
                            void startConversation(
                              newUser
                            )
                          }
                          disabled={
                            creating
                          }
                          className="w-full flex items-center gap-3 p-3 rounded-2xl border hover:bg-blue-50 text-left"
                        >

                          {newUser.profile_image_url ? (
                            <img
                              src={
                                newUser.profile_image_url
                              }
                              alt={
                                name
                              }
                              className="w-11 h-11 rounded-2xl object-cover"
                            />
                          ) : (
                            <div
                              className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${avatar(
                                newUser.id
                              )} text-white flex items-center justify-center font-bold`}
                            >
                              {initials(
                                name
                              )}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">

                            <h3 className="text-sm font-bold truncate">
                              {name}
                            </h3>

                            <p className="text-[11px] text-blue-600">
                              {roleOf(
                                newUser.role
                              )}
                            </p>

                            {newUser.studentName && (
                              <p className="text-[10px] text-gray-500 truncate">
                                Student:{' '}
                                {
                                  newUser.studentName
                                }
                              </p>
                            )}

                            {newUser.phone_number && (
                              <p className="text-[10px] text-gray-400">
                                {
                                  newUser.phone_number
                                }
                              </p>
                            )}

                          </div>

                          {creating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}

                        </button>
                      );
                    }
                  )}

                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* ======================================================
          DEBTOR DETAILS
      ====================================================== */}

      {selectedDebtor && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">

            <div className="p-5 border-b flex items-center justify-between">

              <div>
                <h2 className="font-bold">
                  Debtor Details
                </h2>

                <p className="text-xs text-gray-500">
                  {selectedDebtor.name}
                </p>
              </div>

              <button
                onClick={() =>
                  setSelectedDebtor(
                    null
                  )
                }
                className="p-2 rounded-xl hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            <div className="p-5 space-y-4">

              <div className="flex items-center gap-3">

                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatar(
                    selectedDebtor.userId ||
                      selectedDebtor.id
                  )} text-white flex items-center justify-center font-bold`}
                >
                  {initials(
                    selectedDebtor.name
                  )}
                </div>

                <div>
                  <h3 className="font-bold">
                    {
                      selectedDebtor.name
                    }
                  </h3>

                  <p className="text-xs text-gray-500">
                    {
                      selectedDebtor.phone
                    }
                  </p>

                  {selectedDebtor.studentName && (
                    <p className="text-xs text-blue-600">
                      {
                        selectedDebtor.studentName
                      }
                    </p>
                  )}
                </div>

              </div>

              <div className="rounded-2xl bg-red-50 border border-red-100 p-4">

                <p className="text-[10px] text-red-500">
                  Outstanding Balance
                </p>

                <p className="text-2xl font-black text-red-600">
                  {formatCurrency(
                    selectedDebtor.balance
                  )}
                </p>

              </div>

              <div className="grid grid-cols-2 gap-3">

                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                  <p className="text-[9px] text-gray-500">
                    SMS
                  </p>

                  <p className="text-xs font-bold">
                    {selectedDebtor.smsEnabled
                      ? 'Enabled'
                      : 'Disabled'}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                  <p className="text-[9px] text-gray-500">
                    Frequency
                  </p>

                  <p className="text-xs font-bold">
                    Every{' '}
                    {
                      selectedDebtor.frequencyHours
                    }h
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                  <p className="text-[9px] text-gray-500">
                    SMS Sent
                  </p>

                  <p className="text-xs font-bold">
                    {
                      selectedDebtor.totalSmsSent
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                  <p className="text-[9px] text-gray-500">
                    Status
                  </p>

                  <p className="text-xs font-bold capitalize">
                    {
                      selectedDebtor.status
                    }
                  </p>
                </div>

              </div>

              <div className="flex gap-2">

                <button
                  onClick={() =>
                    void toggleDebtor(
                      selectedDebtor
                    )
                  }
                  className="flex-1 px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2"
                >
                  {selectedDebtor.status ===
                  'paused' ? (
                    <>
                      <Play className="w-4 h-4" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4" />
                      Pause
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    void removeDebtor(
                      selectedDebtor
                    );
                  }}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* ======================================================
          SMS SETTINGS
      ====================================================== */}

      {debtorSettingsOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">

            <div className="p-5 border-b flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="p-2.5 rounded-xl bg-amber-100">
                  <Smartphone className="w-5 h-5 text-amber-600" />
                </div>

                <div>
                  <h2 className="font-bold">
                    Debtor SMS Settings
                  </h2>

                  <p className="text-xs text-gray-500">
                    Configure automatic fee reminders.
                  </p>
                </div>

              </div>

              <button
                onClick={() =>
                  setDebtorSettingsOpen(
                    false
                  )
                }
                className="p-2 rounded-xl hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            <div className="p-5 space-y-5">

              {/* ENABLE */}

              <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800">

                <div>

                  <p className="text-sm font-bold">
                    Automatic SMS reminders
                  </p>

                  <p className="text-[10px] text-gray-500 mt-1">
                    The secure Supabase scheduler
                    will communicate with Termii.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setDebtorSettings(
                      (current) => ({
                        ...current,
                        enabled:
                          !current.enabled,
                      })
                    )
                  }
                  className={`relative w-12 h-6 rounded-full ${
                    debtorSettings.enabled
                      ? 'bg-emerald-500'
                      : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow ${
                      debtorSettings.enabled
                        ? 'left-7'
                        : 'left-1'
                    }`}
                  />
                </button>

              </div>

              {/* FREQUENCY */}

              <div>

                <label className="block text-xs font-bold mb-2">
                  SMS Frequency
                </label>

                <div className="grid grid-cols-3 gap-2">

                  {[1, 2, 3, 6, 12, 24].map(
                    (hours) => (
                      <button
                        key={hours}
                        type="button"
                        onClick={() =>
                          setDebtorSettings(
                            (current) => ({
                              ...current,
                              frequencyHours:
                                hours,
                            })
                          )
                        }
                        className={`p-3 rounded-xl border text-xs font-bold ${
                          debtorSettings.frequencyHours ===
                          hours
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : ''
                        }`}
                      >
                        Every {hours}h
                      </button>
                    )
                  )}

                </div>

              </div>

              {/* TIME WINDOW */}

              <div className="grid grid-cols-2 gap-3">

                <div>
                  <label className="block text-xs font-bold mb-2">
                    Start Time
                  </label>

                  <input
                    type="time"
                    value={
                      debtorSettings.startTime
                    }
                    onChange={(event) =>
                      setDebtorSettings(
                        (current) => ({
                          ...current,
                          startTime:
                            event.target
                              .value,
                        })
                      )
                    }
                    className="w-full px-3 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-2">
                    End Time
                  </label>

                  <input
                    type="time"
                    value={
                      debtorSettings.endTime
                    }
                    onChange={(event) =>
                      setDebtorSettings(
                        (current) => ({
                          ...current,
                          endTime:
                            event.target
                              .value,
                        })
                      )
                    }
                    className="w-full px-3 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800 text-xs"
                  />
                </div>

              </div>

              {/* DAILY LIMIT */}

              <div>

                <label className="block text-xs font-bold mb-2">
                  Maximum SMS per day
                </label>

                <select
                  value={
                    debtorSettings.maxRemindersPerDay
                  }
                  onChange={(event) =>
                    setDebtorSettings(
                      (current) => ({
                        ...current,
                        maxRemindersPerDay:
                          Number(
                            event.target
                              .value
                          ),
                      })
                    )
                  }
                  className="w-full px-3 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800 text-xs"
                >
                  {[1, 2, 3, 4, 6, 8, 12].map(
                    (number) => (
                      <option
                        key={
                          number
                        }
                        value={
                          number
                        }
                      >
                        {number} SMS per day
                      </option>
                    )
                  )}
                </select>

              </div>

              {/* SENDER ID */}

              <div>

                <label className="block text-xs font-bold mb-2">
                  Termii Sender ID
                </label>

                <input
                  value={
                    debtorSettings.senderId
                  }
                  onChange={(event) =>
                    setDebtorSettings(
                      (current) => ({
                        ...current,
                        senderId:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="Your approved sender ID"
                  className="w-full px-3 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800 text-xs"
                />

              </div>

              {/* MESSAGE */}

              <div>

                <label className="block text-xs font-bold mb-2">
                  Reminder Message
                </label>

                <textarea
                  value={
                    debtorSettings.message
                  }
                  onChange={(event) =>
                    setDebtorSettings(
                      (current) => ({
                        ...current,
                        message:
                          event.target
                            .value,
                      })
                    )
                  }
                  rows={5}
                  className="w-full rounded-xl border bg-gray-50 dark:bg-gray-800 px-3 py-3 text-xs resize-none"
                />

                <p className="text-[10px] text-gray-400 mt-1">
                  Available placeholders:
                  {' '}
                  {'{parent_name}'},
                  {' {student_name}'},
                  {' {balance}'}.
                </p>

              </div>

              {/* STOP WHEN PAID */}

              <div className="flex items-center justify-between p-3 rounded-xl border">

                <div>

                  <p className="text-xs font-bold">
                    Stop when paid
                  </p>

                  <p className="text-[10px] text-gray-500">
                    Stop automatic reminders after
                    the outstanding balance is cleared.
                  </p>

                </div>

                <input
                  type="checkbox"
                  checked={
                    debtorSettings.stopWhenPaid
                  }
                  onChange={(event) =>
                    setDebtorSettings(
                      (current) => ({
                        ...current,
                        stopWhenPaid:
                          event.target
                            .checked,
                      })
                    )
                  }
                  className="w-4 h-4 accent-amber-500"
                />

              </div>

              {/* SECURITY */}

              <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 flex gap-3">

                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />

                <div>

                  <p className="text-xs font-bold text-blue-800">
                    SMS security
                  </p>

                  <p className="text-[10px] text-blue-700 mt-1 leading-relaxed">
                    The Termii API secret must remain
                    inside a Supabase Edge Function.
                    It is never stored in this React
                    component or exposed to the browser.
                  </p>

                </div>

              </div>

            </div>

            <div className="p-5 border-t flex justify-end gap-2">

              <button
                onClick={() =>
                  setDebtorSettingsOpen(
                    false
                  )
                }
                className="px-4 py-2.5 rounded-xl border text-xs font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={() =>
                  void saveDebtorSettings()
                }
                disabled={
                  savingDebtorSettings
                }
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-bold flex items-center gap-2"
              >
                {savingDebtorSettings ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}

                Save Settings
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ======================================================
          BROADCAST MODAL
      ====================================================== */}

      {broadcastOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl">

            <div className="p-5 border-b flex justify-between">

              <div>
                <h2 className="font-bold">
                  Broadcast
                </h2>

                <p className="text-xs text-gray-500">
                  Create a school communication campaign.
                </p>
              </div>

              <button
                onClick={() =>
                  setBroadcastOpen(
                    false
                  )
                }
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            <form
              onSubmit={
                createBroadcast
              }
              className="p-5 space-y-4"
            >

              <input
                value={
                  broadcastTitle
                }
                onChange={(event) =>
                  setBroadcastTitle(
                    event.target
                      .value
                  )
                }
                placeholder="Broadcast title"
                className="w-full px-3 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800 text-xs"
              />

              <select
                value={
                  audience
                }
                onChange={(event) =>
                  setAudience(
                    event.target
                      .value as Audience
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800 text-xs"
              >
                <option value="parents">
                  Parents
                </option>

                <option value="teachers">
                  Teachers
                </option>

                <option value="all">
                  Everyone
                </option>
              </select>

              <div className="grid grid-cols-3 gap-2">

                {[
                  ['in_app', 'Portal'],
                  ['sms', 'SMS'],
                  ['whatsapp', 'WhatsApp'],
                ].map(
                  ([value, label]) => (
                    <button
                      type="button"
                      key={
                        value
                      }
                      onClick={() =>
                        setChannel(
                          value as Channel
                        )
                      }
                      className={`p-2.5 rounded-xl border text-xs font-bold ${
                        channel ===
                        value
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : ''
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}

              </div>

              <textarea
                value={
                  broadcastMessage
                }
                onChange={(event) =>
                  setBroadcastMessage(
                    event.target
                      .value
                  )
                }
                rows={6}
                placeholder="Write your broadcast..."
                className="w-full px-3 py-3 rounded-xl border bg-gray-50 dark:bg-gray-800 text-xs"
              />

              <div className="rounded-xl bg-blue-50 p-3 flex gap-2">

                <AlertCircle className="w-4 h-4 text-blue-600" />

                <p className="text-[10px] text-blue-700">
                  Provider credentials are handled
                  server-side.
                </p>

              </div>

              <div className="flex justify-end gap-2">

                <button
                  type="button"
                  onClick={() =>
                    setBroadcastOpen(
                      false
                    )
                  }
                  className="px-4 py-2.5 rounded-xl border text-xs"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    broadcasting ||
                    !broadcastMessage.trim()
                  }
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex gap-2 items-center"
                >
                  {broadcasting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}

                  Create Broadcast
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
};

export default MessagesPage;