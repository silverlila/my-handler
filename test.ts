import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { Container } from "./mod.js";

const mockContext = { organization: "Acme Corp", environment: "production" };

test("should validate user registration data", async () => {
  const container = new Container(mockContext);
  const handler = container
    .createHandler(
      z.object({
        username: z.string().min(3, "Username must be at least 3 characters"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        email: z.string().email("Invalid email format"),
      })
    )
    .execute(async (props) => {
      return `User ${props.input.username} registered successfully.`;
    });

  const result = await handler({
    username: "john_doe",
    password: "strongpassword123",
    email: "john.doe@example.com",
  });

  assert.equal(result.data, "User john_doe registered successfully.");
});

test("should handle missing input with schema validation errors", async () => {
  const container = new Container(mockContext);

  const handler = container
    .createHandler(
      z.object({
        title: z.string().nonempty("Title is required"),
        content: z.string().nonempty("Content is required"),
      })
    )
    .execute(async () => "This should not run.");

  const result = await handler({ title: "", content: "" });
  const error = result.error as any; // This needs to be refactored
  assert.equal(error.errors[0].message, "Title is required");
});
