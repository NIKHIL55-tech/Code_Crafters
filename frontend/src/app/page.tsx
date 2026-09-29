"use client";

import { useEffect, useState } from "react";
import { FolderGit2, Plus, ArrowRight, Brain, MoreHorizontal } from "lucide-react";
import Link from "next/link";

interface Project {
  id: number;
  name: string;
  description: string;
  persona: string;
  created_at: string;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // New Project Form
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [persona, setPersona] = useState("Coding");

  // Project Management State
  const [menuOpenForProject, setMenuOpenForProject] = useState<number | null>(null);
  
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [renameName, setRenameName] = useState("");
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/projects/");
      const data = await res.json();
      setProjects(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const res = await fetch("http://localhost:8000/api/projects/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: desc, persona }),
      });
      const newProj = await res.json();
      setProjects([newProj, ...projects]);
      setShowModal(false);
      setName("");
      setDesc("");
      setPersona("Coding");
    } catch (e) {
      console.error(e);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !renameName.trim()) return;
    try {
      const res = await fetch(`http://localhost:8000/api/projects/${editingProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameName.trim() })
      });
      const updated = await res.json();
      setProjects(projects.map(p => p.id === updated.id ? { ...p, name: updated.name } : p));
      setShowRenameModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!deletingProject) return;
    try {
      await fetch(`http://localhost:8000/api/projects/${deletingProject.id}`, {
        method: "DELETE"
      });
      setProjects(projects.filter(p => p.id !== deletingProject.id));
      setShowDeleteModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-[#0c0c0e] py-6 px-8">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400">
            <Brain size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Code Crafter</h1>
            <p className="text-zinc-400 text-sm">Universal AI Workspace with Persistent Project Memory</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto py-12 px-8">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
            <FolderGit2 className="text-zinc-400" size={20} />
            Your Workspaces
          </h2>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            <Plus size={18} />
            New Workspace
          </button>
        </div>

        {loading ? (
          <div className="text-zinc-500">Loading workspaces...</div>
        ) : projects.length === 0 ? (
          <div className="border border-dashed border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
            <p className="mb-4">No workspaces found.</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Create your first workspace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <div className="group bg-[#121214] border border-zinc-800 hover:border-indigo-500/50 hover:bg-[#18181b] rounded-xl p-6 transition-all duration-200 cursor-pointer flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4 relative">
                    <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-indigo-400 transition-colors mr-2 line-clamp-2">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-zinc-800 text-zinc-300 px-2 py-1 rounded-full">
                        {p.persona}
                      </span>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMenuOpenForProject(menuOpenForProject === p.id ? null : p.id);
                          }}
                          className={`p-1.5 rounded hover:bg-zinc-700/50 transition-opacity ${menuOpenForProject === p.id ? 'opacity-100 bg-zinc-700/50' : 'opacity-0 group-hover:opacity-100'}`}
                        >
                          <MoreHorizontal size={16} className="text-zinc-400" />
                        </button>
                        
                        {menuOpenForProject === p.id && (
                          <div className="absolute right-0 top-8 bg-[#1e1e24] border border-zinc-700 rounded-lg shadow-xl z-50 py-1 min-w-[140px]"
                               onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          >
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                setEditingProject(p);
                                setRenameName(p.name);
                                setShowRenameModal(true);
                                setMenuOpenForProject(null);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                            >
                              Rename
                            </button>
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                setDeletingProject(p);
                                setShowDeleteModal(true);
                                setMenuOpenForProject(null);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-zinc-400 text-sm flex-grow">
                    {p.description || "No description provided."}
                  </p>
                  <div className="mt-6 flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-800/50 pt-4">
                    <span>Created {new Date(p.created_at).toLocaleDateString()}</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100">Create Workspace</h3>
              <p className="text-sm text-zinc-400 mt-1">Start a new project with persistent memory.</p>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-md px-3 py-2 text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="e.g. Hospital Management System"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-md px-3 py-2 text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-[80px]"
                  placeholder="Optional details about this project..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                  Persona / Domain
                </label>
                <select
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-md px-3 py-2 text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                >
                  <option value="Coding">Coding</option>
                  <option value="Medical">Medical</option>
                  <option value="Legal">Legal</option>
                  <option value="Research">Research</option>
                  <option value="General">General</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && editingProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100">Rename Workspace</h3>
            </div>
            <form onSubmit={handleRename} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-red-900/50 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-red-400">Delete Workspace?</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-300">
                Are you sure you want to delete <strong className="text-white">{deletingProject.name}</strong>?
              </p>
              <p className="text-sm text-zinc-400">
                This will permanently remove the workspace and all its local chat history. 
                <br/><br/>
                <span className="text-xs italic opacity-80">Note: Hindsight project memories are isolated and will not be accessible to other projects, but permanent deletion from the Hindsight index itself depends on your configured retention policy.</span>
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
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors"
                >
                  Delete Workspace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
