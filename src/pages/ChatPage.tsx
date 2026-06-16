import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { 
  Send, 
  Hash, 
  Megaphone, 
  Users, 
  Paperclip,
  Loader2,
  Pin,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import styles from './ChatPage.module.css';

export const ChatPage: React.FC = () => {
  const channels = useQuery(api.chat.getChannels);
  const [selectedChannelId, setSelectedChannelId] = useState<any>(null);
  const [isMobileRoomActive, setIsMobileRoomActive] = useState(false);
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
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();

      const fileId = await saveFileMetadata({
        storageId,
        mimeType: file.type,
        name: file.name,
        size: file.size,
      });

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

  const handleChannelSelect = (channelId: any) => {
    setSelectedChannelId(channelId);
    setIsMobileRoomActive(true);
  };

  if (!channels) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  const activeChannel = channels.find(c => c._id === selectedChannelId);

  // Group channels
  const announcements = channels.filter(c => c.type === 'announcement');
  const leadership = channels.filter(c => c.type === 'deaconBoard');
  const departments = channels.filter(c => c.type === 'department');
  const subunits = channels.filter(c => c.type === 'subunit');

  const renderChannelList = () => {
    return (
      <div className={styles.channelList}>
        {announcements.length > 0 && (
          <div className={styles.categorySection}>
            <div className={styles.categoryHeader}>📢 Announcements</div>
            {announcements.map(channel => (
              <button 
                key={channel._id} 
                className={`${styles.channelBtn} ${selectedChannelId === channel._id ? styles.activeChannel : ''}`}
                onClick={() => handleChannelSelect(channel._id)}
              >
                <Megaphone size={18} />
                <span>{channel.name}</span>
              </button>
            ))}
          </div>
        )}

        {leadership.length > 0 && (
          <div className={styles.categorySection}>
            <div className={styles.categoryHeader}>🛡️ Leadership</div>
            {leadership.map(channel => (
              <button 
                key={channel._id} 
                className={`${styles.channelBtn} ${selectedChannelId === channel._id ? styles.activeChannel : ''}`}
                onClick={() => handleChannelSelect(channel._id)}
              >
                <Users size={18} />
                <span>{channel.name}</span>
              </button>
            ))}
          </div>
        )}

        {departments.length > 0 && (
          <div className={styles.categorySection}>
            <div className={styles.categoryHeader}>💼 Department Chats</div>
            {departments.map(channel => (
              <button 
                key={channel._id} 
                className={`${styles.channelBtn} ${selectedChannelId === channel._id ? styles.activeChannel : ''}`}
                onClick={() => handleChannelSelect(channel._id)}
              >
                <Hash size={18} />
                <span>{channel.name}</span>
              </button>
            ))}
          </div>
        )}

        {subunits.length > 0 && (
          <div className={styles.categorySection}>
            <div className={styles.categoryHeader}>👥 Subunits / Teams</div>
            {subunits.map(channel => (
              <button 
                key={channel._id} 
                className={`${styles.channelBtn} ${selectedChannelId === channel._id ? styles.activeChannel : ''}`}
                onClick={() => handleChannelSelect(channel._id)}
              >
                <Users size={18} />
                <span>{channel.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`${styles.container} ${isMobileRoomActive ? styles.mobileShowChat : ''}`}>
      {/* Sidebar - Rooms List */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h3>Messages</h3>
        </div>
        {renderChannelList()}
      </aside>

      {/* Main Chat Area */}
      <main className={styles.chatArea}>
        <header className={styles.chatHeader}>
          <div className={styles.headerInfo}>
            <button 
              className={styles.backBtn}
              onClick={() => setIsMobileRoomActive(false)}
              aria-label="Back to channels"
            >
              <ArrowLeft size={20} />
            </button>
            {activeChannel?.type === 'announcement' ? <Megaphone size={20} /> : 
             activeChannel?.type === 'department' ? <Hash size={20} /> : <Users size={20} />}
            <h4>{activeChannel?.name || 'Select a channel'}</h4>
          </div>
        </header>

        <div className={styles.messageList}>
          {!messages ? (
            <div className={styles.emptyState}><Loader2 className="animate-spin text-purple-600" /></div>
          ) : messages.length === 0 ? (
            <div className={styles.emptyState}>No messages yet. Start the conversation!</div>
          ) : (
            messages.map((msg: any) => {
              const isMe = me?._id === msg.userId;
              return (
                <div key={msg._id} className={`${styles.messageItem} ${isMe ? styles.messageMe : styles.messageOther}`}>
                  {!isMe && (
                    <div className={styles.avatar} title={`${msg.author.name} (${msg.author.role})`}>
                      {msg.author.name[0]}
                    </div>
                  )}
                  <div className={styles.messageBubbleContainer}>
                    {!isMe && (
                      <div className={styles.messageHeader}>
                        <span className={styles.authorName}>{msg.author.name}</span>
                        <span className={styles.messageRole}>{msg.author.role}</span>
                      </div>
                    )}
                    <div className={styles.messageBubble}>
                      <div className={styles.text}>{msg.text}</div>
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
                      <div className={styles.bubbleFooter}>
                        <span className={styles.timestamp}>{format(msg._creationTime, 'p')}</span>
                        {msg.isPinned && <span className={styles.pinnedBadge}><Pin size={10} /></span>}
                      </div>
                    </div>
                  </div>
                  {(isMe || ['SuperAdmin', 'DepartmentHead', 'PastoralOversight'].includes(me?.role || '')) && (
                    <button 
                      className={styles.deleteMsgBtn} 
                      onClick={() => handleDeleteMessage(msg._id)}
                      title="Delete message"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })
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
