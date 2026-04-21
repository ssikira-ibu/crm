import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { makeOrgContext, makePrismaMock } from "../test-helpers.ts";

const prismaMock = makePrismaMock();
const recordEventMock = mock.fn(() => Promise.resolve());

mock.module("../lib/prisma.js", { namedExports: { prisma: prismaMock } });
mock.module("./event.service.js", { namedExports: { recordEvent: recordEventMock } });
mock.module("./customer.service.js", {
  namedExports: {
    ensureCustomerAccess: mock.fn(() => Promise.resolve()),
  },
});

const { listContacts, getContact, createContact, updateContact, deleteContact } =
  await import("./contact.service.ts");

describe("contact.service", () => {
  beforeEach(() => {
    prismaMock.contact.findMany = mock.fn(() => Promise.resolve([]));
    prismaMock.contact.findFirst = mock.fn(() => Promise.resolve(null));
    prismaMock.contact.create = mock.fn(() => Promise.resolve({}));
    prismaMock.contact.update = mock.fn(() => Promise.resolve({}));
    prismaMock.contact.delete = mock.fn(() => Promise.resolve({}));
    recordEventMock.mock.resetCalls();
  });

  describe("listContacts", () => {
    it("returns contacts for a customer", async () => {
      const contacts = [{ id: "ct1", firstName: "Jane", lastName: "Doe", phoneNumbers: [] }];
      prismaMock.contact.findMany = mock.fn(() => Promise.resolve(contacts));

      const result = await listContacts(makeOrgContext(), "cust-1");
      assert.deepEqual(result, contacts);
    });

    it("scopes query to customerId", async () => {
      prismaMock.contact.findMany = mock.fn(() => Promise.resolve([]));

      await listContacts(makeOrgContext(), "cust-1");

      const call = (prismaMock.contact.findMany as ReturnType<typeof mock.fn>).mock.calls[0];
      assert.equal(call.arguments[0].where.customerId, "cust-1");
    });
  });

  describe("getContact", () => {
    it("returns contact when found", async () => {
      const contact = { id: "ct1", firstName: "Jane", lastName: "Doe", customerId: "cust-1", phoneNumbers: [] };
      prismaMock.contact.findFirst = mock.fn(() => Promise.resolve(contact));

      const result = await getContact(makeOrgContext(), "cust-1", "ct1");
      assert.equal(result, contact);
    });

    it("throws 404 when not found", async () => {
      prismaMock.contact.findFirst = mock.fn(() => Promise.resolve(null));

      await assert.rejects(
        () => getContact(makeOrgContext(), "cust-1", "bad"),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          assert.equal(err.code, "CONTACT_NOT_FOUND");
          return true;
        },
      );
    });
  });

  describe("createContact", () => {
    it("creates contact and records event", async () => {
      const contact = { id: "ct1", firstName: "Jane", lastName: "Doe", email: "jane@example.com", phoneNumbers: [] };
      prismaMock.contact.create = mock.fn(() => Promise.resolve(contact));

      const result = await createContact(makeOrgContext(), "cust-1", {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
      } as any);

      assert.equal(result, contact);
      assert.equal(recordEventMock.mock.callCount(), 1);
      const event = recordEventMock.mock.calls[0].arguments[0];
      assert.equal(event.action, "CREATED");
      assert.equal(event.entityType, "CONTACT");
      assert.equal(event.metadata.name, "Jane Doe");
    });
  });

  describe("updateContact", () => {
    it("throws 404 when contact not found", async () => {
      prismaMock.contact.findFirst = mock.fn(() => Promise.resolve(null));

      await assert.rejects(
        () => updateContact(makeOrgContext(), "cust-1", "bad", { firstName: "X" } as any),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });

    it("updates and returns the contact", async () => {
      const existing = { id: "ct1", firstName: "Jane", lastName: "Doe", customerId: "cust-1" };
      const updated = { ...existing, firstName: "Janet", phoneNumbers: [] };
      prismaMock.contact.findFirst = mock.fn(() => Promise.resolve(existing));
      prismaMock.contact.update = mock.fn(() => Promise.resolve(updated));

      const result = await updateContact(makeOrgContext(), "cust-1", "ct1", { firstName: "Janet" } as any);
      assert.equal(result.firstName, "Janet");
    });
  });

  describe("deleteContact", () => {
    it("throws 404 when contact not found", async () => {
      prismaMock.contact.findFirst = mock.fn(() => Promise.resolve(null));

      await assert.rejects(
        () => deleteContact(makeOrgContext(), "cust-1", "bad"),
        (err: any) => {
          assert.equal(err.statusCode, 404);
          return true;
        },
      );
    });

    it("deletes contact and records event", async () => {
      const contact = { id: "ct1", firstName: "Jane", lastName: "Doe", customerId: "cust-1" };
      prismaMock.contact.findFirst = mock.fn(() => Promise.resolve(contact));
      prismaMock.contact.delete = mock.fn(() => Promise.resolve({}));

      await deleteContact(makeOrgContext(), "cust-1", "ct1");

      assert.equal((prismaMock.contact.delete as ReturnType<typeof mock.fn>).mock.callCount(), 1);
      assert.equal(recordEventMock.mock.callCount(), 1);
      assert.equal(recordEventMock.mock.calls[0].arguments[0].metadata.name, "Jane Doe");
    });
  });
});
