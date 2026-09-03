import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../config/supabase/client';
import {
  MessageCircle,
  Send,
  Search,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Video,
  Download,
  X,
  Check,
  CheckCheck,
  Loader2,
  ArrowLeft,
  RefreshCw,
  MoreVertical,
  User,
  Clock,
  AlertCircle,
} from 'lucide-react';

type Conversation = {
  id: string;
  branch_id: string;
  conversation_type: string;
  title: string | null;
  description: string | null;
  student_id: string | null;
  created_by: string | null;
  last_message_id: string | null;
  last_message_at: string | null;
  is_archived: boolean;
  is_muted: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  branch_id: string;
  sender_id: string | null;
  student_id: string | null;
  parent_id: string | null;
  body: string | null;
  message_type: string;
  status: string;
  reply_to_message_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
};

type Attachment = {
  id: string;
  message_id: string;
  branch_id: string;
  file_name: string;
  storage_bucket: string;
  storage_path: string;
  file_url: string | null;
  mime_type: string | null;
  file_size: number | null;
  checksum?: string | null;
  thumbnail_path?: string | null;
  uploaded_by?: string | null;
  created_at: string;
};

type UserProfile = {
  id: string;
  user_id?: string;
  email?: string;
  phone_number?: string | null;
  first_name?: string;
  last_name?: string;
  middle_name?: string | null;
  role?: string;
  branch_id?: string | null;
  profile_image_url?: string | null;
  is_active?: boolean;
};

type ConversationRow = {
  conversation_id: string;
  title?: string | null;
  conversation_type?: string;
  student_id?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
  participant_name?: string | null;
  participant_image?: string | null;
};

const ATTACHMENT_BUCKET =
  import.meta.env.VITE_MESSAGES_BUCKET || 'message-attachments';

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const formatTime = (value?: string | null) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatConversationDate = (value?: string | null) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return formatTime(value);
  }

  return date.toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
  });
};

const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return '';

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getInitials = (profile?: UserProfile | null) => {
  if (!profile) return 'AD';

  const first = profile.first_name?.[0] || '';
  const last = profile.last_name?.[0] || '';

  return `${first}${last}`.toUpperCase() || 'AD';
};

const getFileIcon = (mime?: string | null) => {
  if (!mime) return <FileText size={20} />;

  if (mime.startsWith('image/')) {
    return <ImageIcon size={20} />;
  }

  if (mime.startsWith('video/')) {
    return <Video size={20} />;
  }

  return <FileText size={20} />;
};

const isImage = (mime?: string | null) =>
  !!mime && mime.startsWith('image/');

const isVideo = (mime?: string | null) =>
  !!mime && mime.startsWith('video/');

const getStorageUrl = (
  attachment: Attachment
): string | null => {
  if (attachment.file_url) {
    return attachment.file_url;
  }

  if (!attachment.storage_bucket || !attachment.storage_path) {
    return null;
  }

  const { data } = supabase.storage
    .from(attachment.storage_bucket)
    .getPublicUrl(attachment.storage_path);

  return data?.publicUrl || null;
};

export default function UsersMessagePage() {
  const [user, setUser] = useState<UserProfile | null>(null);

  const [conversations, setConversations] = useState<
    ConversationRow[]
  >([]);

  const [selectedConversationId, setSelectedConversationId] =
    useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<
    Record<string, Attachment[]>
  >({});

  const [conversationProfiles, setConversationProfiles] =
    useState<Record<string, UserProfile>>({});

  const [search, setSearch] = useState('');
  const [messageText, setMessageText] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [mobileConversationOpen, setMobileConversationOpen] =
    useState(false);

  const [previewAttachment, setPreviewAttachment] =
    useState<Attachment | null>(null);

  const [showConversationMenu, setShowConversationMenu] =
    useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        item => item.conversation_id === selectedConversationId
      ),
    [conversations, selectedConversationId]
  );

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return conversations;

    return conversations.filter(item => {
      const name = item.participant_name || '';
      const title = item.title || '';

      return (
        name.toLowerCase().includes(term) ||
        title.toLowerCase().includes(term)
      );
    });
  }, [conversations, search]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
      });
    });
  }, []);

  const loadCurrentUser = useCallback(async () => {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;

    if (!authUser) {
      throw new Error('You are not logged in.');
    }

    const { data, error: profileError } = await supabase
      .from('users')
      .select(
        'id,user_id,email,phone_number,first_name,last_name,middle_name,role,branch_id,profile_image_url,is_active'
      )
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (data) {
      setUser(data as UserProfile);
      return data as UserProfile;
    }

    const fallback: UserProfile = {
      id: authUser.id,
      email: authUser.email || '',
    };

    setUser(fallback);

    return fallback;
  }, []);

  const loadConversations = useCallback(
    async (currentUser?: UserProfile | null) => {
      try {
        const me = currentUser || user;

        if (!me) return;

        const { data, error: rpcError } = await supabase.rpc(
          'get_my_conversations'
        );

        if (!rpcError && Array.isArray(data)) {
          const rows = data as ConversationRow[];

          const sorted = [...rows].sort(
            (a, b) =>
              new Date(b.last_message_at || 0).getTime() -
              new Date(a.last_message_at || 0).getTime()
          );

          setConversations(sorted);

          const profileIds = sorted
            .map(row => row.participant_name)
            .filter(Boolean);

          void profileIds;

          return;
        }

        /*
         * Fallback query.

         * This protects the page if the RPC is unavailable.
         */
        const { data: participantRows, error: participantError } =
          await supabase
            .from('conversation_participants')
            .select(
              `
                conversation_id,
                user_id,
                is_active,
                is_archived,
                conversations (
                  id,
                  title,
                  conversation_type,
                  student_id,
                  last_message_at,
                  is_archived
                )
              `
            )
            .eq('user_id', me.id)
            .eq('is_active', true)
            .eq('is_archived', false);

        if (participantError) {
          throw rpcError || participantError;
        }

        const rows = participantRows || [];

        const result: ConversationRow[] = [];

        for (const row of rows as any[]) {
          const conversation = row.conversations;

          if (!conversation) continue;

          result.push({
            conversation_id: conversation.id,
            title: conversation.title,
            conversation_type: conversation.conversation_type,
            student_id: conversation.student_id,
            last_message_at: conversation.last_message_at,
            unread_count: 0,
          });
        }

        setConversations(result);
      } catch (err: any) {
        console.error('loadConversations:', err);
        throw err;
      }
    },
    [user]
  );

  const loadConversationProfile = useCallback(
    async (conversationId: string) => {
      try {
        const { data: participants, error } = await supabase
          .from('conversation_participants')
          .select('user_id,student_id,participant_type')
          .eq('conversation_id', conversationId)
          .eq('is_active', true);

        if (error) {
          console.warn(
            'Could not load participants:',
            error.message
          );
          return;
        }

        const otherUserIds = (participants || [])
          .map(item => item.user_id)
          .filter(Boolean)
          .filter(id => id !== user?.id);

        if (otherUserIds.length === 0) return;

        const { data: profiles } = await supabase
          .from('users')
          .select(
            'id,user_id,email,phone_number,first_name,last_name,middle_name,role,branch_id,profile_image_url,is_active'
          )
          .in('id', otherUserIds);

        if (profiles && profiles.length > 0) {
          const profile = profiles[0] as UserProfile;

          setConversationProfiles(prev => ({
            ...prev,
            [conversationId]: profile,
          }));
        }
      } catch (err) {
        console.warn('loadConversationProfile:', err);
      }
    },
    [user?.id]
  );

  const loadMessages = useCallback(
    async (conversationId: string) => {
      setLoadingMessages(true);
      setError(null);

      try {
        let loadedMessages: Message[] = [];

        const { data: rpcData, error: rpcError } =
          await supabase.rpc('get_conversation_messages', {
            p_conversation_id: conversationId,
          });

        if (!rpcError && Array.isArray(rpcData)) {
          loadedMessages = rpcData as Message[];
        } else {
          const { data, error: queryError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .is('deleted_at', null)
            .order('created_at', { ascending: true });

          if (queryError) throw queryError;

          loadedMessages = (data || []) as Message[];
        }

        setMessages(loadedMessages);

        if (loadedMessages.length > 0) {
          const messageIds = loadedMessages.map(item => item.id);

          const { data: attachmentRows, error: attachmentError } =
            await supabase
              .from('message_attachments')
              .select('*')
              .in('message_id', messageIds);

          if (!attachmentError && attachmentRows) {
            const grouped: Record<string, Attachment[]> = {};

            for (const attachment of attachmentRows as Attachment[]) {
              if (!grouped[attachment.message_id]) {
                grouped[attachment.message_id] = [];
              }

              grouped[attachment.message_id].push(attachment);
            }

            setAttachments(grouped);
          }
        } else {
          setAttachments({});
        }

        await markConversationRead(conversationId);

        scrollToBottom();
      } catch (err: any) {
        console.error('loadMessages:', err);
        setError(
          err?.message || 'Unable to load this conversation.'
        );
      } finally {
        setLoadingMessages(false);
      }
    },
    [scrollToBottom]
  );

  const markConversationRead = useCallback(
    async (conversationId: string) => {
      try {
        const { error } = await supabase.rpc(
          'mark_conversation_read',
          {
            p_conversation_id: conversationId,
          }
        );

        if (error) {
          console.warn(
            'mark_conversation_read:',
            error.message
          );
        }

        setConversations(prev =>
          prev.map(item =>
            item.conversation_id === conversationId
              ? {
                  ...item,
                  unread_count: 0,
                }
              : item
          )
        );
      } catch (err) {
        console.warn('markConversationRead:', err);
      }
    },
    []
  );

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      setLoading(true);
      setError(null);

      try {
        const currentUser = await loadCurrentUser();

        if (!mounted) return;

        await loadConversations(currentUser);
      } catch (err: any) {
        console.error('Messages initialization:', err);

        if (mounted) {
          setError(
            err?.message ||
              'Unable to load your messages. Please try again.'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void initialize();

    return () => {
      mounted = false;
    };
  }, [loadCurrentUser, loadConversations]);

  useEffect(() => {
    if (!selectedConversationId) return;

    void loadMessages(selectedConversationId);
    void loadConversationProfile(selectedConversationId);
  }, [
    selectedConversationId,
    loadMessages,
    loadConversationProfile,
  ]);

  useEffect(() => {
    if (!selectedConversationId) return;

    const channel = supabase
      .channel(`user-messages-${selectedConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        async payload => {
          const incoming = payload.new as Message;

          setMessages(prev => {
            if (prev.some(item => item.id === incoming.id)) {
              return prev;
            }

            return [...prev, incoming];
          });

          scrollToBottom();

          if (
            incoming.sender_id &&
            incoming.sender_id !== user?.id
          ) {
            await markConversationRead(
              selectedConversationId
            );
          }

          void loadConversations(user);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_attachments',
        },
        payload => {
          const attachment = payload.new as Attachment;

          if (
            !attachment.message_id ||
            !messages.some(
              message => message.id === attachment.message_id
            )
          ) {
            return;
          }

          setAttachments(prev => ({
            ...prev,
            [attachment.message_id]: [
              ...(prev[attachment.message_id] || []),
              attachment,
            ],
          }));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    selectedConversationId,
    user,
    markConversationRead,
    loadConversations,
    scrollToBottom,
    messages,
  ]);

  useEffect(() => {
    const channel = supabase
      .channel('user-conversation-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          void loadConversations(user);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
        },
        () => {
          void loadConversations(user);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, loadConversations]);

  const openConversation = (id: string) => {
    setSelectedConversationId(id);
    setMobileConversationOpen(true);
    setShowConversationMenu(false);
  };

  const sendMessage = async () => {
    const text = messageText.trim();

    if (!text || !selectedConversationId || !user || sending) {
      return;
    }

    setSending(true);
    setError(null);

    const optimisticId = `temp-${Date.now()}`;

    const optimisticMessage: Message = {
      id: optimisticId,
      conversation_id: selectedConversationId,
      branch_id: user.branch_id || '',
      sender_id: user.id,
      student_id: null,
      parent_id: null,
      body: text,
      message_type: 'text',
      status: 'sent',
      reply_to_message_id: null,
      edited_at: null,
      deleted_at: null,
      deleted_by: null,
      sent_at: new Date().toISOString(),
      delivered_at: null,
      read_at: null,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setMessageText('');
    scrollToBottom();

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'send_message',
        {
          p_conversation_id: selectedConversationId,
          p_body: text,
          p_message_type: 'text',
        }
      );

      if (rpcError) {
        /*
         * Fallback direct insert.
         */
        const { data: inserted, error: insertError } =
          await supabase
            .from('messages')
            .insert({
              conversation_id: selectedConversationId,
              branch_id: user.branch_id,
              sender_id: user.id,
              body: text,
              message_type: 'text',
              status: 'sent',
              sent_at: new Date().toISOString(),
              metadata: {},
            })
            .select('*')
            .single();

        if (insertError) throw insertError;

        setMessages(prev =>
          prev.map(item =>
            item.id === optimisticId
              ? (inserted as Message)
              : item
          )
        );
      } else if (data) {
        const returned =
          Array.isArray(data) ? data[0] : data;

        if (returned?.id) {
          setMessages(prev =>
            prev.map(item =>
              item.id === optimisticId
                ? {
                    ...item,
                    ...(returned as Message),
                  }
                : item
            )
          );
        }
      }

      void loadConversations(user);
    } catch (err: any) {
      console.error('sendMessage:', err);

      setMessages(prev =>
        prev.filter(item => item.id !== optimisticId)
      );

      setMessageText(text);

      setError(
        err?.message ||
          'Message could not be sent. Please try again.'
      );
    } finally {
      setSending(false);
    }
  };

  const uploadAttachment = async (file: File) => {
    if (!selectedConversationId || !user) return;

    if (file.size > MAX_FILE_SIZE) {
      setError(
        `File is too large. Maximum allowed size is ${formatFileSize(
          MAX_FILE_SIZE
        )}.`
      );
      return;
    }

    setUploading(true);
    setError(null);

    try {
      /*
       * Send a message first. This guarantees that the attachment
       * always belongs to a valid message.
       */
      const { data: messageData, error: messageError } =
        await supabase.rpc('send_message', {
          p_conversation_id: selectedConversationId,
          p_body: '',
          p_message_type: 'file',
        });

      let messageId: string | null = null;

      if (!messageError && messageData) {
        const returned = Array.isArray(messageData)
          ? messageData[0]
          : messageData;

        messageId = returned?.id || null;
      }

      if (!messageId) {
        const { data: inserted, error: insertError } =
          await supabase
            .from('messages')
            .insert({
              conversation_id: selectedConversationId,
              branch_id: user.branch_id,
              sender_id: user.id,
              body: '',
              message_type: 'file',
              status: 'sent',
              sent_at: new Date().toISOString(),
              metadata: {},
            })
            .select('*')
            .single();

        if (insertError) throw insertError;

        messageId = inserted.id;

        setMessages(prev => [
          ...prev,
          inserted as Message,
        ]);
      } else {
        const newMessage: Message = {
          id: messageId,
          conversation_id: selectedConversationId,
          branch_id: user.branch_id || '',
          sender_id: user.id,
          student_id: null,
          parent_id: null,
          body: '',
          message_type: 'file',
          status: 'sent',
          reply_to_message_id: null,
          edited_at: null,
          deleted_at: null,
          deleted_by: null,
          sent_at: new Date().toISOString(),
          delivered_at: null,
          read_at: null,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setMessages(prev => [
          ...prev.filter(item => item.id !== messageId),
          newMessage,
        ]);
      }

      const safeName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_');

      const path =
        `${user.branch_id || 'default'}/` +
        `${selectedConversationId}/` +
        `${messageId}/` +
        `${Date.now()}-${safeName}`;

      /*
       * Try the configured bucket first.
       *
       * If the bucket does not exist, create a signed/private-safe
       * attachment record using the existing storage bucket
       * configuration rather than generating a broken URL.
       */
      const { error: uploadError } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream',
        });

      if (uploadError) {
        throw new Error(
          `Attachment upload failed: ${uploadError.message}`
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from(ATTACHMENT_BUCKET)
        .getPublicUrl(path);

      const fileUrl =
        publicUrlData?.publicUrl || null;

      /*
       * Use the existing RPC. This is the corrected parameter order
       * for your current create_message_attachment function.
       */
      const { data: attachmentId, error: attachmentError } =
        await supabase.rpc('create_message_attachment', {
          p_message_id: messageId,
          p_file_name: file.name,
          p_storage_bucket: ATTACHMENT_BUCKET,
          p_storage_path: path,
          p_file_url: fileUrl || '',
          p_file_size: file.size,
          p_mime_type: file.type || '',
        });

      if (attachmentError) {
        /*
         * If the RPC is unavailable, use the table directly.
         */
        const { data: directAttachment, error: directError } =
          await supabase
            .from('message_attachments')
            .insert({
              message_id: messageId,
              branch_id: user.branch_id,
              file_name: file.name,
              storage_bucket: ATTACHMENT_BUCKET,
              storage_path: path,
              file_url: fileUrl,
              mime_type: file.type || null,
              file_size: file.size,
              uploaded_by: user.id,
            })
            .select('*')
            .single();

        if (directError) throw directError;

        if (directAttachment) {
          setAttachments(prev => ({
            ...prev,
            [messageId as string]: [
              ...(prev[messageId as string] || []),
              directAttachment as Attachment,
            ],
          }));
        }
      } else {
        const attachment: Attachment = {
          id:
            attachmentId ||
            `${messageId}-${Date.now()}`,
          message_id: messageId,
          branch_id: user.branch_id || '',
          file_name: file.name,
          storage_bucket: ATTACHMENT_BUCKET,
          storage_path: path,
          file_url: fileUrl,
          mime_type: file.type || null,
          file_size: file.size,
          uploaded_by: user.id,
          created_at: new Date().toISOString(),
        };

        setAttachments(prev => ({
          ...prev,
          [messageId as string]: [
            ...(prev[messageId as string] || []),
            attachment,
          ],
        }));
      }

      scrollToBottom();
      void loadConversations(user);
    } catch (err: any) {
      console.error('uploadAttachment:', err);

      setError(
        err?.message ||
          'Attachment upload failed. Please try again.'
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      void uploadAttachment(file);
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const getConversationProfile = () => {
    if (!selectedConversationId) return null;

    return conversationProfiles[selectedConversationId] || null;
  };

  const getConversationDisplayName = (
    conversation: ConversationRow
  ) => {
    if (conversation.participant_name) {
      return conversation.participant_name;
    }

    if (conversation.title) {
      return conversation.title;
    }

    return 'School Administration';
  };

  const getConversationInitials = (
    conversation: ConversationRow
  ) => {
    const profile =
      conversationProfiles[conversation.conversation_id];

    if (profile) {
      return getInitials(profile);
    }

    const name = getConversationDisplayName(conversation);

    return name
      .split(' ')
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const renderAttachment = (attachment: Attachment) => {
    const url = getStorageUrl(attachment);

    if (!url) {
      return (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
          <AlertCircle size={20} />
          <div className="min-w-0">
            <div className="font-medium">
              {attachment.file_name}
            </div>
            <div className="text-xs">
              Attachment URL unavailable
            </div>
          </div>
        </div>
      );
    }

    if (isImage(attachment.mime_type)) {
      return (
        <button
          type="button"
          onClick={() =>
            setPreviewAttachment(attachment)
          }
          className="block max-w-[280px] overflow-hidden rounded-xl border bg-black/5"
        >
          <img
            src={url}
            alt={attachment.file_name}
            className="max-h-64 w-auto max-w-full object-contain"
            loading="lazy"
          />
        </button>
      );
    }

    if (isVideo(attachment.mime_type)) {
      return (
        <div className="max-w-[320px] overflow-hidden rounded-xl bg-black">
          <video
            controls
            preload="metadata"
            className="max-h-72 w-full"
            src={url}
          />
        </div>
      );
    }

    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex max-w-[320px] items-center gap-3 rounded-xl border bg-white/90 p-3 text-gray-800 transition hover:bg-gray-50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
          {getFileIcon(attachment.mime_type)}
        </div>

        <div className="min-w-0 flex-1 text-left">
          <div className="truncate text-sm font-semibold">
            {attachment.file_name}
          </div>

          <div className="text-xs text-gray-500">
            {formatFileSize(attachment.file_size)}
          </div>
        </div>

        <Download
          size={18}
          className="shrink-0 text-gray-500"
        />
      </a>
    );
  };

  const renderMessage = (message: Message) => {
    const mine = message.sender_id === user?.id;
    const messageAttachments =
      attachments[message.id] || [];

    return (
      <div
        key={message.id}
        className={`flex w-full ${
          mine ? 'justify-end' : 'justify-start'
        }`}
      >
        <div
          className={`max-w-[82%] md:max-w-[70%] ${
            mine ? 'items-end' : 'items-start'
          }`}
        >
          <div
            className={`rounded-2xl px-4 py-3 shadow-sm ${
              mine
                ? 'rounded-br-md bg-blue-600 text-white'
                : 'rounded-bl-md border bg-white text-gray-900'
            }`}
          >
            {message.body ? (
              <div className="whitespace-pre-wrap break-words text-sm leading-6">
                {message.body}
              </div>
            ) : null}

            {messageAttachments.length > 0 && (
              <div
                className={`space-y-2 ${
                  message.body ? 'mt-3' : ''
                }`}
              >
                {messageAttachments.map(attachment => (
                  <div key={attachment.id}>
                    {renderAttachment(attachment)}
                  </div>
                ))}
              </div>
            )}

            <div
              className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${
                mine
                  ? 'text-blue-100'
                  : 'text-gray-400'
              }`}
            >
              <span>{formatTime(message.sent_at)}</span>

              {mine &&
                (message.read_at ? (
                  <CheckCheck size={13} />
                ) : message.delivered_at ? (
                  <CheckCheck size={13} />
                ) : (
                  <Check size={13} />
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader2
            className="mx-auto animate-spin text-blue-600"
            size={34}
          />
          <p className="mt-3 text-sm text-gray-500">
            Loading messages...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-100px)] min-h-[620px] overflow-hidden rounded-2xl border bg-white shadow-sm">
      {/* Conversation list */}
      <aside
        className={`${
          mobileConversationOpen ? 'hidden md:flex' : 'flex'
        } w-full flex-col border-r md:w-[340px] lg:w-[380px]`}
      >
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Messages
              </h1>
              <p className="mt-0.5 text-xs text-gray-500">
                School communication
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadConversations(user)
              }
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              title="Refresh"
            >
              <RefreshCw size={18} />
            </button>
          </div>

          <div className="relative mt-4">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={event =>
                setSearch(event.target.value)
              }
              placeholder="Search conversations..."
              className="w-full rounded-xl border bg-gray-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div>
                <MessageCircle
                  size={42}
                  className="mx-auto text-gray-300"
                />

                <h2 className="mt-4 font-semibold text-gray-700">
                  No messages yet
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Messages from the school administration
                  will appear here.
                </p>
              </div>
            </div>
          ) : (
            filteredConversations.map(conversation => {
              const active =
                selectedConversationId ===
                conversation.conversation_id;

              const profile =
                conversationProfiles[
                  conversation.conversation_id
                ];

              return (
                <button
                  key={conversation.conversation_id}
                  type="button"
                  onClick={() =>
                    openConversation(
                      conversation.conversation_id
                    )
                  }
                  className={`flex w-full items-center gap-3 border-b px-4 py-3 text-left transition ${
                    active
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-blue-100">
                    {profile?.profile_image_url ? (
                      <img
                        src={profile.profile_image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-semibold text-blue-700">
                        {getConversationInitials(
                          conversation
                        )}
                      </div>
                    )}

                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate font-semibold text-gray-900">
                        {getConversationDisplayName(
                          conversation
                        )}
                      </div>

                      <div className="shrink-0 text-[11px] text-gray-400">
                        {formatConversationDate(
                          conversation.last_message_at
                        )}
                      </div>
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="truncate text-xs text-gray-500">
                        {conversation.title ||
                          'School Administration'}
                      </div>

                      {!!conversation.unread_count && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Conversation */}
      <main
        className={`${
          mobileConversationOpen ? 'flex' : 'hidden md:flex'
        } min-w-0 flex-1 flex-col`}
      >
        {!selectedConversationId ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center">
            <div>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
                <MessageCircle
                  size={38}
                  className="text-blue-600"
                />
              </div>

              <h2 className="mt-5 text-lg font-semibold text-gray-800">
                Select a conversation
              </h2>

              <p className="mt-1 max-w-sm text-sm text-gray-500">
                Choose a conversation to read and reply to
                messages from the school.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="flex items-center gap-3 border-b px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setMobileConversationOpen(false);
                }}
                className="rounded-lg p-2 hover:bg-gray-100 md:hidden"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-blue-100">
                {getConversationProfile()
                  ?.profile_image_url ? (
                  <img
                    src={
                      getConversationProfile()
                        ?.profile_image_url || ''
                    }
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-semibold text-blue-700">
                    {getConversationProfile()
                      ? getInitials(
                          getConversationProfile()
                        )
                      : 'AD'}
                  </div>
                )}

                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-gray-900">
                  {selectedConversation
                    ? getConversationDisplayName(
                        selectedConversation
                      )
                    : 'School Administration'}
                </div>

                <div className="mt-0.5 flex items-center gap-1 text-xs text-green-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Online
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowConversationMenu(
                    value => !value
                  )
                }
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <MoreVertical size={20} />
              </button>

              {showConversationMenu && (
                <div className="absolute right-4 top-16 z-20 w-48 rounded-xl border bg-white p-1 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      void loadMessages(
                        selectedConversationId
                      );
                      setShowConversationMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100"
                  >
                    <RefreshCw size={16} />
                    Refresh messages
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void markConversationRead(
                        selectedConversationId
                      );
                      setShowConversationMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100"
                  >
                    <CheckCheck size={16} />
                    Mark as read
                  </button>
                </div>
              )}
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />
                  <span>{error}</span>

                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="ml-auto"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {loadingMessages ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2
                    size={28}
                    className="animate-spin text-blue-600"
                  />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center">
                  <div>
                    <Clock
                      size={38}
                      className="mx-auto text-gray-300"
                    />
                    <p className="mt-3 text-sm text-gray-500">
                      No messages in this conversation yet.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map(renderMessage)}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t bg-white p-3">
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                  onChange={handleFileChange}
                />

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={uploading || sending}
                  className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
                  title="Attach file"
                >
                  {uploading ? (
                    <Loader2
                      size={20}
                      className="animate-spin"
                    />
                  ) : (
                    <Paperclip size={20} />
                  )}
                </button>

                <textarea
                  value={messageText}
                  onChange={event =>
                    setMessageText(event.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  placeholder="Type your reply..."
                  rows={1}
                  className="max-h-32 min-h-[42px] flex-1 resize-none rounded-2xl border bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                />

                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={
                    !messageText.trim() ||
                    sending ||
                    uploading
                  }
                  className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Send message"
                >
                  {sending ? (
                    <Loader2
                      size={19}
                      className="animate-spin"
                    />
                  ) : (
                    <Send size={19} />
                  )}
                </button>
              </div>

              <div className="mt-1 flex items-center justify-between px-2 text-[10px] text-gray-400">
                <span>
                  Press Enter to send • Shift + Enter for
                  new line
                </span>

                <span>
                  Files up to {formatFileSize(MAX_FILE_SIZE)}
                </span>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Image preview */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() =>
            setPreviewAttachment(null)
          }
        >
          <button
            type="button"
            onClick={() =>
              setPreviewAttachment(null)
            }
            className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X size={24} />
          </button>

          {getStorageUrl(previewAttachment) ? (
            <img
              src={getStorageUrl(previewAttachment) || ''}
              alt={previewAttachment.file_name}
              className="max-h-[90vh] max-w-[95vw] object-contain"
              onClick={event =>
                event.stopPropagation()
              }
            />
          ) : (
            <div className="rounded-xl bg-white p-6 text-center">
              <AlertCircle
                size={36}
                className="mx-auto text-red-500"
              />

              <p className="mt-3 text-sm text-gray-700">
                This attachment is no longer available.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
