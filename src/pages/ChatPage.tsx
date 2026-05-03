import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { 
  Send, 
  Hash, 
  Megaphone, 
  Users, 
  User as UserIcon,
  Plus,
  Paperclip,
  Loader2,
  MoreVertical,
  Pin,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import styles from './ChatPage.module.css';

export const ChatPage: React.FC = () => {
  const channels = useQuery(api.chat.getChannels);
  const [selectedChannelId, setSelectedChannelId] = useState<any>(null);
  const messages = useQuery(api.chat.getChannelMessages, selectedChannelId ? { channelId: selectedChannelId } : "skip");
  const sendMessage = useMutation(api.chat.sendMessage);
  const deleteMessage = useMutation(api.chat.deleteMessage);
  const generateUploadUrl = useMutation(api.chat.generateUploadUrl);
  const saveFileMetadata = useMutation(api.chat.saveFileMetadata);
  const me = useQuery(api.users.me);
  
  const [inputText, setInputText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (channels && channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channels[0]._id);
    }
  }, [channels, selectedChannelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChannelId) return;
    
    const text = inputText;
    setInputText("");
    try {
      await sendMessage({ channelId: selectedChannelId, text });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChannelId) return;

    setIsUploading(true);
    try {
      // 1. Get upload URL
      const postUrl = await generateUploadUrl();

      // 2. Upload to storage
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();

      // 3. Save metadata
      const fileId = await saveFileMetadata({
        storageId,
        mimeType: file.type,
        name: file.name,
        size: file.size,
      });

      // 4. Send message with file
      await sendMessage({
        channelId: selectedChannelId,
        text: `Shared a file: ${file.name}`,
        fileId,
      });
    } catch (err: any) {
      alert("Failed to upload file: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteMessage = async (msgId: any) => {
    if (confirm("Delete this message?")) {
      await deleteMessage({ messageId: msgId });
    }
  };

  if (!channels) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  const activeChannel = channels.find(c => c._id === selectedChannelId);

  return (
    <div className={styles.container}>
      {/* Sidebar - Desktop Only usually, but let's make it a simple row for now or standard sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h3>Messages</h3>
        </div>
        <div className={styles.channelList}>
          {channels.map(channel => (
            <button 
              key={channel._id} 
              className={`${styles.channelBtn} ${selectedChannelId === channel._id ? styles.activeChannel : ''}`}
              onClick={() => setSelectedChannelId(channel._id)}
            >
              {channel.type === 'announcement' ? <Megaphone size={18} /> : 
               channel.type === 'department' ? <Hash size={18} /> : <Users size={18} />}
              <span>{channel.name}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Mobile Channel Selector */}
      <div className={styles.mobileNav}>
        {channels.map(channel => (
          <button 
            key={channel._id} 
            className={`${styles.mobileChannelBtn} ${selectedChannelId === channel._id ? styles.activeMobileChannel : ''}`}
            onClick={() => setSelectedChannelId(channel._id)}
          >
            {channel.type === 'announcement' ? <Megaphone size={16} /> : 
             channel.type === 'department' ? <Hash size={16} /> : <Users size={16} />}
            <span>{channel.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Main Chat Area */}
      <main className={styles.chatArea}>
        <header className={styles.chatHeader}>
          <div className={styles.headerInfo}>
            {activeChannel?.type === 'announcement' ? <Megaphone size={20} /> : 
             activeChannel?.type === 'department' ? <Hash size={20} /> : <Users size={20} />}
            <h4>{activeChannel?.name || 'Select a channel'}</h4>
          </div>
        </header>

        <div className={styles.messageList}>
          {!messages ? (
            <div className={styles.emptyState}><Loader2 className="animate-spin" /></div>
          ) : messages.length === 0 ? (
            <div className={styles.emptyState}>No messages yet. Start the conversation!</div>
          ) : (
            messages.map((msg: any) => (
              <div key={msg._id} className={styles.messageItem}>
                <div className={styles.avatar}>{msg.author.name[0]}</div>
                <div className={styles.messageContent}>
                  <div className={styles.messageHeader}>
                    <span className={styles.authorName}>{msg.author.name}</span>
                    <span className={styles.messageRole}>{msg.author.role}</span>
                    <span className={styles.timestamp}>{format(msg._creationTime, 'p')}</span>
                  </div>
                  <div className={styles.text}>{msg.text}</div>
                  {msg.isPinned && <div className={styles.pinnedBadge}><Pin size={10} /> Pinned</div>}
                  
                  {(me?._id === msg.userId || ['SuperAdmin', 'DepartmentHead', 'PastoralOversight'].includes(me?.role || '')) && (
                    <button 
                      className={styles.deleteMsgBtn} 
                      onClick={() => handleDeleteMessage(msg._id)}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                {msg.file && (
                  <div className={styles.fileAttachment}>
                    {msg.file.mimeType.startsWith('image/') ? (
                      <img src={msg.file.url} alt={msg.file.name} className={styles.attachedImage} />
                    ) : (
                      <a href={msg.file.url} target="_blank" rel="noreferrer" className={styles.fileLink}>
                        <Paperclip size={14} /> {msg.file.name}
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className={styles.inputArea} onSubmit={handleSend}>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            style={{ display: 'none' }}
          />
          <button 
            type="button" 
            className={styles.iconBtn} 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Paperclip size={20} />}
          </button>
          <input 
            type="text" 
            placeholder={`Message ${activeChannel?.name || '...'}`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isUploading}
          />
          <button type="submit" className={styles.sendBtn} disabled={!inputText.trim() || isUploading}>
            <Send size={20} />
          </button>
        </form>
      </main>
    </div>
  );
};
