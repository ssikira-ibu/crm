import Router from "@koa/router";
import { validate } from "../middleware/validate.js";
import {
  createNoteSchema,
  updateNoteSchema,
} from "@crm/shared";
import type { CreateNoteInput, UpdateNoteInput } from "@crm/shared";
import * as noteService from "../services/note.service.js";
import { getOrgContext } from "../lib/orgContext.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

// GET /companies/:companyId/notes
router.get("/companies/:companyId/notes", async (ctx) => {
  const notes = await noteService.listNotes(
    getOrgContext(ctx.state.user),
    ctx.params.companyId,
  );
  ctx.body = { data: notes };
});

// POST /companies/:companyId/notes
router.post(
  "/companies/:companyId/notes",
  validate(createNoteSchema, "body"),
  async (ctx) => {
    const note = await noteService.createNote(
      getOrgContext(ctx.state.user),
      ctx.params.companyId,
      ctx.state.body as CreateNoteInput,
    );
    ctx.status = 201;
    ctx.body = { data: note };
  },
);

// GET /companies/:companyId/notes/:noteId
router.get("/companies/:companyId/notes/:noteId", async (ctx) => {
  const note = await noteService.getNote(
    getOrgContext(ctx.state.user),
    ctx.params.companyId,
    ctx.params.noteId,
  );
  ctx.body = { data: note };
});

// PATCH /companies/:companyId/notes/:noteId
router.patch(
  "/companies/:companyId/notes/:noteId",
  validate(updateNoteSchema, "body"),
  async (ctx) => {
    const note = await noteService.updateNote(
      getOrgContext(ctx.state.user),
      ctx.params.companyId,
      ctx.params.noteId,
      ctx.state.body as UpdateNoteInput,
    );
    ctx.body = { data: note };
  },
);

// DELETE /companies/:companyId/notes/:noteId
router.delete(
  "/companies/:companyId/notes/:noteId",
  async (ctx) => {
    await noteService.deleteNote(
      getOrgContext(ctx.state.user),
      ctx.params.companyId,
      ctx.params.noteId,
    );
    ctx.status = 204;
  },
);

export default router;
