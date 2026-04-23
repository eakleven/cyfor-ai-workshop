import { type FormEvent, useState } from "react";
import {
  getGetItemsQueryKey,
  useDeleteItemsId,
  useGetItems,
  usePatchItemsId,
  usePostItems,
  CreateItemType,
  UpdateItemType,
  ItemType,
} from "./api";
import { useQueryClient } from "@tanstack/react-query";

type Resource = {
  id: number;
  title: string;
  description: string;
  type: ItemType;
  createdAt: string;
};

const RESOURCE_TYPES = ["Room", "Equipment", "Vehicle", "Other"] as const;

export default function App() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<CreateItemType>(CreateItemType.Other);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState<UpdateItemType>(UpdateItemType.Other);

  const queryClient = useQueryClient();
  const refreshResources = () =>
    queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey() });

  const resourcesQuery = useGetItems();
  const createMutation = usePostItems({
    mutation: {
      onSuccess: async () => {
        setTitle("");
        setDescription("");
        setType(CreateItemType.Other);
        await refreshResources();
      },
    },
  });
  const deleteMutation = useDeleteItemsId({
    mutation: { onSuccess: refreshResources },
  });
  const updateMutation = usePatchItemsId({
    mutation: {
      onSuccess: async () => {
        setEditingResource(null);
        await refreshResources();
      },
    },
  });

  const trimmedTitle = title.trim();
  const resources = (resourcesQuery.data?.items ?? []) as Resource[];
  const deletingId = deleteMutation.variables?.id;

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedTitle || createMutation.isPending) return;
    createMutation.mutate({ data: { title: trimmedTitle, description: description.trim(), type: type as CreateItemType } });
  };

  const handleRemove = (id: number) => {
    if (deleteMutation.isPending) return;
    deleteMutation.mutate({ id });
  };

  const openEdit = (resource: Resource) => {
    setEditingResource(resource);
    setEditTitle(resource.title);
    setEditDescription(resource.description);
    setEditType(resource.type);
  };

  const handleUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingResource || updateMutation.isPending) return;
    updateMutation.mutate({
      id: editingResource.id,
      data: {
        title: editTitle.trim() || undefined,
        description: editDescription.trim(),
        type: editType as UpdateItemType,
      },
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Resources</h1>
          <p className="text-sm text-slate-600">
            Manage bookable resources. Add, edit, or remove entries below.
          </p>
        </header>

        <form
          className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          onSubmit={handleCreate}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Resource name"
            maxLength={120}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            maxLength={500}
            rows={2}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 resize-none"
          />
          <div className="flex gap-3">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CreateItemType)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!trimmedTitle || createMutation.isPending}
              className="flex-1 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {createMutation.isPending ? "Adding..." : "Add resource"}
            </button>
          </div>
        </form>

        {createMutation.isError && (
          <p className="text-sm text-rose-600">
            Could not add the resource: {createMutation.error.message}
          </p>
        )}
        {deleteMutation.isError && (
          <p className="text-sm text-rose-600">
            Could not remove the resource: {deleteMutation.error.message}
          </p>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-slate-700">All resources</h2>

          {resourcesQuery.isPending && (
            <p className="mt-3 text-sm text-slate-600">Loading resources...</p>
          )}
          {resourcesQuery.isError && (
            <p className="mt-3 text-sm text-rose-600">
              Could not load resources: {resourcesQuery.error.message}
            </p>
          )}

          {!resourcesQuery.isPending && !resourcesQuery.isError && (
            resources.length > 0 ? (
              <ul className="mt-3 divide-y divide-slate-200">
                {resources.map((resource) => (
                  <li key={resource.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{resource.title}</span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {resource.type}
                        </span>
                      </div>
                      {resource.description && (
                        <p className="mt-0.5 truncate text-xs text-slate-500">{resource.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(resource)}
                        className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(resource.id)}
                        disabled={deleteMutation.isPending}
                        className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                      >
                        {deleteMutation.isPending && deletingId === resource.id
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-600">No resources yet.</p>
            )
          )}
        </section>
      </div>

      {editingResource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingResource(null); }}
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold">Edit resource</h2>
            <form onSubmit={handleUpdate} className="flex flex-col gap-3">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Resource name"
                maxLength={120}
                required
                className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description (optional)"
                maxLength={500}
                rows={3}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 resize-none"
              />
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as UpdateItemType)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {updateMutation.isError && (
                <p className="text-sm text-rose-600">
                  Could not save: {updateMutation.error.message}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingResource(null)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300"
                >
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
