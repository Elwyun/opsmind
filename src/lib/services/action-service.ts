import { NotFoundError } from "../api/http-error";
import { prisma } from "../db";
import { Prisma } from "../../generated/prisma/client";
import { ActionStatus } from "../../generated/prisma/enums";
import { serializeAction, type ActionDto } from "../serializers";

export interface CreateActionInput {
  investigationId: string;
  title: string;
  description?: string;
  ownerName?: string;
}

export async function createAction(input: CreateActionInput): Promise<ActionDto> {
  const investigation = await prisma.investigation.findUnique({
    where: { id: input.investigationId },
  });
  if (!investigation) throw new NotFoundError("Investigation", input.investigationId);

  const row = await prisma.actionItem.create({
    data: {
      investigationId: input.investigationId,
      title: input.title,
      description: input.description ?? null,
      ownerName: input.ownerName ?? null,
      status: ActionStatus.OPEN,
    },
  });

  return serializeAction(row);
}

export interface UpdateActionInput {
  id: string;
  status?: ActionStatus;
  title?: string;
  description?: string | null;
  ownerName?: string | null;
  completionNote?: string | null;
}

/**
 * Updates an action. Status timestamps are managed here so the UI never has to
 * send them: starting stamps `startedAt`, completing stamps `completedAt`.
 */
export async function updateAction(input: UpdateActionInput): Promise<ActionDto> {
  const existing = await prisma.actionItem.findUnique({ where: { id: input.id } });
  if (!existing) throw new NotFoundError("Action item", input.id);

  const data: Prisma.ActionItemUpdateInput = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.ownerName !== undefined) data.ownerName = input.ownerName;
  if (input.completionNote !== undefined) data.completionNote = input.completionNote;

  if (input.status !== undefined) {
    data.status = input.status;

    if (input.status === ActionStatus.IN_PROGRESS) {
      data.startedAt = existing.startedAt ?? new Date();
    }
    if (input.status === ActionStatus.COMPLETED) {
      data.startedAt = existing.startedAt ?? new Date();
      data.completedAt = existing.completedAt ?? new Date();
    }
    if (input.status === ActionStatus.OPEN) {
      data.startedAt = null;
      data.completedAt = null;
    }
  }

  if (input.status === undefined && input.completionNote) {
    // A completion note without an explicit status still marks the action done.
    data.status = ActionStatus.COMPLETED;
    data.startedAt = existing.startedAt ?? new Date();
    data.completedAt = existing.completedAt ?? new Date();
  }

  const row = await prisma.actionItem.update({ where: { id: input.id }, data });
  return serializeAction(row);
}

export interface ActionListQuery {
  companyId?: string;
  status?: ActionStatus;
  limit?: number;
}

export async function listActions(query: ActionListQuery = {}): Promise<ActionDto[]> {
  const rows = await prisma.actionItem.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.companyId ? { investigation: { companyId: query.companyId } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: query.limit ?? 50,
  });
  return rows.map(serializeAction);
}

export async function getActionsForInvestigation(investigationId: string): Promise<ActionDto[]> {
  const rows = await prisma.actionItem.findMany({
    where: { investigationId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(serializeAction);
}

export async function getActionById(id: string): Promise<ActionDto> {
  const row = await prisma.actionItem.findUnique({ where: { id } });
  if (!row) throw new NotFoundError("Action item", id);
  return serializeAction(row);
}
