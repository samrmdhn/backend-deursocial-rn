# Chat API Response Documentation

> **Architecture**: Backend → Supabase (no local Sequelize models).
> All CRUD operations hit Supabase directly via `@supabase/supabase-js`.
> Realtime features (message subscriptions, typing, reactions, read receipts) remain in the **frontend** using Supabase Realtime.

## Base URL

```
{{BASE_URL}}/api/chat
```

## Authentication

All endpoints require:
- `x-api-key` header
- `Authorization: Bearer <token>` header

---

## 1. Link Preview

**`POST /api/chat/link-preview`**

Fetches Open Graph metadata from a URL. Can accept either a direct URL or a text string (the first URL found will be used).

### Request

```json
{
  "url": "https://github.com/supabase/supabase"
}
```

or:

```json
{
  "text": "Check out https://github.com/supabase/supabase for more info"
}
```

### Response — Success

```json
{
  "data": {
    "link_url": "https://github.com/supabase/supabase",
    "link_title": "supabase/supabase: The open source Firebase alternative.",
    "link_description": "Supabase is an open source Firebase alternative. Start your project with a Postgres database, Authentication, instant APIs, Edge Functions, Realtime subscriptions, Storage, and Vector embeddings.",
    "link_image": "https://opengraph.githubassets.com/supabase/supabase"
  },
  "meta": null,
  "status": {
    "code": 0,
    "message_client": "Link preview fetched"
  }
}
```

### Response — No preview available

```json
{
  "data": null,
  "meta": null,
  "status": {
    "code": 2,
    "message_client": "Could not fetch preview"
  }
}
```

---

## 2. Latest Message Per Group

**`POST /api/chat/messages/latest-per-group`**

Returns the latest message for each group slug. Used on the messages list screen.

### Request

```json
{
  "group_slugs": ["group-slug-1", "group-slug-2", "dm_alice_bob"]
}
```

### Response

```json
{
  "data": {
    "group-slug-1": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "group_slug": "group-slug-1",
      "user_id": "123",
      "display_name": "John Doe",
      "username": "johndoe",
      "user_image": "https://example.com/avatar.jpg",
      "message": "Hey everyone! See you at the event 🎉",
      "message_type": "text",
      "image_url": null,
      "reply_to": null,
      "is_pinned": false,
      "pinned_by": null,
      "deleted_at": null,
      "deleted_by": null,
      "link_url": null,
      "link_title": null,
      "link_description": null,
      "link_image": null,
      "latitude": null,
      "longitude": null,
      "location_name": null,
      "created_at": "2025-01-15T10:30:00.000Z"
    },
    "dm_alice_bob": {
      "id": "f9e8d7c6-b5a4-3210-fedc-ba0987654321",
      "group_slug": "dm_alice_bob",
      "user_id": "456",
      "display_name": "Alice",
      "username": "alice",
      "user_image": null,
      "message": "See you tomorrow!",
      "message_type": "text",
      "image_url": null,
      "reply_to": null,
      "is_pinned": false,
      "pinned_by": null,
      "deleted_at": null,
      "deleted_by": null,
      "link_url": null,
      "link_title": null,
      "link_description": null,
      "link_image": null,
      "latitude": null,
      "longitude": null,
      "location_name": null,
      "created_at": "2025-01-15T09:15:00.000Z"
    }
  },
  "meta": {
    "count": 2
  },
  "status": {
    "code": 0,
    "message_client": "Latest messages per group"
  }
}
```

---

## 3. Unread Counts Per Group

**`POST /api/chat/messages/unread-counts`**

Returns unread message counts for each group, respecting the user's join date.

### Request

```json
{
  "group_slugs": ["group-slug-1", "group-slug-2"],
  "user_id": "123"
}
```

### Response

```json
{
  "data": {
    "group-slug-1": 5,
    "group-slug-2": 0
  },
  "meta": null,
  "status": {
    "code": 0,
    "message_client": "Unread counts retrieved"
  }
}
```

---

## 4. Get or Create DM Conversation

**`POST /api/chat/conversations/get-or-create`**

Creates a conversation record between two users, or returns the existing one. Uses deterministic slug (`dm_<sorted_user1>_<sorted_user2>`).

### Request

```json
{
  "current_username": "alice",
  "other_username": "bob",
  "current_user_id": "123",
  "other_user_id": "456"
}
```

### Response — Existing

```json
{
  "data": {
    "id": "conv-uuid-here",
    "user1_id": "123",
    "user2_id": "456",
    "slug": "dm_alice_bob",
    "created_at": "2025-01-10T08:00:00.000Z",
    "updated_at": "2025-01-15T10:30:00.000Z"
  },
  "meta": null,
  "status": {
    "code": 0,
    "message_client": "Conversation found"
  }
}
```

### Response — Created

```json
{
  "data": {
    "id": "new-conv-uuid",
    "user1_id": "123",
    "user2_id": "456",
    "slug": "dm_alice_bob",
    "created_at": "2025-01-15T12:00:00.000Z",
    "updated_at": "2025-01-15T12:00:00.000Z"
  },
  "meta": null,
  "status": {
    "code": 0,
    "message_client": "Conversation created"
  }
}
```

---

## 5. Get User Conversations (DM List)

**`GET /api/chat/conversations/:username/:userId`**

Fetches all DM conversations for a user with last message and unread count. This is the heavy query offloaded from the client.

### Request

```
GET /api/chat/conversations/alice/123
```

### Response

```json
{
  "data": [
    {
      "conversation": {
        "slug": "dm_alice_bob",
        "created_at": "2025-01-15T09:15:00.000Z"
      },
      "otherUser": {
        "user_id": "456",
        "display_name": "Bob",
        "username": "bob",
        "user_image": "https://example.com/bob.jpg"
      },
      "lastMessage": {
        "id": "msg-uuid",
        "group_slug": "dm_alice_bob",
        "user_id": "456",
        "display_name": "Bob",
        "username": "bob",
        "user_image": "https://example.com/bob.jpg",
        "message": "See you tomorrow!",
        "message_type": "text",
        "image_url": null,
        "created_at": "2025-01-15T09:15:00.000Z"
      },
      "unreadCount": 3
    },
    {
      "conversation": {
        "slug": "dm_alice_charlie",
        "created_at": "2025-01-14T16:00:00.000Z"
      },
      "otherUser": {
        "user_id": "789",
        "display_name": "Charlie",
        "username": "charlie",
        "user_image": null
      },
      "lastMessage": {
        "id": "msg-uuid-2",
        "group_slug": "dm_alice_charlie",
        "user_id": "123",
        "display_name": "Alice",
        "username": "alice",
        "user_image": null,
        "message": "📷 Photo",
        "message_type": "image",
        "image_url": "https://storage.supabase.co/chat-images/dm_alice_charlie/photo.jpg",
        "created_at": "2025-01-14T16:00:00.000Z"
      },
      "unreadCount": 0
    }
  ],
  "meta": {
    "count": 2
  },
  "status": {
    "code": 0,
    "message_client": "Conversations retrieved"
  }
}
```

---

## 6. Get Meeting Point

**`GET /api/chat/meeting-point/:groupSlug`**

### Request

```
GET /api/chat/meeting-point/group-slug-1
```

### Response — Found

```json
{
  "data": {
    "id": "mp-uuid",
    "group_slug": "group-slug-1",
    "name": "Gedung Sate",
    "notes": "Meet at the main entrance, north side",
    "latitude": -6.9025,
    "longitude": 107.6187,
    "set_by": "John Doe",
    "set_by_user_id": "123",
    "created_at": "2025-01-15T08:00:00.000Z",
    "updated_at": "2025-01-15T10:00:00.000Z"
  },
  "meta": null,
  "status": {
    "code": 0,
    "message_client": "Meeting point retrieved"
  }
}
```

### Response — Not Set

```json
{
  "data": null,
  "meta": null,
  "status": {
    "code": 2,
    "message_client": "No meeting point set"
  }
}
```

---

## 7. Set Meeting Point

**`POST /api/chat/meeting-point`**

Creates or updates a meeting point for a group (upserts on `group_slug`).

### Request

```json
{
  "group_slug": "group-slug-1",
  "name": "Gedung Sate",
  "notes": "Meet at the main entrance, north side",
  "latitude": -6.9025,
  "longitude": 107.6187,
  "set_by": "John Doe",
  "set_by_user_id": "123"
}
```

### Response

```json
{
  "data": {
    "id": "mp-uuid",
    "group_slug": "group-slug-1",
    "name": "Gedung Sate",
    "notes": "Meet at the main entrance, north side",
    "latitude": -6.9025,
    "longitude": 107.6187,
    "set_by": "John Doe",
    "set_by_user_id": "123",
    "created_at": "2025-01-15T08:00:00.000Z",
    "updated_at": "2025-01-15T12:00:00.000Z"
  },
  "meta": null,
  "status": {
    "code": 0,
    "message_client": "Meeting point saved successfully"
  }
}
```

---

## 8. Get Group Media Gallery

**`GET /api/chat/media/:groupSlug`**

Fetches media (images, locations) shared in a group with pagination.

### Request

```
GET /api/chat/media/group-slug-1?page=0&limit=30
```

### Response

```json
{
  "data": [
    {
      "id": "media-uuid-1",
      "group_slug": "group-slug-1",
      "message_id": "msg-uuid-1",
      "user_id": "123",
      "display_name": "John Doe",
      "media_url": "https://jbcdjttfaxwendlfpgjk.supabase.co/storage/v1/object/public/chat-images/group-slug-1/photo1.jpg",
      "media_type": "image",
      "latitude": null,
      "longitude": null,
      "location_name": null,
      "created_at": "2025-01-15T10:00:00.000Z"
    },
    {
      "id": "media-uuid-2",
      "group_slug": "group-slug-1",
      "message_id": "msg-uuid-2",
      "user_id": "456",
      "display_name": "Jane Smith",
      "media_url": "https://maps.googleapis.com/maps/api/staticmap?center=-6.9,107.6&zoom=15&size=400x200",
      "media_type": "location",
      "latitude": -6.9,
      "longitude": 107.6,
      "location_name": "Gedung Sate",
      "created_at": "2025-01-14T15:00:00.000Z"
    }
  ],
  "meta": {
    "count": 2,
    "page": 0,
    "has_more": false
  },
  "status": {
    "code": 0,
    "message_client": "Group media retrieved"
  }
}
```

---

## 9. Get User Join Date

**`GET /api/chat/user-groups/:userId/:groupSlug/join-date`**

Returns the timestamp when a user joined a specific group. Returns the latest join date for rejoin scenarios.

### Request

```
GET /api/chat/user-groups/123/group-slug-1/join-date
```

### Response — Found

```json
{
  "data": {
    "joined_at": "2025-01-10T14:00:00.000Z"
  },
  "meta": null,
  "status": {
    "code": 0,
    "message_client": "Join date retrieved"
  }
}
```

### Response — Not Found

```json
{
  "data": null,
  "meta": null,
  "status": {
    "code": 2,
    "message_client": "User not found in group"
  }
}
```

---

## Architecture Summary

| What | Where | Why |
|------|-------|-----|
| Message send/receive (text, image, location) | **Frontend → Supabase** | Supabase Realtime handles instant delivery |
| Typing indicators | **Frontend → Supabase** | Realtime presence/postgres_changes |
| Read receipts (mark + subscribe) | **Frontend → Supabase** | Realtime postgres_changes on message_reads |
| Reactions (toggle + subscribe) | **Frontend → Supabase** | Realtime postgres_changes on message_reactions |
| Pin/unpin messages | **Frontend → Supabase** | Realtime postgres_changes on UPDATE |
| Delete messages | **Frontend → Supabase** | Realtime postgres_changes on UPDATE |
| **Latest message per group** | **Backend → Supabase** | Heavy query, N+1 for each group |
| **Unread counts per group** | **Backend → Supabase** | Heavy query with join date logic |
| **DM conversations list** | **Backend → Supabase** | Heavy query, cross-table joins |
| **Link preview** | **Backend → Supabase** | Server-side fetch (CORS-free) |
| **Meeting point CRUD** | **Backend → Supabase** | Simple but benefits from auth validation |
| **Media gallery** | **Backend → Supabase** | Paginated heavy query |
| **User join date** | **Backend → Supabase** | Simple lookup for chat history cutoff |
| **Get/create conversation** | **Backend → Supabase** | Needs upsert logic |

## Environment Variables

Add to your `.env` file:

```env
SUPABASE_URL=https://jbcdjttfaxwendlfpgjk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
# OR use anon key (less privileged):
SUPABASE_ANON_KEY=your-anon-key-here
```

> **Recommended**: Use `SUPABASE_SERVICE_ROLE_KEY` on the backend to bypass RLS policies. The backend already has its own auth (`verifyToken` middleware) so RLS is redundant here.
