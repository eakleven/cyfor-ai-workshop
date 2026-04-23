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
          schema: z.object({ message: z.string() }).openapi('NotFound')
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
  const items = await prisma.item.findMany({
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

export type AppType = typeof app
