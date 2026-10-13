// Selo de mensagens novas do filho, para a aba Conversa do painel.
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeChat, subscribeChatMeta, type ChatMeta } from '../../services/familyChatService';
import { unreadFor, type ChatMessage } from '../../services/village/familyChat';

export function useChatUnread(): number {
  const { childUid } = useAuth();
  const [rows, setRows] = useState<ChatMessage[]>([]);
  const [meta, setMeta] = useState<ChatMeta>({});
  useEffect(() => {
    if (!childUid) return;
    const a = subscribeChat(childUid, setRows);
    const b = subscribeChatMeta(childUid, setMeta);
    return () => { a(); b(); };
  }, [childUid]);
  return unreadFor(rows, 'pai', meta.parentReadAt);
}
