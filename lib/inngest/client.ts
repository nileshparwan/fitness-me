import { InngestSchemas } from "@/types/inngest";
import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({
  id: "inngest-fitness-tracker",
  eventKey: process.env.INNGEST_EVENT_KEY,
  schemas: InngestSchemas,
  // logger
});
