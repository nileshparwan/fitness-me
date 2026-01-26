import { InngestSchemas } from "@/types/inngest";
import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({
  id: "inngest-fitness-tracker",
  eventKey: "LDAFlr9r6japKAqQQabQCtCvvxnN_9Wzs6d_TxseMuahaf8DAwgxRY8_9FtIiNaOY5npnRJqzDxN8YJ00pa7SQxw",
  schemas: InngestSchemas,
  // logger
});