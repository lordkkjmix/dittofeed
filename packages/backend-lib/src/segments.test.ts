import { randomUUID } from "crypto";
import { unwrap } from "isomorphic-lib/src/resultHandling/resultUtils";

import { clickhouseClient } from "./clickhouse";
import { insert } from "./db";
import {
  segment as dbSegment,
  userProperty as dbUserProperty,
  workspace as dbWorkspace,
} from "./db/schema";
import {
  buildSegmentsFile,
  findAllSegmentAssignments,
  findRecentlyUpdatedUsersInSegment,
  insertSegmentAssignments,
  upsertSegment,
} from "./segments";
import {
  Segment,
  SegmentDefinition,
  SegmentNodeType,
  SegmentOperatorType,
  SegmentStatusEnum,
  TraitSegmentNode,
  UpsertSegmentValidationErrorType,
  UserProperty,
  UserPropertyDefinitionType,
  Workspace,
} from "./types";
import { insertUserPropertyAssignments } from "./userProperties";

describe("segments", () => {
  let workspace: Workspace;

  beforeEach(async () => {
    workspace = unwrap(
      await insert({
        table: dbWorkspace,
        values: {
          id: randomUUID(),
          name: `workspace-${randomUUID()}`,
          updatedAt: new Date(),
        },
      }),
    );
  });

  describe("buildSegmentsFile", () => {
    let userIdProperty: UserProperty;
    let emailProperty: UserProperty;
    let phoneProperty: UserProperty;
    let userId: string;

    beforeEach(async () => {
      userId = randomUUID();
      const segmentId = randomUUID();
      await Promise.all([
        insert({
          table: dbSegment,
          values: {
            id: segmentId,
            workspaceId: workspace.id,
            name: "test",
            updatedAt: new Date(),
            definition: {
              id: randomUUID(),
              type: SegmentNodeType.Trait,
              path: "name",
              operator: {
                type: SegmentOperatorType.Equals,
                value: "test",
              },
            } satisfies TraitSegmentNode,
          },
        }).then(unwrap),
        insertSegmentAssignments([
          {
            workspaceId: workspace.id,
            userId,
            segmentId,
            inSegment: true,
          },
        ]),
      ]);

      [userIdProperty, emailProperty, phoneProperty] = await Promise.all([
        insert({
          table: dbUserProperty,
          values: {
            id: randomUUID(),
            workspaceId: workspace.id,
            name: "id",
            updatedAt: new Date(),
            definition: {
              type: UserPropertyDefinitionType.Id,
            },
          },
        }).then(unwrap),
        insert({
          table: dbUserProperty,
          values: {
            id: randomUUID(),
            workspaceId: workspace.id,
            name: "email",
            updatedAt: new Date(),
            definition: {
              type: UserPropertyDefinitionType.Trait,
              path: "email",
            },
          },
        }).then(unwrap),
        insert({
          table: dbUserProperty,
          values: {
            id: randomUUID(),
            workspaceId: workspace.id,
            name: "phone",
            updatedAt: new Date(),
            definition: {
              type: UserPropertyDefinitionType.Trait,
              path: "phone",
            },
          },
        }).then(unwrap),
      ]);
    });

    describe("when the identifiers contain valid values", () => {
      beforeEach(async () => {
        await insertUserPropertyAssignments([
          {
            workspaceId: workspace.id,
            userId,
            userPropertyId: userIdProperty.id,
            value: "123",
          },
          {
            workspaceId: workspace.id,
            userId,
            userPropertyId: emailProperty.id,
            value: "test@test.com",
          },
          {
            userId,
            userPropertyId: phoneProperty.id,
            value: "1234567890",
            workspaceId: workspace.id,
          },
        ]);
      });

      it("generates a file name with its contents", async () => {
        const { fileName, fileContent } = await buildSegmentsFile({
          workspaceId: workspace.id,
        });
        expect(fileName).toBeDefined();
        expect(fileContent).toBeDefined();
        expect(fileContent.length).toBeGreaterThan(0);
      });
    });
  });

  describe("findAllSegmentAssignments", () => {
    let userId: string;
    let segment: Segment;

    beforeEach(async () => {
      userId = randomUUID();
      const segmentId = randomUUID();
      segment = await insert({
        table: dbSegment,
        values: {
          id: segmentId,
          workspaceId: workspace.id,
          name: "test",
          updatedAt: new Date(),
          definition: {
            id: randomUUID(),
            type: SegmentNodeType.Trait,
            path: "name",
            operator: {
              type: SegmentOperatorType.Equals,
              value: "test",
            },
          },
        },
      }).then(unwrap);

      await insertSegmentAssignments([
        {
          workspaceId: workspace.id,
          userId,
          segmentId,
          inSegment: true,
        },
        {
          workspaceId: workspace.id,
          userId: randomUUID(),
          segmentId,
          inSegment: false,
        },
      ]);
    });

    it("returns the segment assignments for the workspace", async () => {
      const assignments = await findAllSegmentAssignments({
        workspaceId: workspace.id,
        userId,
      });
      expect(assignments).toEqual({ [segment.name]: true });
    });
  });

  describe("findRecentlyUpdatedUsersInSegment", () => {
    let segmentId: string;

    beforeEach(async () => {
      segmentId = randomUUID();
      await clickhouseClient().insert({
        table: `computed_property_assignments_v2 (workspace_id, type, computed_property_id, user_id, segment_value, user_property_value, max_event_time, assigned_at)`,
        values: [
          {
            workspace_id: workspace.id,
            type: "segment",
            computed_property_id: segmentId,
            user_id: "1",
            segment_value: true,
            user_property_value: "",
            max_event_time: new Date().toISOString(),
            assigned_at: new Date().toISOString(),
          },
          {
            workspace_id: workspace.id,
            type: "segment",
            computed_property_id: randomUUID(),
            user_id: "2",
            segment_value: true,
            user_property_value: "",
            max_event_time: new Date().toISOString(),
            assigned_at: new Date().toISOString(),
          },
          {
            workspace_id: workspace.id,
            type: "segment",
            computed_property_id: segmentId,
            user_id: "3",
            segment_value: true,
            user_property_value: "",
            max_event_time: new Date(
              Date.now() - 1000 * 60 * 60 * 24 * 10,
            ).toISOString(),
            assigned_at: new Date(
              Date.now() - 1000 * 60 * 60 * 24 * 10,
            ).toISOString(),
          },
          {
            workspace_id: workspace.id,
            type: "segment",
            computed_property_id: segmentId,
            user_id: "4",
            segment_value: false,
            user_property_value: "",
            max_event_time: new Date().toISOString(),
            assigned_at: new Date().toISOString(),
          },
        ],
        format: "JSONEachRow",
        clickhouse_settings: { wait_end_of_query: 1 },
      });
    });

    it("returns the users that have been added to the segment recently", async () => {
      const users = await findRecentlyUpdatedUsersInSegment({
        workspaceId: workspace.id,
        segmentId,
        assignedSince: Date.now() - 5000,
        pageSize: 10,
      });
      expect(users).toEqual([{ userId: "1" }]);
    });
  });

  describe("upsertSegment", () => {
    describe("when a segment is renamed", () => {
      it("updates the segment name", async () => {
        const id = randomUUID();
        const definition = {
          entryNode: {
            id: randomUUID(),
            type: SegmentNodeType.Trait,
            path: "name",
            operator: {
              type: SegmentOperatorType.Equals,
              value: "test",
            },
          },
          nodes: [],
        } satisfies SegmentDefinition;
        const segment = unwrap(
          await upsertSegment({
            id,
            name: "test1",
            workspaceId: workspace.id,
            definition,
          }),
        );
        expect(segment.name).toBe("test1");
        const updatedSegment = unwrap(
          await upsertSegment({
            id,
            name: "test2",
            workspaceId: workspace.id,
            definition,
          }),
        );
        expect(updatedSegment.name).toBe("test2");
      });
    });
    describe("when a segment is created in a second workspace with a re-used id", () => {
      let secondWorkspace: Workspace;
      beforeEach(async () => {
        secondWorkspace = unwrap(
          await insert({
            table: dbWorkspace,
            values: {
              id: randomUUID(),
              name: randomUUID(),
              updatedAt: new Date(),
            },
          }),
        );
      });

      it("returns a unique constraint violation error", async () => {
        const id = randomUUID();
        const result = await upsertSegment({
          id,
          name: randomUUID(),
          workspaceId: workspace.id,
          definition: {
            entryNode: {
              id: randomUUID(),
              type: SegmentNodeType.Trait,
              path: "name",
              operator: {
                type: SegmentOperatorType.Equals,
                value: "test",
              },
            },
            nodes: [],
          } satisfies SegmentDefinition,
        });
        expect(result.isOk()).toBe(true);

        const secondResult = await upsertSegment({
          id,
          name: randomUUID(),
          workspaceId: secondWorkspace.id,
          definition: {
            entryNode: {
              id: randomUUID(),
              type: SegmentNodeType.Trait,
              path: "name",
              operator: {
                type: SegmentOperatorType.Equals,
                value: "test",
              },
            },
            nodes: [],
          } satisfies SegmentDefinition,
        });
        expect(secondResult.isErr() && secondResult.error.type).toEqual(
          UpsertSegmentValidationErrorType.UniqueConstraintViolation,
        );
      });
    });
  });
  describe("upsertSegment", () => {
    describe("when a manual segment is updated to a non-manual segment", () => {
      let segmentId: string;
      beforeEach(async () => {
        segmentId = randomUUID();
        unwrap(
          await upsertSegment({
            id: segmentId,
            name: "test",
            workspaceId: workspace.id,
            definition: {
              entryNode: {
                id: randomUUID(),
                type: SegmentNodeType.Manual,
                version: 1,
              },
              nodes: [],
            },
          }),
        );
      });
      it("it sets the status to running", async () => {
        const segment = unwrap(
          await upsertSegment({
            id: segmentId,
            name: "test",
            workspaceId: workspace.id,
            definition: {
              entryNode: {
                id: randomUUID(),
                type: SegmentNodeType.Trait,
                path: "name",
                operator: {
                  type: SegmentOperatorType.Equals,
                  value: "test",
                },
              },
              nodes: [],
            },
          }),
        );
        expect(segment.status).toBe(SegmentStatusEnum.Running);
      });
    });

    describe("when a non-manual segment is updated to a manual segment", () => {
      let segmentId: string;
      beforeEach(async () => {
        segmentId = randomUUID();
        unwrap(
          await upsertSegment({
            id: segmentId,
            name: "test",
            workspaceId: workspace.id,
            definition: {
              entryNode: {
                id: randomUUID(),
                type: SegmentNodeType.Trait,
                path: "name",
                operator: {
                  type: SegmentOperatorType.Equals,
                  value: "test",
                },
              },
              nodes: [],
            },
          }),
        );
      });
      it("it sets the status to not started", async () => {
        const segment = unwrap(
          await upsertSegment({
            id: segmentId,
            name: "test",
            workspaceId: workspace.id,
            definition: {
              entryNode: {
                id: randomUUID(),
                type: SegmentNodeType.Manual,
                version: 1,
              },
              nodes: [],
            },
          }),
        );
        expect(segment.status).toBe(SegmentStatusEnum.NotStarted);
      });
    });
  });
});
