import { createServerFn } from "@tanstack/react-start";
import { contactRequestSchema } from "./contact-request";

export const submitContactRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => contactRequestSchema.parse(input))
  .handler(async ({ data }) => {
    const { deliverContactRequest } = await import("./contact-request.server");
    return deliverContactRequest(data);
  });