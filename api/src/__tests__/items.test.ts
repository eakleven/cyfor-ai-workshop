import { describe, it, expect, vi, beforeEach } from 'vitest'
import { app } from '../app.js'

vi.mock('../db.js', () => ({
  prisma: {
    item: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    }
  }
}))

import { prisma } from '../db.js'

const mockItem = { id: 1, title: 'Room A', description: 'Big room', type: 'Room', createdAt: new Date('2024-01-01') }
const mockPrisma = vi.mocked(prisma)

beforeEach(() => vi.clearAllMocks())

describe('GET /items', () => {
  it('returns items with correct shape', async () => {
    mockPrisma.item.findMany.mockResolvedValue([mockItem])
    const res = await app.request('/items')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(1)
    expect(body.items[0]).toMatchObject({
      id: 1,
      title: 'Room A',
      type: 'Room',
      createdAt: '2024-01-01T00:00:00.000Z',
    })
  })

  it('returns empty list when no items exist', async () => {
    mockPrisma.item.findMany.mockResolvedValue([])
    const res = await app.request('/items')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([])
  })

  it('passes search param as OR filter to Prisma', async () => {
    mockPrisma.item.findMany.mockResolvedValue([])
    await app.request('/items?search=meeting')
    expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { title: { contains: 'meeting' } },
            { description: { contains: 'meeting' } },
          ],
        }),
      })
    )
  })

  it('passes type param as exact filter to Prisma', async () => {
    mockPrisma.item.findMany.mockResolvedValue([])
    await app.request('/items?type=Room')
    expect(mockPrisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'Room' }),
      })
    )
  })

  it('rejects unknown type value with 400', async () => {
    const res = await app.request('/items?type=Unknown')
    expect(res.status).toBe(400)
  })
})

describe('POST /items', () => {
  it('creates an item and returns 201', async () => {
    mockPrisma.item.create.mockResolvedValue(mockItem)
    const res = await app.request('/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Room A', description: 'Big room', type: 'Room' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.title).toBe('Room A')
  })

  it('rejects missing title with 400', async () => {
    const res = await app.request('/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'No title', type: 'Room' }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects empty title with 400', async () => {
    const res = await app.request('/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '   ', type: 'Room' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /items/:id', () => {
  it('deletes item and returns 204', async () => {
    mockPrisma.item.deleteMany.mockResolvedValue({ count: 1 })
    const res = await app.request('/items/1', { method: 'DELETE' })
    expect(res.status).toBe(204)
  })

  it('returns 400 for non-integer id', async () => {
    const res = await app.request('/items/abc', { method: 'DELETE' })
    expect(res.status).toBe(400)
  })
})

describe('PATCH /items/:id', () => {
  it('updates item and returns 200', async () => {
    mockPrisma.item.update.mockResolvedValue({ ...mockItem, title: 'Room B' })
    const res = await app.request('/items/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Room B' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.title).toBe('Room B')
  })

  it('returns 404 when item does not exist', async () => {
    const prismaNotFoundError = Object.assign(new Error('Not found'), { code: 'P2025' })
    mockPrisma.item.update.mockRejectedValue(prismaNotFoundError)
    const res = await app.request('/items/999', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Ghost' }),
    })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.message).toBe('Resource not found')
  })

  it('rejects empty body with 400', async () => {
    const res = await app.request('/items/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })
})
