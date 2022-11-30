import { AuContext } from "../types/types";

export const health = (ctx: AuContext): void => {
  const data = {
    status: "ok",
  };
  ctx.response.ok(data);
};
