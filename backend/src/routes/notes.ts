import Router from "@koa/router";
import { validate } from "../middleware/validate.js";
import {
  createNoteSchema,
  updateNoteSchema,
} from "../schemas/note.schema.js";
import * as noteService from "../services/note.service.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

// GET /customers/:customerId/notes
router.get("/customers/:customerId/notes", async (ctx) => {
  const notes = await noteService.listNotes(
    ctx.state.user.uid,
    ctx.params.customerId,
  );
  ctx.body = { data: notes };
});

// POST /customers/:customerId/notes
router.post(
  "/customers/:customerId/notes",
  validate(createNoteSchema, "body"),
  async (ctx) => {
    const note = await noteService.createNote(
      ctx.state.user.uid,
      ctx.params.customerId,
      ctx.request.body,
    );
    ctx.status = 201;
    ctx.body = { data: note };
  },
);

// GET /customers/:customerId/notes/:noteId
router.get("/customers/:customerId/notes/:noteId", async (ctx) => {
  const note = await noteService.getNote(
    ctx.state.user.uid,
    ctx.params.customerId,
    ctx.params.noteId,
  );
  ctx.body = { data: note };
});

// PUT /customers/:customerId/notes/:noteId
router.put(
  "/customers/:customerId/notes/:noteId",
  validate(updateNoteSchema, "body"),
  async (ctx) => {
    const note = await noteService.updateNote(
      ctx.state.user.uid,
      ctx.params.customerId,
      ctx.params.noteId,
      ctx.request.body,
    );
    ctx.body = { data: note };
  },
);

// DELETE /customers/:customerId/notes/:noteId
router.delete(
  "/customers/:customerId/notes/:noteId",
  async (ctx) => {
    await noteService.deleteNote(
      ctx.state.user.uid,
      ctx.params.customerId,
      ctx.params.noteId,
    );
    ctx.status = 204;
  },
);

export default router;
