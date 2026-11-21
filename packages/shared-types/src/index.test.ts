import { describe, it, expect } from "vitest";
import { UserRoleSchema, ParticipantRoleSchema } from "./index";

describe("shared-types schemas", () => {
  it("validates UserRoleSchema", () => {
    expect(UserRoleSchema.safeParse("teacher").success).toBe(true);
    expect(UserRoleSchema.safeParse("student").success).toBe(true);
    expect(UserRoleSchema.safeParse("invalid_role").success).toBe(false);
  });

  it("validates ParticipantRoleSchema", () => {
    expect(ParticipantRoleSchema.safeParse("teacher_host").success).toBe(true);
    expect(ParticipantRoleSchema.safeParse("guest_student").success).toBe(true);
    expect(ParticipantRoleSchema.safeParse("unknown").success).toBe(false);
  });
});
