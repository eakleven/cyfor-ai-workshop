import { beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../app.js'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    item: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn()
    },
    reservation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}))

vi.mock('../db.js', () => ({
  prisma: prismaMock
}))

const mockReservation = {
  id: 1,
  itemId: 2,
  startAt: new Date('2024-05-01T09:00:00.000Z'),
  endAt: new Date('2024-05-01T10:00:00.000Z'),
  reserverName: 'Ola Nordmann',
  purpose: 'Planleggingsmote',
  status: 'Draft',
  createdAt: new Date('2024-05-01T08:30:00.000Z')
}

beforeEach(() => vi.clearAllMocks())

describe('GET /reservations', () => {
  it('returns reservations with correct shape', async () => {
    prismaMock.reservation.findMany.mockResolvedValue([mockReservation])

    const res = await app.request('/reservations')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reservations).toEqual([
      expect.objectContaining({
        id: 1,
        itemId: 2,
        reserverName: 'Ola Nordmann',
        status: 'Draft',
        startAt: '2024-05-01T09:00:00.000Z',
        endAt: '2024-05-01T10:00:00.000Z'
      })
    ])
  })

  it('passes overlap window filters to Prisma', async () => {
    prismaMock.reservation.findMany.mockResolvedValue([])

    await app.request('/reservations?from=2024-05-01T09:00:00.000Z&to=2024-05-01T10:00:00.000Z')

    expect(prismaMock.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startAt: { lt: new Date('2024-05-01T10:00:00.000Z') },
          endAt: { gt: new Date('2024-05-01T09:00:00.000Z') }
        })
      })
    )
  })

  it('rejects a partial overlap filter window with 400', async () => {
    const res = await app.request('/reservations?from=2024-05-01T09:00:00.000Z')

    expect(res.status).toBe(400)
  })
})

describe('POST /reservations', () => {
  it('creates a confirmed reservation when the resource is available', async () => {
    prismaMock.item.findUnique.mockResolvedValue({ id: 2 })
    prismaMock.reservation.findFirst.mockResolvedValue(null)
    prismaMock.reservation.create.mockResolvedValue({ ...mockReservation, status: 'Confirmed' })

    const res = await app.request('/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: 2,
        startAt: '2024-05-01T09:00:00.000Z',
        endAt: '2024-05-01T10:00:00.000Z',
        reserverName: 'Ola Nordmann',
        purpose: 'Planleggingsmote',
        status: 'Confirmed'
      })
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.status).toBe('Confirmed')
  })

  it('allows overlapping drafts because they do not block availability', async () => {
    prismaMock.item.findUnique.mockResolvedValue({ id: 2 })
    prismaMock.reservation.create.mockResolvedValue(mockReservation)

    const res = await app.request('/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: 2,
        startAt: '2024-05-01T09:30:00.000Z',
        endAt: '2024-05-01T10:30:00.000Z',
        reserverName: 'Kari Nordmann',
        purpose: 'Reserve ved behov',
        status: 'Draft'
      })
    })

    expect(res.status).toBe(201)
    expect(prismaMock.reservation.findFirst).not.toHaveBeenCalled()
  })

  it('returns 404 when the resource does not exist', async () => {
    prismaMock.item.findUnique.mockResolvedValue(null)

    const res = await app.request('/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: 999,
        startAt: '2024-05-01T09:00:00.000Z',
        endAt: '2024-05-01T10:00:00.000Z',
        reserverName: 'Ola Nordmann',
        purpose: 'Planleggingsmote',
        status: 'Confirmed'
      })
    })

    expect(res.status).toBe(404)
  })

  it('returns 409 for overlapping confirmed reservations', async () => {
    prismaMock.item.findUnique.mockResolvedValue({ id: 2 })
    prismaMock.reservation.findFirst.mockResolvedValue({ id: 99 })

    const res = await app.request('/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: 2,
        startAt: '2024-05-01T09:30:00.000Z',
        endAt: '2024-05-01T10:30:00.000Z',
        reserverName: 'Ola Nordmann',
        purpose: 'Planleggingsmote',
        status: 'Confirmed'
      })
    })

    expect(res.status).toBe(409)
  })
})

describe('PATCH /reservations/:id', () => {
  it('updates a draft reservation to confirmed when no conflict exists', async () => {
    prismaMock.reservation.findUnique.mockResolvedValue(mockReservation)
    prismaMock.reservation.findFirst.mockResolvedValue(null)
    prismaMock.reservation.update.mockResolvedValue({ ...mockReservation, status: 'Confirmed' })

    const res = await app.request('/reservations/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Confirmed' })
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('Confirmed')
  })

  it('returns 404 when the reservation does not exist', async () => {
    prismaMock.reservation.findUnique.mockResolvedValue(null)

    const res = await app.request('/reservations/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Confirmed' })
    })

    expect(res.status).toBe(404)
  })

  it('returns 409 when confirming an overlapping reservation', async () => {
    prismaMock.reservation.findUnique.mockResolvedValue(mockReservation)
    prismaMock.reservation.findFirst.mockResolvedValue({ id: 55 })

    const res = await app.request('/reservations/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Confirmed' })
    })

    expect(res.status).toBe(409)
  })

  it('returns 400 when an update creates an invalid time range', async () => {
    prismaMock.reservation.findUnique.mockResolvedValue(mockReservation)

    const res = await app.request('/reservations/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startAt: '2024-05-01T11:00:00.000Z'
      })
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.message).toBe('End time must be later than start time')
  })
})
