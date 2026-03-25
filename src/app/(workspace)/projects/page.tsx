"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Field } from "@/components/forms/field";
import { ProjectForm } from "@/components/forms/project-form";
import { CollectionToolbar } from "@/components/workspace/collection-toolbar";
import { EntityActions } from "@/components/workspace/entity-actions";
import { FormDialog } from "@/components/workspace/form-dialog";
import {
  CalendarIcon,
  FilterIcon,
  FolderIcon,
  PlusIcon,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { Surface } from "@/components/ui/surface";
import { getProjectStatusTone } from "@/lib/presentation";
import type { Project } from "@/lib/types";
import { useWorkHub } from "@/lib/work-hub-store";
import { formatDate, safeLower } from "@/lib/utils";

export default function ProjectsPage() {
  const { data, user, searchQuery, createProject, updateProject, deleteProject } =
    useWorkHub();
  const [localSearch, setLocalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const isOwner = user?.uid === data.ownerId;
  const viewableProjects = isOwner ? data.projects : data.projects.filter(p => p.assigneeIds?.includes(user?.uid ?? ""));

  const query = safeLower(`${searchQuery} ${localSearch}`.trim());
  const projects = viewableProjects.filter((project) => {
    const matchesQuery = query
      ? [project.name, project.description]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query)
      : true;
    const matchesStatus =
      statusFilter === "all" ? true : project.status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Planning"
        title="Projects"
        description="Keep a short list of active initiatives, give them clear states, and make progress easier to see."
        action={
          <Button
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setIsCreateOpen(true)}
          >
            New project
          </Button>
        }
      />

      <CollectionToolbar
        searchValue={localSearch}
        onSearchChange={setLocalSearch}
        searchPlaceholder="Search project name or description"
        totalLabel="project"
        totalCount={projects.length}
        hasActiveFilters={Boolean(localSearch || statusFilter !== "all")}
        onReset={() => {
          setLocalSearch("");
          setStatusFilter("all");
        }}
        filters={
          <Field label="Status">
            {(fieldProps) => (
              <Select
                {...fieldProps}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </Select>
            )}
          </Field>
        }
      />

      {viewableProjects.length === 0 ? (
        <EmptyState
          icon={<FolderIcon className="h-5 w-5" />}
          title="No projects yet"
          description="Use projects for the larger commitments that deserve their own state, deadline, and context."
          action={
            <Button
              icon={<PlusIcon className="h-4 w-4" />}
              onClick={() => setIsCreateOpen(true)}
            >
              Create your first project
            </Button>
          }
        />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FilterIcon className="h-5 w-5" />}
          title="No projects match these filters"
          description="Try changing the status filter or widening the search to see more of your project list."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {projects.map((project) => {
            const relatedTasks = data.tasks.filter((task) => task.projectId === project.id);

            return (
              <Surface key={project.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-[var(--foreground)]">
                        {project.name}
                      </h2>
                      <Badge tone={getProjectStatusTone(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      {project.description || "No description yet."}
                    </p>
                  </div>
                  <EntityActions
                    onEdit={() => setEditingProject(project)}
                    onDelete={() => setProjectToDelete(project)}
                  />
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
                  <span className="inline-flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {project.deadline ? formatDate(project.deadline) : "No deadline"}
                  </span>
                  <span>{relatedTasks.length} linked task{relatedTasks.length === 1 ? "" : "s"}</span>
                  {project.assigneeIds?.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[var(--surface-strong)] text-[10px] font-semibold">
                      {project.assigneeIds.length} Assignee{project.assigneeIds.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </Surface>
            );
          })}
        </div>
      )}

      <FormDialog
        open={isCreateOpen}
        mode="create"
        noun="project"
        createDescription="Add a project with a clear purpose and a state you can scan at a glance."
        editDescription="Adjust project scope, status, or deadline."
        onClose={() => setIsCreateOpen(false)}
      >
        <ProjectForm
          members={Object.values(data.members || {})}
          onSubmit={(value) => {
            createProject(value);
            setIsCreateOpen(false);
          }}
          onCancel={() => setIsCreateOpen(false)}
        />
      </FormDialog>

      <FormDialog
        open={Boolean(editingProject)}
        mode="edit"
        noun="project"
        createDescription="Add a project with a clear purpose and a state you can scan at a glance."
        editDescription="Adjust project scope, status, or deadline."
        onClose={() => setEditingProject(null)}
      >
        {editingProject ? (
          <ProjectForm
            initialValue={editingProject}
            members={Object.values(data.members || {})}
            onSubmit={(value) => {
              updateProject(editingProject.id, value);
              setEditingProject(null);
            }}
            onCancel={() => setEditingProject(null)}
          />
        ) : null}
      </FormDialog>

      <ConfirmDialog
        open={Boolean(projectToDelete)}
        title="Delete project"
        description={`Delete "${projectToDelete?.name ?? "this project"}"? Related tasks will stay in your list without a project.`}
        onCancel={() => setProjectToDelete(null)}
        onConfirm={() => {
          if (projectToDelete) {
            deleteProject(projectToDelete.id);
          }
          setProjectToDelete(null);
        }}
      />
    </div>
  );
}
