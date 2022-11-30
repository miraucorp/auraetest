import { AuContext } from "../types/types";
import { isTestNet } from "../variables";

const allowedContactsForEndpoint = [
  "98e78311-62cf-43ca-8e98-caf812a75cdc", // pablo PRD
  "a4eeffd7-e1a5-4488-b456-c3cadd80384c", // andrew PRD
];

export const checkContact = async (ctx: AuContext, next: any) => {
  if (isTestNet) {
    return next();
  }
  const contactId = <string>ctx.request.header.contactid;
  if (!allowedContactsForEndpoint.includes(contactId)) {
    ctx.appCtx.log.error("limit order feature disabled for user");
    return ctx.response.forbidden(null, "request not allowed for contact");
  }
  return next();
};

export const disabled = async (ctx: AuContext) => {
  // TODO stopping G999 services
  ctx.appCtx.log.error("G999 services are disabled");
  return ctx.response.forbidden(null, "Request not allowed.");
};
