import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  useDeleteItemsId,
  useGetItems,
  useGetReservations,
  usePatchItemsId,
  usePatchReservationsId,
  usePostItems,
  usePostReservations,
  CreateItemType,
  UpdateItemType,
  ItemType,
  GetItemsType,
  ReservationStatus,
} from "./api";
import { useQueryClient } from "@tanstack/react-query";

type Resource = {
  id: number;
  title: string;
  description: string;
  type: ItemType;
  createdAt: string;
};

type Reservation = {
  id: number;
  itemId: number;
  startAt: string;
  endAt: string;
  reserverName: string;
  purpose: string;
  status: ReservationStatus;
  createdAt: string;
};

const RESOURCE_TYPES = ["Room", "Equipment", "Vehicle", "Other"] as const;
const RESERVATION_STATUSES = Object.values(ReservationStatus) as ReservationStatus[];

const TYPE_LABELS: Record<(typeof RESOURCE_TYPES)[number], string> = {
  Room: "Rom",
  Equipment: "Utstyr",
  Vehicle: "Kjøretøy",
  Other: "Annet",
};

const RESERVATION_STATUS_LABELS: Record<(typeof RESERVATION_STATUSES)[number], string> = {
  Draft: "Utkast",
  Confirmed: "Bekreftet",
  Cancelled: "Avbrutt",
  Completed: "Fullført",
};

const pad = (value: number) => value.toString().padStart(2, "0");

const toDateTimeLocalValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const getDefaultWindow = () => {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);

  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  return {
    start: toDateTimeLocalValue(start),
    end: toDateTimeLocalValue(end),
  };
};

const toIsoString = (value: string) => {
  if (!value) return "";

  return new Date(value).toISOString();
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("nb-NO", {
    dateStyle: "short",
    timeStyle: "short",
  });

const csvEscape = (value: string | number) => {
  const stringValue = String(value);
  const safeValue = /^\s*[=+\-@]/.test(stringValue) ? `'${stringValue}` : stringValue;

  return `"${safeValue.replace(/"/g, '""')}"`;
};

const formatCsvTimestamp = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatDateTime(value);
};

const RESERVATION_EXPORT_HEADERS = [
  "reservationId",
  "resourceTitle",
  "resourceType",
  "startTime",
  "endTime",
  "reserverName",
  "purpose",
  "status",
  "createdTime",
] as const;

const overlaps = (startA: string, endA: string, startB: string, endB: string) =>
  new Date(startA).getTime() < new Date(endB).getTime() &&
  new Date(endA).getTime() > new Date(startB).getTime();

export default function App() {
  const defaultWindow = useMemo(() => getDefaultWindow(), []);
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
  const [availabilityStart, setAvailabilityStart] = useState(defaultWindow.start);
  const [availabilityEnd, setAvailabilityEnd] = useState(defaultWindow.end);
  const [reservationItemId, setReservationItemId] = useState("");
  const [reservationStart, setReservationStart] = useState(defaultWindow.start);
  const [reservationEnd, setReservationEnd] = useState(defaultWindow.end);
  const [reserverName, setReserverName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [reservationStatus, setReservationStatus] = useState<ReservationStatus>(ReservationStatus.Draft);
  const [reservationFilterItemId, setReservationFilterItemId] = useState("");
  const [reservationFilterStatus, setReservationFilterStatus] = useState<ReservationStatus | "">("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const queryClient = useQueryClient();
  const refreshResources = () =>
    queryClient.invalidateQueries({ queryKey: ["/items"] });
  const refreshReservations = () =>
    queryClient.invalidateQueries({ queryKey: ["/reservations"] });

  const filterParams = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
  };
  const resourcesQuery = useGetItems(filterParams);
  const reservationsQuery = useGetReservations();
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
  const createReservationMutation = usePostReservations({
    mutation: {
      onSuccess: async () => {
        setReservationItemId("");
        setReservationStart(defaultWindow.start);
        setReservationEnd(defaultWindow.end);
        setReserverName("");
        setPurpose("");
        setReservationStatus(ReservationStatus.Draft);
        await refreshReservations();
      },
    },
  });
  const updateReservationMutation = usePatchReservationsId({
    mutation: { onSuccess: refreshReservations },
  });

  const trimmedTitle = title.trim();
  const trimmedReserverName = reserverName.trim();
  const trimmedPurpose = purpose.trim();
  const resources = (resourcesQuery.data?.items ?? []) as Resource[];
  const reservations = (reservationsQuery.data?.reservations ?? []) as Reservation[];
  const deletingId = deleteMutation.variables?.id;
  const updatingReservationId = updateReservationMutation.variables?.id;

  const itemLookup = useMemo(
    () => new Map(resources.map((resource) => [resource.id, resource])),
    [resources],
  );

  const scheduleStartIso = toIsoString(availabilityStart);
  const scheduleEndIso = toIsoString(availabilityEnd);
  const availabilityWindowValid =
    Boolean(scheduleStartIso) &&
    Boolean(scheduleEndIso) &&
    new Date(scheduleEndIso).getTime() > new Date(scheduleStartIso).getTime();

  const reservationsWithResources = reservations
    .map((reservation) => ({
      ...reservation,
      resource: itemLookup.get(reservation.itemId),
    }))
    .filter((reservation) => {
      if (reservationFilterItemId && reservation.itemId !== Number(reservationFilterItemId)) {
        return false;
      }

      if (reservationFilterStatus && reservation.status !== reservationFilterStatus) {
        return false;
      }

      return true;
    })
    .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());

  const reservationExportRows = useMemo(
    () =>
      reservationsWithResources.map((reservation) => ({
        reservationId: reservation.id,
        resourceTitle: reservation.resource?.title ?? `Ressurs #${reservation.itemId}`,
        resourceType: reservation.resource?.type
          ? TYPE_LABELS[reservation.resource.type] ?? reservation.resource.type
          : "Ukjent",
        startTime: formatCsvTimestamp(reservation.startAt),
        endTime: formatCsvTimestamp(reservation.endAt),
        reserverName: reservation.reserverName,
        purpose: reservation.purpose,
        status:
          RESERVATION_STATUS_LABELS[
            (reservation.status as (typeof RESERVATION_STATUSES)[number]) ?? ReservationStatus.Draft
          ] ?? reservation.status,
        createdTime: formatCsvTimestamp(reservation.createdAt),
      })),
    [reservationsWithResources],
  );

  const handleExportReservations = () => {
    if (reservationExportRows.length === 0) return;

    const csvContent = [
      RESERVATION_EXPORT_HEADERS.join(","),
      ...reservationExportRows.map((row) =>
        RESERVATION_EXPORT_HEADERS.map((header) => csvEscape(row[header])).join(","),
      ),
    ].join("\r\n");
    const blob = new Blob(["\uFEFF", csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    link.href = url;
    link.download = `reservasjoner-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedTitle || createMutation.isPending) return;

    createMutation.mutate({
      data: {
        title: trimmedTitle,
        description: description.trim(),
        type: type as CreateItemType,
      },
    });
  };

  const handleCreateReservation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const startAt = toIsoString(reservationStart);
    const endAt = toIsoString(reservationEnd);

    if (
      !reservationItemId ||
      !startAt ||
      !endAt ||
      !trimmedReserverName ||
      !trimmedPurpose ||
      createReservationMutation.isPending
    ) {
      return;
    }

    createReservationMutation.mutate({
      data: {
        itemId: Number(reservationItemId),
        startAt,
        endAt,
        reserverName: trimmedReserverName,
        purpose: trimmedPurpose,
        status: reservationStatus,
      },
    });
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

  const setReservationWindowFromAvailability = (resourceId: number) => {
    setReservationItemId(String(resourceId));
    setReservationStart(availabilityStart);
    setReservationEnd(availabilityEnd);
  };

  const updateReservationStatus = (id: number, status: ReservationStatus) => {
    updateReservationMutation.mutate({
      id,
      data: { status },
    });
  };

  return (
    <main className="min-h-screen bg-fv-bg px-4 py-10 text-fv-text">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-1 border-b border-fv-border pb-4">
          <h1 className="text-xl font-normal tracking-wide">Ressursstyring</h1>
          <p className="text-sm text-fv-text-muted">
            Administrer bookbare ressurser, planlegg tidsrom og opprett reservasjoner.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <form
            className="flex flex-col gap-3 border border-fv-border bg-fv-card p-4"
            onSubmit={handleCreate}
          >
            <div className="space-y-1">
              <h2 className="text-sm font-medium uppercase tracking-wider text-fv-text-muted">
                Ny ressurs
              </h2>
              <p className="text-sm text-fv-text-muted">
                Legg til rom, utstyr, kjøretøy eller andre bookbare ressurser.
              </p>
            </div>
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
                {RESOURCE_TYPES.map((resourceType) => (
                  <option key={resourceType} value={resourceType}>
                    {TYPE_LABELS[resourceType]}
                  </option>
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
            {createMutation.isError && (
              <p className="text-sm text-fv-red">
                Kunne ikke legge til ressursen: {createMutation.error.message}
              </p>
            )}
          </form>

          <form
            className="flex flex-col gap-3 border border-fv-border bg-fv-card p-4"
            onSubmit={handleCreateReservation}
          >
            <div className="space-y-1">
              <h2 className="text-sm font-medium uppercase tracking-wider text-fv-text-muted">
                Ny reservasjon
              </h2>
              <p className="text-sm text-fv-text-muted">
                Reservasjoner krever ressurs, tidsrom, navn og formål. Bare bekreftede reservasjoner blokkerer.
              </p>
            </div>
            <select
              value={reservationItemId}
              onChange={(e) => setReservationItemId(e.target.value)}
              className="border border-fv-border bg-fv-card px-3 py-2 text-sm text-fv-text outline-none focus:border-fv-green"
            >
              <option value="">Velg ressurs</option>
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.title} - {TYPE_LABELS[resource.type as (typeof RESOURCE_TYPES)[number]]}
                </option>
              ))}
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-fv-text-muted">
                Start
                <input
                  type="datetime-local"
                  value={reservationStart}
                  onChange={(e) => setReservationStart(e.target.value)}
                  className="border border-fv-border bg-fv-card px-3 py-2 text-sm text-fv-text outline-none focus:border-fv-green"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-fv-text-muted">
                Slutt
                <input
                  type="datetime-local"
                  value={reservationEnd}
                  onChange={(e) => setReservationEnd(e.target.value)}
                  className="border border-fv-border bg-fv-card px-3 py-2 text-sm text-fv-text outline-none focus:border-fv-green"
                />
              </label>
            </div>
            <input
              value={reserverName}
              onChange={(e) => setReserverName(e.target.value)}
              placeholder="Reserveres av"
              maxLength={120}
              className="border border-fv-border bg-fv-card px-3 py-2 text-sm text-fv-text outline-none focus:border-fv-green"
            />
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Formål"
              maxLength={500}
              rows={2}
              className="resize-none border border-fv-border bg-fv-card px-3 py-2 text-sm text-fv-text outline-none focus:border-fv-green"
            />
            <div className="flex gap-3">
              <select
                value={reservationStatus}
                onChange={(e) => setReservationStatus(e.target.value as ReservationStatus)}
                className="border border-fv-border bg-fv-card px-3 py-2 text-sm text-fv-text outline-none focus:border-fv-green"
              >
                {RESERVATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {RESERVATION_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={
                  !reservationItemId ||
                  !trimmedReserverName ||
                  !trimmedPurpose ||
                  createReservationMutation.isPending
                }
                className="flex-1 bg-fv-green px-4 py-2 text-sm font-medium text-white hover:bg-fv-green-mid disabled:cursor-not-allowed disabled:bg-fv-border"
              >
                {createReservationMutation.isPending ? "Lagrer..." : "Opprett reservasjon"}
              </button>
            </div>
            {createReservationMutation.isError && (
              <p className="text-sm text-fv-red">
                Kunne ikke opprette reservasjonen: {createReservationMutation.error.message}
              </p>
            )}
          </form>
        </div>

        {deleteMutation.isError && (
          <p className="text-sm text-fv-red">
            Kunne ikke fjerne ressursen: {deleteMutation.error.message}
          </p>
        )}

        <section className="border border-fv-border bg-fv-card p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1">
                <h2 className="text-sm font-medium uppercase tracking-wider text-fv-text-muted">
                  Tilgjengelighet og ressurser
                </h2>
                <p className="text-sm text-fv-text-muted">
                  Velg tidsrom for å se hvilke ressurser som er ledige basert på bekreftede reservasjoner.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-fv-text-muted">
                  Start
                  <input
                    type="datetime-local"
                    value={availabilityStart}
                    onChange={(e) => setAvailabilityStart(e.target.value)}
                    className="border border-fv-border bg-fv-card px-3 py-2 text-sm text-fv-text outline-none focus:border-fv-green"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-fv-text-muted">
                  Slutt
                  <input
                    type="datetime-local"
                    value={availabilityEnd}
                    onChange={(e) => setAvailabilityEnd(e.target.value)}
                    className="border border-fv-border bg-fv-card px-3 py-2 text-sm text-fv-text outline-none focus:border-fv-green"
                  />
                </label>
              </div>
            </div>

            {!availabilityWindowValid && (
              <p className="text-sm text-fv-red">
                Sluttidspunktet må være senere enn starttidspunktet for å beregne tilgjengelighet.
              </p>
            )}

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
                {RESOURCE_TYPES.map((resourceType) => (
                  <option key={resourceType} value={resourceType}>
                    {TYPE_LABELS[resourceType]}
                  </option>
                ))}
              </select>
            </div>

            {resourcesQuery.isPending && (
              <p className="text-sm text-fv-text-muted">Laster ressurser...</p>
            )}
            {resourcesQuery.isError && (
              <p className="text-sm text-fv-red">
                Kunne ikke laste ressurser: {resourcesQuery.error.message}
              </p>
            )}

            {!resourcesQuery.isPending && !resourcesQuery.isError && (
              resources.length > 0 ? (
                <ul className="divide-y divide-fv-border">
                  {resources.map((resource) => {
                    const isAvailable = availabilityWindowValid
                      ? !reservations.some(
                          (reservation) =>
                            reservation.itemId === resource.id &&
                            reservation.status === "Confirmed" &&
                            overlaps(reservation.startAt, reservation.endAt, scheduleStartIso, scheduleEndIso),
                        )
                      : true;

                    return (
                      <li key={resource.id} className="flex flex-col gap-3 py-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-fv-text">{resource.title}</span>
                            <span className="shrink-0 border border-fv-sage px-2 py-0.5 text-xs text-fv-green-mid">
                              {TYPE_LABELS[resource.type as (typeof RESOURCE_TYPES)[number]] ?? resource.type}
                            </span>
                            <span
                              className={`shrink-0 border px-2 py-0.5 text-xs ${
                                isAvailable
                                  ? "border-fv-green text-fv-green"
                                  : "border-fv-red text-fv-red"
                              }`}
                            >
                              {isAvailable ? "Ledig" : "Utilgjengelig"}
                            </span>
                          </div>
                          {resource.description && (
                            <p className="text-xs text-fv-text-muted">{resource.description}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setReservationWindowFromAvailability(resource.id)}
                            className="border border-fv-border px-3 py-1 text-sm text-fv-text hover:border-fv-green hover:text-fv-green"
                          >
                            Bruk i reservasjon
                          </button>
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
                            {deleteMutation.isPending && deletingId === resource.id ? "Fjerner..." : "Fjern"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-fv-text-muted">Ingen ressurser registrert.</p>
              )
            )}
          </div>
        </section>

        <section className="border border-fv-border bg-fv-card p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-sm font-medium uppercase tracking-wider text-fv-text-muted">
                  Reservasjoner
                </h2>
                <p className="text-sm text-fv-text-muted">
                  Filtrer oversikten og oppdater status etter hvert som reservasjonene behandles.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportReservations}
                disabled={reservationExportRows.length === 0}
                className="border border-fv-border bg-fv-card px-3 py-2 text-sm text-fv-text hover:border-fv-green hover:text-fv-green disabled:cursor-not-allowed disabled:border-fv-border disabled:text-fv-text-muted"
              >
                Eksporter CSV
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={reservationFilterItemId}
                onChange={(e) => setReservationFilterItemId(e.target.value)}
                className="border border-fv-border bg-fv-card px-3 py-2 text-sm text-fv-text outline-none focus:border-fv-green"
              >
                <option value="">Alle ressurser</option>
                {resources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.title}
                  </option>
                ))}
              </select>
              <select
                value={reservationFilterStatus}
                onChange={(e) => setReservationFilterStatus(e.target.value as ReservationStatus | "")}
                className="border border-fv-border bg-fv-card px-3 py-2 text-sm text-fv-text outline-none focus:border-fv-green"
              >
                <option value="">Alle statuser</option>
                {RESERVATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {RESERVATION_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>

            {reservationsQuery.isPending && (
              <p className="text-sm text-fv-text-muted">Laster reservasjoner...</p>
            )}
            {reservationsQuery.isError && (
              <p className="text-sm text-fv-red">
                Kunne ikke laste reservasjoner: {reservationsQuery.error.message}
              </p>
            )}
            {updateReservationMutation.isError && (
              <p className="text-sm text-fv-red">
                Kunne ikke oppdatere reservasjon: {updateReservationMutation.error.message}
              </p>
            )}

            {!reservationsQuery.isPending && !reservationsQuery.isError && (
              reservationsWithResources.length > 0 ? (
                <ul className="divide-y divide-fv-border">
                  {reservationsWithResources.map((reservation) => (
                    <li key={reservation.id} className="flex flex-col gap-3 py-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-fv-text">
                            {reservation.resource?.title ?? `Ressurs #${reservation.itemId}`}
                          </span>
                          <span className="border border-fv-border px-2 py-0.5 text-xs text-fv-text-muted">
                            {RESERVATION_STATUS_LABELS[
                              (reservation.status as (typeof RESERVATION_STATUSES)[number]) ?? "Draft"
                            ] ?? reservation.status}
                          </span>
                        </div>
                        <p className="text-sm text-fv-text-muted">
                          {formatDateTime(reservation.startAt)} - {formatDateTime(reservation.endAt)}
                        </p>
                        <p className="text-sm text-fv-text">
                          <span className="text-fv-text-muted">Reservert av:</span> {reservation.reserverName}
                        </p>
                        <p className="text-sm text-fv-text">
                          <span className="text-fv-text-muted">Formål:</span> {reservation.purpose}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {reservation.status === "Draft" && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateReservationStatus(reservation.id, ReservationStatus.Confirmed)}
                              disabled={updateReservationMutation.isPending}
                              className="border border-fv-border px-3 py-1 text-sm text-fv-text hover:border-fv-green hover:text-fv-green disabled:cursor-not-allowed disabled:text-fv-text-muted"
                            >
                              {updateReservationMutation.isPending && updatingReservationId === reservation.id
                                ? "Lagrer..."
                                : "Bekreft"}
                            </button>
                            <button
                              type="button"
                              onClick={() => updateReservationStatus(reservation.id, ReservationStatus.Cancelled)}
                              disabled={updateReservationMutation.isPending}
                              className="border border-fv-border px-3 py-1 text-sm text-fv-text hover:border-fv-red hover:text-fv-red disabled:cursor-not-allowed disabled:text-fv-text-muted"
                            >
                              Avbryt
                            </button>
                          </>
                        )}
                        {reservation.status === "Confirmed" && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateReservationStatus(reservation.id, ReservationStatus.Completed)}
                              disabled={updateReservationMutation.isPending}
                              className="border border-fv-border px-3 py-1 text-sm text-fv-text hover:border-fv-green hover:text-fv-green disabled:cursor-not-allowed disabled:text-fv-text-muted"
                            >
                              {updateReservationMutation.isPending && updatingReservationId === reservation.id
                                ? "Lagrer..."
                                : "Fullfør"}
                            </button>
                            <button
                              type="button"
                              onClick={() => updateReservationStatus(reservation.id, ReservationStatus.Cancelled)}
                              disabled={updateReservationMutation.isPending}
                              className="border border-fv-border px-3 py-1 text-sm text-fv-text hover:border-fv-red hover:text-fv-red disabled:cursor-not-allowed disabled:text-fv-text-muted"
                            >
                              Avbryt
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-fv-text-muted">Ingen reservasjoner matcher filtrene.</p>
              )
            )}
          </div>
        </section>

        {editingResource && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditingResource(null);
            }}
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
                  {RESOURCE_TYPES.map((resourceType) => (
                    <option key={resourceType} value={resourceType}>
                      {TYPE_LABELS[resourceType]}
                    </option>
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
      </div>
    </main>
  );
}
