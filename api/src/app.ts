import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { prisma } from './db.js'

const RootResponseSchema = z.object({
  message: z.string(),
  openapi: z.string()
}).openapi('RootResponse')

const HealthResponseSchema = z.object({
  status: z.literal('ok')
}).openapi('HealthResponse')

const RESOURCE_TYPES = ['Room', 'Equipment', 'Vehicle', 'Other'] as const
const RESERVATION_STATUSES = ['Draft', 'Confirmed', 'Cancelled', 'Completed'] as const

const ItemSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  title: z.string().min(1).max(120).openapi({ example: 'Meeting Room A' }),
  description: z.string().max(500).openapi({ example: 'Seats 10, projector included' }),
  type: z.enum(RESOURCE_TYPES).openapi({ example: 'Room' }),
  createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' })
}).openapi('Item')

const ItemListResponseSchema = z.object({
  items: z.array(ItemSchema)
}).openapi('ItemListResponse')

const NotFoundResponseSchema = z.object({
  message: z.string()
}).openapi('NotFound')

const ConflictResponseSchema = z.object({
  message: z.string()
}).openapi('Conflict')

const BadRequestResponseSchema = z.object({
  message: z.string()
}).openapi('BadRequest')

const ListItemsQuerySchema = z.object({
  search: z.string().optional().openapi({
    param: { name: 'search', in: 'query' },
    example: 'Meeting Room'
  }),
  type: z.enum(RESOURCE_TYPES).optional().openapi({
    param: { name: 'type', in: 'query' },
    example: 'Room'
  })
}).openapi('ListItemsQuery')

const CreateItemSchema = z.object({
  title: z.string().trim().min(1).max(120).openapi({ example: 'Meeting Room A' }),
  description: z.string().trim().max(500).default('').openapi({ example: 'Seats 10, projector included' }),
  type: z.enum(RESOURCE_TYPES).default('Other').openapi({ example: 'Room' })
}).openapi('CreateItem')

const ItemParamsSchema = z.object({
  id: z.coerce.number().int().positive().openapi({
    param: {
      name: 'id',
      in: 'path'
    },
    example: 1
  })
}).openapi('ItemParams')

const ReservationStatusSchema = z.enum(RESERVATION_STATUSES).openapi('ReservationStatus')

const ReservationSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  itemId: z.number().int().positive().openapi({ example: 1 }),
  startAt: z.string().datetime().openapi({ example: '2024-01-01T09:00:00.000Z' }),
  endAt: z.string().datetime().openapi({ example: '2024-01-01T10:00:00.000Z' }),
  reserverName: z.string().min(1).max(120).openapi({ example: 'Ola Nordmann' }),
  purpose: z.string().min(1).max(500).openapi({ example: 'Planleggingsmote' }),
  status: ReservationStatusSchema.openapi({ example: 'Confirmed' }),
  createdAt: z.string().datetime().openapi({ example: '2024-01-01T08:30:00.000Z' })
}).openapi('Reservation')

const ReservationListResponseSchema = z.object({
  reservations: z.array(ReservationSchema)
}).openapi('ReservationListResponse')

const ListReservationsQuerySchema = z.object({
  itemId: z.coerce.number().int().positive().optional().openapi({
    param: { name: 'itemId', in: 'query' },
    example: 1
  }),
  status: ReservationStatusSchema.optional().openapi({
    param: { name: 'status', in: 'query' },
    example: 'Confirmed'
  }),
  from: z.string().datetime().optional().openapi({
    param: { name: 'from', in: 'query' },
    example: '2024-01-01T09:00:00.000Z'
  }),
  to: z.string().datetime().optional().openapi({
    param: { name: 'to', in: 'query' },
    example: '2024-01-01T10:00:00.000Z'
  })
}).superRefine((data, ctx) => {
  if ((data.from && !data.to) || (!data.from && data.to)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '`from` and `to` must be provided together',
      path: data.from ? ['to'] : ['from']
    })
  }

  if (data.from && data.to && new Date(data.to) <= new Date(data.from)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '`to` must be later than `from`',
      path: ['to']
    })
  }
}).openapi('ListReservationsQuery')

const CreateReservationSchema = z.object({
  itemId: z.number().int().positive().openapi({ example: 1 }),
  startAt: z.string().datetime().openapi({ example: '2024-01-01T09:00:00.000Z' }),
  endAt: z.string().datetime().openapi({ example: '2024-01-01T10:00:00.000Z' }),
  reserverName: z.string().trim().min(1).max(120).openapi({ example: 'Ola Nordmann' }),
  purpose: z.string().trim().min(1).max(500).openapi({ example: 'Planleggingsmote' }),
  status: ReservationStatusSchema.default('Draft').openapi({ example: 'Draft' })
}).superRefine((data, ctx) => {
  if (new Date(data.endAt) <= new Date(data.startAt)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End time must be later than start time',
      path: ['endAt']
    })
  }
}).openapi('CreateReservation')

const UpdateReservationSchema = z.object({
  itemId: z.number().int().positive().optional().openapi({ example: 1 }),
  startAt: z.string().datetime().optional().openapi({ example: '2024-01-01T09:00:00.000Z' }),
  endAt: z.string().datetime().optional().openapi({ example: '2024-01-01T10:00:00.000Z' }),
  reserverName: z.string().trim().min(1).max(120).optional().openapi({ example: 'Ola Nordmann' }),
  purpose: z.string().trim().min(1).max(500).optional().openapi({ example: 'Planleggingsmote' }),
  status: ReservationStatusSchema.optional().openapi({ example: 'Confirmed' })
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' }
).openapi('UpdateReservation')

const rootRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['System'],
  responses: {
    200: {
      description: 'Basic API information',
      content: {
        'application/json': {
          schema: RootResponseSchema
        }
      }
    }
  }
})

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['System'],
  responses: {
    200: {
      description: 'Health check',
      content: {
        'application/json': {
          schema: HealthResponseSchema
        }
      }
    }
  }
})

const listItemsRoute = createRoute({
  method: 'get',
  path: '/items',
  tags: ['Items'],
  request: {
    query: ListItemsQuerySchema
  },
  responses: {
    200: {
      description: 'List persisted items',
      content: {
        'application/json': {
          schema: ItemListResponseSchema
        }
      }
    }
  }
})

const createItemRoute = createRoute({
  method: 'post',
  path: '/items',
  tags: ['Items'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: CreateItemSchema
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Create a persisted item',
      content: {
        'application/json': {
          schema: ItemSchema
        }
      }
    }
  }
})

const deleteItemRoute = createRoute({
  method: 'delete',
  path: '/items/{id}',
  tags: ['Items'],
  request: {
    params: ItemParamsSchema
  },
  responses: {
    204: {
      description: 'Remove a persisted item'
    }
  }
})

const UpdateItemSchema = z.object({
  title: z.string().trim().min(1).max(120).optional().openapi({ example: 'Meeting Room A' }),
  description: z.string().trim().max(500).optional().openapi({ example: 'Seats 10, projector included' }),
  type: z.enum(RESOURCE_TYPES).optional().openapi({ example: 'Room' })
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' }
).openapi('UpdateItem')

const listReservationsRoute = createRoute({
  method: 'get',
  path: '/reservations',
  tags: ['Reservations'],
  request: {
    query: ListReservationsQuerySchema
  },
  responses: {
    200: {
      description: 'List persisted reservations',
      content: {
        'application/json': {
          schema: ReservationListResponseSchema
        }
      }
    }
  }
})

const createReservationRoute = createRoute({
  method: 'post',
  path: '/reservations',
  tags: ['Reservations'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: CreateReservationSchema
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Create a reservation',
      content: {
        'application/json': {
          schema: ReservationSchema
        }
      }
    },
    404: {
      description: 'Resource not found',
      content: {
        'application/json': {
          schema: NotFoundResponseSchema
        }
      }
    },
    409: {
      description: 'Reservation conflict',
      content: {
        'application/json': {
          schema: ConflictResponseSchema
        }
      }
    }
  }
})

const ReservationParamsSchema = z.object({
  id: z.coerce.number().int().positive().openapi({
    param: {
      name: 'id',
      in: 'path'
    },
    example: 1
  })
}).openapi('ReservationParams')

const updateReservationRoute = createRoute({
  method: 'patch',
  path: '/reservations/{id}',
  tags: ['Reservations'],
  request: {
    params: ReservationParamsSchema,
    body: {
      required: true,
      content: {
        'application/json': {
          schema: UpdateReservationSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Update a reservation',
      content: {
        'application/json': {
          schema: ReservationSchema
        }
      }
    },
    400: {
      description: 'Invalid reservation data',
      content: {
        'application/json': {
          schema: BadRequestResponseSchema
        }
      }
    },
    404: {
      description: 'Reservation not found',
      content: {
        'application/json': {
          schema: NotFoundResponseSchema
        }
      }
    },
    409: {
      description: 'Reservation conflict',
      content: {
        'application/json': {
          schema: ConflictResponseSchema
        }
      }
    }
  }
})

const updateItemRoute = createRoute({
  method: 'patch',
  path: '/items/{id}',
  tags: ['Items'],
  request: {
    params: ItemParamsSchema,
    body: {
      required: true,
      content: {
        'application/json': {
          schema: UpdateItemSchema
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Update a persisted resource',
      content: {
        'application/json': {
          schema: ItemSchema
        }
      }
    },
    404: {
      description: 'Resource not found',
      content: {
        'application/json': {
          schema: NotFoundResponseSchema
        }
      }
    }
  }
})

const toItemResponse = (item: { id: number; title: string; description: string; type: string; createdAt: Date }) => ({
  id: item.id,
  title: item.title,
  description: item.description,
  type: item.type as typeof RESOURCE_TYPES[number],
  createdAt: item.createdAt.toISOString()
})

const toReservationResponse = (reservation: {
  id: number
  itemId: number
  startAt: Date
  endAt: Date
  reserverName: string
  purpose: string
  status: string
  createdAt: Date
}) => ({
  id: reservation.id,
  itemId: reservation.itemId,
  startAt: reservation.startAt.toISOString(),
  endAt: reservation.endAt.toISOString(),
  reserverName: reservation.reserverName,
  purpose: reservation.purpose,
  status: reservation.status as typeof RESERVATION_STATUSES[number],
  createdAt: reservation.createdAt.toISOString()
})

const hasConfirmedReservationOverlap = async ({
  itemId,
  startAt,
  endAt,
  excludeId
}: {
  itemId: number
  startAt: Date
  endAt: Date
  excludeId?: number
}) => {
  const overlappingReservation = await prisma.reservation.findFirst({
    where: {
      itemId,
      status: 'Confirmed',
      ...(excludeId ? { id: { not: excludeId } } : {}),
      startAt: { lt: endAt },
      endAt: { gt: startAt }
    },
    select: { id: true }
  })

  return Boolean(overlappingReservation)
}

const defaultCorsOrigins = ['http://localhost:4173', 'http://localhost:5173']
const configuredCorsOrigins = process.env.CORS_ORIGIN
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const openApiDocumentConfig = {
  openapi: '3.0.0',
  info: {
    title: 'Cyfor Workshop API',
    version: '1.0.0',
    description: 'Workshop starter API built with Hono, Prisma, and SQLite.'
  }
}

export const app = new OpenAPIHono()

app.use('*', cors({
  origin: configuredCorsOrigins?.length ? configuredCorsOrigins : defaultCorsOrigins
}))

app.doc('/openapi.json', openApiDocumentConfig)

app.openapi(rootRoute, (c) => {
  return c.json({
    message: 'Cyfor workshop API',
    openapi: '/openapi.json'
  }, 200)
})

app.openapi(healthRoute, (c) => {
  return c.json({
    status: 'ok'
  }, 200)
})

app.openapi(listItemsRoute, async (c) => {
  const { search, type } = c.req.valid('query')

  const items = await prisma.item.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search } },
          { description: { contains: search } }
        ]
      } : {})
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return c.json({
    items: items.map(toItemResponse)
  }, 200)
})

app.openapi(createItemRoute, async (c) => {
  const { title, description, type } = c.req.valid('json')
  const item = await prisma.item.create({
    data: { title, description, type }
  })

  return c.json(toItemResponse(item), 201)
})

app.openapi(deleteItemRoute, async (c) => {
  const { id } = c.req.valid('param')

  await prisma.item.deleteMany({
    where: {
      id
    }
  })

  return c.body(null, 204)
})

app.openapi(updateItemRoute, async (c) => {
  const { id } = c.req.valid('param')
  const data = c.req.valid('json')

  try {
    const item = await prisma.item.update({
      where: { id },
      data
    })
    return c.json(toItemResponse(item), 200)
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2025') {
      return c.json({ message: 'Resource not found' }, 404)
    }
    throw e
  }
})

app.openapi(listReservationsRoute, async (c) => {
  const { itemId, status, from, to } = c.req.valid('query')

  const reservations = await prisma.reservation.findMany({
    where: {
      ...(itemId ? { itemId } : {}),
      ...(status ? { status } : {}),
      ...(from && to ? {
        startAt: { lt: new Date(to) },
        endAt: { gt: new Date(from) }
      } : {})
    },
    orderBy: [
      { startAt: 'asc' },
      { createdAt: 'desc' }
    ]
  })

  return c.json({
    reservations: reservations.map(toReservationResponse)
  }, 200)
})

app.openapi(createReservationRoute, async (c) => {
  const { itemId, startAt, endAt, reserverName, purpose, status } = c.req.valid('json')
  const resource = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true }
  })

  if (!resource) {
    return c.json({ message: 'Resource not found' }, 404)
  }

  const startDate = new Date(startAt)
  const endDate = new Date(endAt)

  if (status === 'Confirmed' && await hasConfirmedReservationOverlap({
    itemId,
    startAt: startDate,
    endAt: endDate
  })) {
    return c.json({
      message: 'Resource already has a confirmed reservation in the selected time window'
    }, 409)
  }

  const reservation = await prisma.reservation.create({
    data: {
      itemId,
      startAt: startDate,
      endAt: endDate,
      reserverName,
      purpose,
      status
    }
  })

  return c.json(toReservationResponse(reservation), 201)
})

app.openapi(updateReservationRoute, async (c) => {
  const { id } = c.req.valid('param')
  const data = c.req.valid('json')

  const existingReservation = await prisma.reservation.findUnique({
    where: { id }
  })

  if (!existingReservation) {
    return c.json({ message: 'Reservation not found' }, 404)
  }

  const nextItemId = data.itemId ?? existingReservation.itemId
  const nextStartAt = data.startAt ? new Date(data.startAt) : existingReservation.startAt
  const nextEndAt = data.endAt ? new Date(data.endAt) : existingReservation.endAt
  const nextStatus = data.status ?? existingReservation.status

  if (nextEndAt <= nextStartAt) {
    return c.json({ message: 'End time must be later than start time' }, 400)
  }

  if (data.itemId !== undefined) {
    const resource = await prisma.item.findUnique({
      where: { id: data.itemId },
      select: { id: true }
    })

    if (!resource) {
      return c.json({ message: 'Resource not found' }, 404)
    }
  }

  if (nextStatus === 'Confirmed' && await hasConfirmedReservationOverlap({
    itemId: nextItemId,
    startAt: nextStartAt,
    endAt: nextEndAt,
    excludeId: id
  })) {
    return c.json({
      message: 'Resource already has a confirmed reservation in the selected time window'
    }, 409)
  }

  const updatedReservation = await prisma.reservation.update({
    where: { id },
    data: {
      ...(data.itemId !== undefined ? { itemId: data.itemId } : {}),
      ...(data.startAt !== undefined ? { startAt: nextStartAt } : {}),
      ...(data.endAt !== undefined ? { endAt: nextEndAt } : {}),
      ...(data.reserverName !== undefined ? { reserverName: data.reserverName } : {}),
      ...(data.purpose !== undefined ? { purpose: data.purpose } : {}),
      ...(data.status !== undefined ? { status: data.status } : {})
    }
  })

  return c.json(toReservationResponse(updatedReservation), 200)
})

export type AppType = typeof app
