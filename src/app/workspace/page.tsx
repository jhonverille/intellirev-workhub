"use client";

import { useState } from "react";
import { useWorkHub } from "@/lib/work-hub-store";
import { 
  CheckCircle2, 
  FileText, 
  LayoutDashboard, 
  Link as LinkIcon, 
  ChevronRight, 
  Sparkles,
  Target,
  Clock,
  Zap,
  Lock,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useRouter } from "next/navigation";

export default function WorkspacePage() {
  const router = useRouter();
  const { data, user, createTask, createProject, createNote } = useWorkHub();
  const [activeTab, setActiveTab] = useState("task");
  
  // Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState("none");
  const [content, setContent] = useState("");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setVisibility("public");
    setDueDate("");
    setProjectId("none");
    setContent("");
  };

  const handleCreateTask = () => {
    if (!title.trim()) return;
    createTask({
      title,
      description,
      priority,
      status: "to do",
      completed: false,
      visibility,
      dueDate: dueDate || null,
      projectId: projectId === "none" ? null : projectId,
      ownerId: user?.uid ?? undefined,
      assigneeIds: [],
    });
    router.push("/tasks");
    resetForm();
  };

  const handleCreateProject = () => {
    if (!title.trim()) return;
    createProject({
      name: title,
      description,
      status: "planned",
      visibility,
      ownerId: user?.uid ?? undefined,
      assigneeIds: [],
      deadline: null,
    });
    router.push("/projects");
    resetForm();
  };

  const handleCreateNote = () => {
    if (!title.trim()) return;
    createNote({
      title,
      content,
      tags: [],
      visibility,
      ownerId: user?.uid ?? undefined,
      assigneeIds: [],
    });
    router.push("/notes");
    resetForm();
  };

  const currentProject = data.projects.find(p => p.id === projectId);

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <section className="text-center space-y-4 py-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 text-xs font-bold uppercase tracking-widest animate-bounce">
          <Sparkles className="w-3.5 h-3.5" />
          Quick Actions
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">
          Capture what matters.
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto text-lg font-medium">
          Create tasks, start projects, or document ideas in seconds. Everything is synced across your team.
        </p>
      </section>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden shadow-indigo-500/5">
        <div className="flex flex-col md:flex-row h-full">
          {/* Sidebar Navigation */}
          <div className="w-full md:w-72 bg-zinc-50/50 dark:bg-zinc-800/50 border-r border-zinc-200 dark:border-zinc-800 p-8 space-y-8">
             <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] px-2">Mission Type</span>
                <div className="space-y-1">
                   {[
                     { id: "task", label: "Task", icon: CheckCircle2, color: "text-indigo-500", bg: "bg-indigo-500/10" },
                     { id: "project", label: "Project", icon: LayoutDashboard, color: "text-purple-500", bg: "bg-purple-500/10" },
                     { id: "note", label: "Note", icon: FileText, color: "text-amber-500", bg: "bg-amber-500/10" },
                     { id: "link", label: "Quick Link", icon: LinkIcon, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                   ].map((item) => (
                     <button
                       key={item.id}
                       onClick={() => setActiveTab(item.id)}
                       className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${
                         activeTab === item.id 
                           ? `bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-700 ${item.color}` 
                           : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                       }`}
                     >
                       <item.icon className={`w-5 h-5 ${activeTab === item.id ? item.color : "text-zinc-400"}`} />
                       {item.label}
                       {activeTab === item.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                     </button>
                   ))}
                </div>
             </div>

             <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-4 px-2">
                   <Lock className="w-3.5 h-3.5 text-amber-500" />
                   <span className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">Visibility</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <button 
                     onClick={() => setVisibility("public")}
                     className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                       visibility === "public" 
                         ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none" 
                         : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400"
                     }`}
                   >
                     <Globe className="w-4 h-4" />
                     <span className="text-[10px] font-bold">Public</span>
                   </button>
                   <button 
                     onClick={() => setVisibility("private")}
                     className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                       visibility === "private" 
                         ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200 dark:shadow-none" 
                         : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400"
                     }`}
                   >
                     <Lock className="w-4 h-4" />
                     <span className="text-[10px] font-bold">Private</span>
                   </button>
                </div>
             </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 p-8 md:p-12">
            <div className="max-w-2xl mx-auto space-y-8">
               <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.3em]">Identify The Target</span>
                  <Input 
                    placeholder={activeTab === 'project' ? "Project Name..." : "Mission Title..."}
                    className="h-16 text-2xl font-black border-none bg-transparent focus-visible:ring-0 p-0 placeholder:text-zinc-200 dark:placeholder:text-zinc-700"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
               </div>

               {activeTab === 'task' && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                           <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                              <Target className="w-3.5 h-3.5" />
                              Priority Level
                           </label>
                           <Select value={priority} onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}>
                              <option value="low">Low Impact</option>
                              <option value="medium">Standard</option>
                              <option value="high">Critical</option>
                           </Select>
                        </div>
                        <div className="space-y-3">
                           <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5" />
                              Submission Deadline
                           </label>
                           <Input 
                             type="date" 
                             className="h-12 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
                             value={dueDate}
                             onChange={(e) => setDueDate(e.target.value)}
                           />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                            <LayoutDashboard className="w-3.5 h-3.5" />
                            Assign to Project
                        </label>
                        <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                           <option value="none">No Project</option>
                           {data.projects.map(p => (
                             <option key={p.id} value={p.id}>{p.name}</option>
                           ))}
                        </Select>
                        {visibility === "public" && currentProject?.visibility === "private" && (
                          <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                            <Lock className="w-3 h-3" />
                            This project is private. Task will become private automatically.
                          </div>
                        )}
                    </div>

                    <div className="space-y-3">
                       <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Mission Intelligence</label>
                       <Textarea 
                         placeholder="Additional context, steps or requirements..."
                         className="min-h-[120px] rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 resize-none p-4"
                         value={description}
                         onChange={(e) => setDescription(e.target.value)}
                       />
                    </div>
                 </div>
               )}

               {activeTab === 'project' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                     <div className="space-y-3">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Strategy Overview</label>
                        <Textarea 
                          placeholder="What is the ultimate goal of this project?"
                          className="min-h-[150px] rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 resize-none p-6 text-lg"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                        />
                     </div>
                  </div>
               )}

               {activeTab === 'note' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                     <div className="space-y-3">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Document Content</label>
                        <Textarea 
                          placeholder="Start writing... (Markdown supported)"
                          className="min-h-[300px] rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 resize-none p-6 font-mono"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                        />
                     </div>
                  </div>
               )}

               <div className="pt-8 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <Button 
                       variant="ghost" 
                       className="text-zinc-400 hover:text-zinc-600 font-bold"
                       onClick={resetForm}
                     >
                       Discard
                     </Button>
                  </div>
                  <Button 
                    onClick={activeTab === 'task' ? handleCreateTask : activeTab === 'project' ? handleCreateProject : handleCreateNote}
                    disabled={!title.trim()}
                    className="h-16 px-10 rounded-2xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:scale-105 transition-all active:scale-95 font-black text-lg gap-3 shadow-2xl disabled:opacity-50 disabled:hover:scale-100"
                  >
                     <Zap className="w-5 h-5 fill-current" />
                     {activeTab === 'task' ? "Execute Mission" : activeTab === 'project' ? "Initialize Hub" : "Store Intel"}
                  </Button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
