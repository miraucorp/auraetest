import { tracing } from "au-helpers";
import { AppCtx, Fee } from "../../types/types";
import { docClient } from "../../awsClient";
import { lsMembershipPlanTable, lsUserSubscriptionTable } from "../../variables";
import { newErrWithCode } from "../../utils";

const { TracedService } = tracing;

/**
 * Get all fees
 */
export async function getFees(appCtx: AppCtx, contactId: string): Promise<Fee[] | undefined> {
  const planId = await getLastActivePlanIdFromDDB(appCtx, contactId);
  return getPlanFeesFromDDB(appCtx, planId);
}

async function getLastActivePlanIdFromDDB(appCtx: AppCtx, contactId: string): Promise<string> {
  const response = await appCtx.traced(TracedService.DDB, `Fee::getPlanId`, async () => {
    return docClient
      .query({
        TableName: lsUserSubscriptionTable,
        IndexName: "contactId-index",
        KeyConditionExpression: "contactId = :contactId",
        FilterExpression: "statusText = :statusText",
        ExpressionAttributeValues: {
          ":contactId": contactId,
          ":statusText": "Active",
        },
      })
      .promise();
  });
  const subscriptions = response.Items;
  if (!subscriptions?.length) {
    throw newErrWithCode("no active plan found", 404);
  }
  return sortByCreatedAt(subscriptions)[0].planId;
}

async function getPlanFeesFromDDB(appCtx: AppCtx, planId: string): Promise<Fee[]> {
  const response = await appCtx.traced(TracedService.DDB, `Fee::getFee`, async () => {
    return docClient
      .get({
        TableName: lsMembershipPlanTable,
        Key: {
          id: planId,
        },
      })
      .promise();
  });
  return <Fee[]>response.Item?.fees || [];
}

function sortByCreatedAt(items: any) {
  return items.sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt));
}
