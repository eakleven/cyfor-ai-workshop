import { type FormEvent, useEffect, useState } from "react";
import {
  useDeleteItemsId,
  useGetItems,
  usePatchItemsId,
  usePostItems,
  CreateItemType,
  UpdateItemType,
  ItemType,
  GetItemsType,
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
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<GetItemsType | "">("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const queryClient = useQueryClient();
  const refreshResources = () =>
    queryClient.invalidateQueries({ queryKey: ["/items"] });

  const filterParams = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
  };
  const resourcesQuery = useGetItems(filterParams);
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
    <main className="min-h-screen bg-fv-bg px-4 py-10 text-fv-text">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="space-y-1 border-b border-fv-border pb-4">
          <h1 className="text-xl font-normal tracking-wide">Ressursstyring</h1>
          <p className="text-sm text-fv-text-muted">
            Administrer bookbare ressurser. Legg til, rediger eller fjern oppføringer nedenfor.
          </p>
        </header>

        <form
          className="flex flex-col gap-3 border border-fv-border bg-fv-card p-4"
          onSubmit={handleCreate}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ressursnavn"
            maxLength={120}
            className="border border-fv-border bg-fv-card px-3 py-2 text-base text-fv-text outline-none focus:border-fv-green"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beskrivelse (valgfritt)"
            maxLength={500}
            rows={2}
            className="resize-none border border-fv-border bg-fv-card px-3 py-2 text-sm text-fv-text outline-none focus:border-fv-green"
          />
          <div className="flex gap-3">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CreateItemType)}
              className="border border-fv-border bg-fv-card px-3 py-2 text-sm text-fv-text outline-none focus:border-fv-green"
            >
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!trimmedTitle || createMutation.isPending}
              className="flex-1 bg-fv-green px-4 py-2 text-sm font-medium text-white hover:bg-fv-green-mid disabled:cursor-not-allowed disabled:bg-fv-border"
            >
              {createMutation.isPending ? "Legger til..." : "Legg til ressurs"}
            </button>
          </div>
        </form>

        {createMutation.isError && (
          <p className="text-sm text-fv-red">
            Kunne ikke legge til ressursen: {createMutation.error.message}
          </p>
        )}
        {deleteMutation.isError && (
          <p className="text-sm text-fv-red">
            Kunne ikke fjerne ressursen: {deleteMutation.error.message}
          </p>
        )}

        <section className="border border-fv-border bg-fv-card p-4">
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søk i ressurser..."
              className="flex-1 border border-fv-border bg-fv-card px-3 py-2 text-sm text-fv-text outline-none focus:border-fv-green"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as GetItemsType | "")}
              className="border border-fv-border bg-fv-card px-3 py-2 text-sm text-fv-text outline-none focus:border-fv-green"
            >
              <option value="">Alle typer</option>
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <h2 className="mt-3 text-sm font-medium text-fv-text-muted uppercase tracking-wider">Alle ressurser</h2>

          {resourcesQuery.isPending && (
            <p className="mt-3 text-sm text-fv-text-muted">Laster ressurser...</p>
          )}
          {resourcesQuery.isError && (
            <p className="mt-3 text-sm text-fv-red">
              Kunne ikke laste ressurser: {resourcesQuery.error.message}
            </p>
          )}

          {!resourcesQuery.isPending && !resourcesQuery.isError && (
            resources.length > 0 ? (
              <ul className="mt-3 divide-y divide-fv-border">
                {resources.map((resource) => (
                  <li key={resource.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-fv-text">{resource.title}</span>
                        <span className="shrink-0 border border-fv-sage px-2 py-0.5 text-xs text-fv-green-mid">
                          {resource.type}
                        </span>
                      </div>
                      {resource.description && (
                        <p className="mt-0.5 truncate text-xs text-fv-text-muted">{resource.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(resource)}
                        className="border border-fv-border px-3 py-1 text-sm text-fv-text hover:border-fv-green hover:text-fv-green"
                      >
                        Rediger
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(resource.id)}
                        disabled={deleteMutation.isPending}
                        className="border border-fv-border px-3 py-1 text-sm text-fv-text hover:border-fv-red hover:text-fv-red disabled:cursor-not-allowed disabled:border-fv-border disabled:text-fv-text-muted"
                      >
                        {deleteMutation.isPending && deletingId === resource.id
                          ? "Fjerner..."
                          : "Fjern"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-fv-text-muted">Ingen ressurser registrert.</p>
            )
          )}
        </section>
      </div>

      {editingResource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-fv-text/40 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingResource(null); }}
        >
          <div className="w-full max-w-md border border-fv-border bg-fv-card p-6">
            <h2 className="mb-4 text-base font-medium text-fv-text">Rediger ressurs</h2>
            <form onSubmit={handleUpdate} className="flex flex-col gap-3">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Ressursnavn"
                maxLength={120}
                required
                className="border border-fv-border bg-fv-card px-3 py-2 text-base text-fv-text outline-none focus:border-fv-green"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Beskrivelse (valgfritt)"
                maxLength={500}
                rows={3}
                className="resize-none border border-fv-border bg-fv-card px-3 py-2 text-sm text-fv-text outline-none focus:border-fv-green"
              />
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as UpdateItemType)}
                className="border border-fv-border bg-fv-card px-3 py-2 text-sm text-fv-text outline-none focus:border-fv-green"
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {updateMutation.isError && (
                <p className="text-sm text-fv-red">
                  Kunne ikke lagre: {updateMutation.error.message}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingResource(null)}
                  className="border border-fv-border px-4 py-2 text-sm text-fv-text hover:border-fv-green"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-fv-green px-4 py-2 text-sm font-medium text-white hover:bg-fv-green-mid disabled:bg-fv-border"
                >
                  {updateMutation.isPending ? "Lagrer..." : "Lagre"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
