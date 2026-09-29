"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Brain, Plus, MessageSquare, Send, Settings, 
  ChevronLeft, AlertCircle, Database, CheckCircle2, ChevronDown, ChevronRight, MoreHorizontal
} from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

export default function Workspace() {
  const { id } = useParams();
  const router = useRouter();

  const [project, setProject] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  
  const [input, setInput] = useState("");
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Memory Inspector State
  const [lastMemoryData, setLastMemoryData] = useState<any>(null);
  const [memoryUsedInLastTurn, setMemoryUsedInLastTurn] = useState<boolean | null>(null);
  const [expandedSource, setExpandedSource] = useState<number | null>(null);

  const [menuOpenForChat, setMenuOpenForChat] = useState<number | null>(null);
  
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [editingChatId, setEditingChatId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<number | null>(null);

  const [leftSidebarWidth, setLeftSidebarWidth] = useState(256);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(384);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedLeft = localStorage.getItem('leftSidebarWidth');
    const savedRight = localStorage.getItem('rightSidebarWidth');
    if (savedLeft) setLeftSidebarWidth(Number(savedLeft));
    if (savedRight) setRightSidebarWidth(Number(savedRight));
    fetchProjectData();
  }, [id]);

  useEffect(() => {
    if (currentChatId) {
      fetchMessages(currentChatId);
      // Reset memory inspector when switching chats
      setLastMemoryData(null);
      setMemoryUsedInLastTurn(null);
    }
  }, [currentChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const [projectBrief, setProjectBrief] = useState<any>(null);
  const [pollingExhausted, setPollingExhausted] = useState(false);

  const handleLeftDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftSidebarWidth;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.min(Math.max(startWidth + (moveEvent.clientX - startX), 220), 420);
      setLeftSidebarWidth(newWidth);
    };
    
    const onMouseUp = (upEvent: MouseEvent) => {
      const finalWidth = Math.min(Math.max(startWidth + (upEvent.clientX - startX), 220), 420);
      localStorage.setItem('leftSidebarWidth', finalWidth.toString());
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  const handleRightDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightSidebarWidth;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.min(Math.max(startWidth - (moveEvent.clientX - startX), 280), 600);
      setRightSidebarWidth(newWidth);
    };
    
    const onMouseUp = (upEvent: MouseEvent) => {
      const finalWidth = Math.min(Math.max(startWidth - (upEvent.clientX - startX), 280), 600);
      localStorage.setItem('rightSidebarWidth', finalWidth.toString());
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
  };
  const pollingCount = useRef(0);

  const fetchBrief = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/projects/${id}/brief`);
      const data = await res.json();
      setProjectBrief(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (projectBrief?.status === "updating") {
      if (pollingCount.current < 10) {
        timeoutId = setTimeout(() => {
          pollingCount.current += 1;
          fetchBrief();
        }, 3000);
      } else {
        setPollingExhausted(true);
      }
    } else {
      pollingCount.current = 0;
      setPollingExhausted(false);
    }
    
    return () => clearTimeout(timeoutId);
  }, [projectBrief]);

  const fetchProjectData = async () => {
    try {
      const [projRes, chatsRes, briefRes] = await Promise.all([
        fetch(`http://localhost:8000/api/projects/${id}`),
        fetch(`http://localhost:8000/api/chats/project/${id}`),
        fetch(`http://localhost:8000/api/projects/${id}/brief`)
      ]);
      
      const projData = await projRes.json();
      const chatsData = await chatsRes.json();
      const briefData = await briefRes.json();
      
      setProject(projData);
      setChats(chatsData);
      setProjectBrief(briefData);
      
      if (chatsData.length > 0) {
        setCurrentChatId(chatsData[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchMessages = async (chatId: number) => {
    try {
      const res = await fetch(`http://localhost:8000/api/messages/chat/${chatId}`);
      const data = await res.json();
      setMessages(data);
    } catch (e) {
      console.error(e);
    }
  };

  const createChat = async () => {
    const finalTitle = `Chat ${chats.length + 1}`;
    
    try {
      const res = await fetch(`http://localhost:8000/api/chats/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: finalTitle, project_id: parseInt(id as string) })
      });
      const newChat = await res.json();
      setChats([newChat, ...chats]);
      setCurrentChatId(newChat.id);
    } catch (e) {
      console.error(e);
    }
  };

  const saveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChatId || !editingTitle.trim()) return;
    try {
      const res = await fetch(`http://localhost:8000/api/chats/${editingChatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editingTitle.trim() })
      });
      const updatedChat = await res.json();
      setChats(chats.map(c => c.id === editingChatId ? updatedChat : c));
    } catch (e) {
      console.error(e);
    } finally {
      setShowRenameModal(false);
      setEditingChatId(null);
    }
  };

  const confirmDeleteChat = async () => {
    if (!deletingChatId) return;
    try {
      await fetch(`http://localhost:8000/api/chats/${deletingChatId}`, {
        method: "DELETE"
      });
      const newChats = chats.filter(c => c.id !== deletingChatId);
      setChats(newChats);
      if (currentChatId === deletingChatId) {
        setCurrentChatId(newChats.length > 0 ? newChats[0].id : null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setShowDeleteModal(false);
      setDeletingChatId(null);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentChatId || loading) return;

    const userMessage = input;
    setInput("");
    
    // Optimistic UI
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch(`http://localhost:8000/api/messages/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: currentChatId,
          message: userMessage,
          memory_enabled: memoryEnabled
        })
      });
      
      const data = await res.json();
      
      // Update memory inspector state
      setMemoryUsedInLastTurn(data.memory_used);
      setLastMemoryData(data.memory_data);

      // Add assistant message
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: data.response,
        memoryUsed: data.memory_used 
      }]);
      
      // Fetch brief asynchronously to see if it updated (give it a small delay for consolidation)
      setTimeout(() => {
        fetchBrief();
      }, 3000);
      
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, an error occurred while generating the response." }]);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-500">Loading workspace...</div>;
  if (!project) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-500">Project not found</div>;

  return (
    <div className="h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <header className="h-14 border-b border-zinc-800 bg-[#0c0c0e] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{project.name}</span>
            <span className="text-[10px] uppercase tracking-wider font-bold bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">
              {project.persona}
            </span>
          </div>
        </div>

        {/* Project Memory Toggle */}
        <div className="flex items-center gap-3 bg-[#121214] border border-zinc-800 rounded-full px-3 py-1.5">
          <span className={`text-xs font-medium ${memoryEnabled ? 'text-indigo-400' : 'text-zinc-500'}`}>
            Project Memory
          </span>
          <button 
            onClick={() => setMemoryEnabled(!memoryEnabled)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${memoryEnabled ? 'bg-indigo-600' : 'bg-zinc-700'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${memoryEnabled ? 'translate-x-4' : 'translate-x-1'}`} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Chats */}
        <div 
          className="border-r border-zinc-800 bg-[#0c0c0e] flex flex-col shrink-0 relative group/left-sidebar"
          style={{ width: `${leftSidebarWidth}px` }}
        >
          {/* Resize Handle */}
          <div 
            onMouseDown={handleLeftDrag}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/50 z-20 transition-colors"
          >
            {/* Invisible wider area for easier grabbing */}
            <div className="absolute top-0 right-0 w-4 h-full -mr-2" />
          </div>

          <div className="p-4 border-b border-zinc-800">
            <button 
              onClick={createChat}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-md text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {chats.map(c => (
              <div
                key={c.id}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-colors cursor-pointer ${currentChatId === c.id ? 'bg-[#1a1a1f] text-indigo-400 font-medium' : 'text-zinc-400 hover:bg-[#121214] hover:text-zinc-200'}`}
                onClick={() => setCurrentChatId(c.id)}
              >
                <MessageSquare size={16} className={currentChatId === c.id ? 'text-indigo-500' : 'text-zinc-500'} style={{ flexShrink: 0 }} />
                
                <span className="truncate flex-1">{c.title}</span>
                
                {/* 3-dot Menu Button */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenForChat(menuOpenForChat === c.id ? null : c.id);
                  }}
                  className={`p-1 rounded hover:bg-zinc-700/50 transition-opacity flex-shrink-0 ${menuOpenForChat === c.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <MoreHorizontal size={14} className="text-zinc-400" />
                </button>
                
                {/* Context Menu */}
                {menuOpenForChat === c.id && (
                  <div className="absolute right-2 top-8 bg-[#1e1e24] border border-zinc-700 rounded-lg shadow-xl z-50 py-1 min-w-[120px]"
                       onClick={(e) => e.stopPropagation()}
                  >
                    <button 
                      onClick={() => {
                        setEditingChatId(c.id);
                        setEditingTitle(c.title);
                        setShowRenameModal(true);
                        setMenuOpenForChat(null);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                    >
                      Rename
                    </button>
                    <button 
                      onClick={() => {
                        setDeletingChatId(c.id);
                        setShowDeleteModal(true);
                        setMenuOpenForChat(null);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Area - Conversation */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#09090b] relative">
          {!currentChatId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
              <MessageSquare size={48} className="mb-4 text-zinc-800" />
              <p>Select or create a chat to begin</p>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                    <div className="bg-[#121214] p-4 rounded-2xl mb-4 border border-zinc-800">
                      <Brain className="text-indigo-500" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-zinc-200 mb-2">Universal AI Workspace</h3>
                    <p className="text-sm text-zinc-500">
                      Start chatting. Information discussed here will be saved to this project's memory and available across all chats in this workspace.
                    </p>
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 ${
                        m.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : 'bg-[#121214] border border-zinc-800 text-zinc-100 rounded-bl-none'
                      }`}>
                        {m.role === 'assistant' && (m.memoryUsed || m.memoryUsed === undefined) && (
                          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-indigo-400 mb-2">
                            <Brain size={12} />
                            Project memory used
                          </div>
                        )}
                        <div className="whitespace-pre-wrap leading-relaxed text-[15px]">
                          {m.role === 'assistant' ? (
                            <ReactMarkdown
                              components={{
                                p: ({node, children, ...props}: any) => <p className="mb-4 last:mb-0 leading-relaxed text-[15px]" {...props}>{children}</p>,
                                ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4" {...props} />,
                                li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-4 mt-6" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-3 mt-5" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-base font-bold mb-3 mt-4" {...props} />,
                                pre: ({node, ...props}: any) => (
                                  <pre className="bg-black/50 border border-zinc-800 rounded-md p-3 overflow-x-auto mb-4 mt-2 max-w-full" {...props} />
                                ),
                                code: ({node, inline, className, children, ...props}: any) => {
                                  const match = /language-(\w+)/.exec(className || '');
                                  const isBlock = match || (!inline && typeof children === 'string' && children.includes('\n'));
                                  if (isBlock) {
                                    return <code className={className} {...props}>{children}</code>;
                                  }
                                  return (
                                    <code className="bg-black/30 border border-zinc-800/50 rounded px-1.5 py-0.5 font-mono text-[13px] break-words" {...props}>
                                      {children}
                                    </code>
                                  );
                                }
                              }}
                            >
                              {m.content}
                            </ReactMarkdown>
                          ) : (
                            m.content
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-[#121214] border border-zinc-800 rounded-2xl rounded-bl-none px-5 py-4 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse"></div>
                      <div className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse delay-75"></div>
                      <div className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse delay-150"></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 bg-[#09090b] border-t border-zinc-800/50">
                <form onSubmit={sendMessage} className="max-w-4xl mx-auto relative flex items-center">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full bg-[#121214] border border-zinc-800 rounded-xl pl-4 pr-12 py-4 text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-lg placeholder:text-zinc-600 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </form>
                <div className="text-center mt-2 text-[11px] text-zinc-500">
                  {memoryEnabled ? "Memory is ON. Project context will be injected." : "Memory is OFF. Answering without project context."}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Sidebar - Brief & Inspector */}
        <div 
          className="border-l border-zinc-800 bg-[#0c0c0e] flex flex-col shrink-0 overflow-y-auto relative"
          style={{ width: `${rightSidebarWidth}px` }}
        >
          {/* Resize Handle */}
          <div 
            onMouseDown={handleRightDrag}
            className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/50 z-20 transition-colors"
          >
            {/* Invisible wider area for easier grabbing */}
            <div className="absolute top-0 left-0 w-4 h-full -ml-2" />
          </div>

          {/* Project Brief Section */}
          <div className="p-4 border-b border-zinc-800 bg-[#0c0c0e]/95 backdrop-blur z-10 flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-zinc-200">
              <Database size={16} className="text-indigo-400" />
              Project Brief
            </h3>
            <button onClick={fetchBrief} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Refresh
            </button>
          </div>
          <div className="p-4 border-b border-zinc-800/50 bg-[#121214]/50">
            {projectBrief ? (
              <div className="text-sm text-zinc-300">
                <div className="mb-3 text-[11px] flex justify-between font-mono uppercase tracking-wider text-zinc-500">
                  <span className={projectBrief.status === 'ready' ? 'text-green-500/80' : projectBrief.status === 'empty' ? 'text-zinc-500/80' : (pollingExhausted ? 'text-blue-500/80' : 'text-amber-500/80')}>
                    Status: {projectBrief.status === 'ready' ? 'Up to date' : projectBrief.status === 'empty' ? 'Empty' : (pollingExhausted ? 'Still processing' : 'Updating...')}
                  </span>
                  <span>{projectBrief.last_refreshed_at ? new Date(projectBrief.last_refreshed_at).toLocaleTimeString() : 'N/A'}</span>
                </div>
                {projectBrief.content ? (
                  <div className="max-w-none">
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-[13px] font-bold mb-2 mt-4 text-indigo-300 uppercase tracking-wider border-b border-zinc-800/50 pb-1" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-[12px] font-bold mb-2 mt-3 text-indigo-200 uppercase tracking-wide" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-[12px] font-bold mb-1 mt-2 text-indigo-100" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-3 text-[12px] text-zinc-400 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="pl-1" {...props} />,
                        p: ({node, ...props}) => <p className="mb-3 text-[12px] leading-relaxed text-zinc-300" {...props} />,
                        strong: ({node, ...props}) => <strong className="text-zinc-200 font-semibold" {...props} />
                      }}
                    >{projectBrief.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500 italic text-center py-4">
                    {projectBrief.status === 'empty' 
                      ? "No project brief generated yet." 
                      : (pollingExhausted ? "Still processing. Click Refresh to check again." : "Building project brief...")}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-zinc-500 animate-pulse text-center py-4">Loading brief...</div>
            )}
          </div>

          {/* Memory Inspector Section */}
          <div className="p-4 border-b border-zinc-800 sticky top-0 bg-[#0c0c0e]/95 backdrop-blur z-10 flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-zinc-200">
              <Brain size={16} className="text-indigo-400" />
              Memory Inspector
            </h3>
          </div>

          <div className="p-4 flex-1">
            {memoryUsedInLastTurn === null ? (
              <div className="text-sm text-zinc-500 flex flex-col items-center justify-center h-48 text-center gap-3">
                <Brain size={24} className="text-zinc-700" />
                <p>Send a message to see memory inspection details here.</p>
              </div>
            ) : memoryUsedInLastTurn === false ? (
              <div className="bg-[#121214] border border-zinc-800 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-zinc-400 font-medium text-sm mb-2">
                  <AlertCircle size={16} />
                  MEMORY OFF
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Project memory was not consulted for this response. The toggle is set to OFF.
                </p>
              </div>
            ) : lastMemoryData && lastMemoryData.results && lastMemoryData.results.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-indigo-400 font-medium text-sm mb-1">
                    <CheckCircle2 size={16} />
                    MEMORY ON
                  </div>
                  <p className="text-xs text-indigo-300/70">
                    {lastMemoryData.results.length} project memories retrieved.
                  </p>
                </div>

                {lastMemoryData.results.map((res: any, idx: number) => (
                  <div key={idx} className="bg-[#121214] border border-zinc-800 rounded-lg overflow-hidden text-sm">
                    <div className="p-3 border-b border-zinc-800/50 bg-[#151518]">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Memory Chunk</span>
                        {res.scores && res.scores.semantic && (
                          <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">
                            Relevance: {res.scores.semantic.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-300 text-xs leading-relaxed line-clamp-3">
                        {res.text}
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => setExpandedSource(expandedSource === idx ? null : idx)}
                      className="w-full flex items-center justify-between p-2.5 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30 transition-colors"
                    >
                      <span>How I know this</span>
                      {expandedSource === idx ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    
                    {expandedSource === idx && (
                      <div className="p-3 bg-black/40 border-t border-zinc-800/50 text-[11px] font-mono text-zinc-400 overflow-x-auto space-y-2">
                        {res.id && <div><span className="text-zinc-600">ID:</span> {res.id}</div>}
                        {res.document_id && <div><span className="text-zinc-600">Doc:</span> {res.document_id}</div>}
                        {res.tags && res.tags.length > 0 && <div><span className="text-zinc-600">Tags:</span> {res.tags.join(', ')}</div>}
                        {res.metadata && Object.keys(res.metadata).length > 0 && <div><span className="text-zinc-600">Meta:</span> {JSON.stringify(res.metadata)}</div>}
                        {res.scores && (
                          <div>
                            <span className="text-zinc-600">Scores:</span> 
                            <ul className="pl-2 mt-1 space-y-0.5">
                              {Object.entries(res.scores).map(([k, v]) => (
                                <li key={k}>{k}: {typeof v === 'number' ? v.toFixed(3) : String(v)}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div><span className="text-zinc-600">Full Text:</span><br/>{res.text}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#121214] border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-zinc-300 font-medium text-sm mb-2">
                  <Database size={16} />
                  MEMORY ON
                </div>
                <p className="text-xs text-zinc-500">
                  No relevant project memories were retrieved for this query.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rename Chat Modal */}
      {showRenameModal && editingChatId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100">Rename Chat</h3>
            </div>
            <form onSubmit={saveRename} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                  Chat Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-md px-3 py-2 text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Chat Modal */}
      {showDeleteModal && deletingChatId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-red-900/50 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-red-400">Delete Chat?</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-300">
                Are you sure you want to delete this chat?
              </p>
              <p className="text-sm text-zinc-400">
                This will permanently remove the conversation history from the UI.
              </p>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteChat}
                  className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors"
                >
                  Delete Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
