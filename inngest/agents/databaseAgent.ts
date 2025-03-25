import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import convex from "@/lib/convexClient";
import { client } from "@/lib/schematic";
import { createAgent, createTool, openai } from "@inngest/agent-kit";
import { z } from "zod";

const saveToDatabaseTool = createTool({
    name: "save-to-database",
    description: "Saves the extracted data to the convex database.",
    parameters: z.object({
        fileDisplayName: z
            .string()
            .describe(
                "The readable display name of the receipt to show in the UI. If the file name is not human readable, use this field to provide a better name."
            ),
        receiptId: z.string().describe("The ID of the receipt in the database."),
        merchantName: z.string(),
        merchantAddress: z.string(),
        merchantContact: z.string(),
        transactionDate: z.string(),
        transactionAmount: z
            .number()
            .describe("The total amount of the transaction, including tax and tips."),
        receiptSummary: z
            .string()
            .describe(
                "A summary of the receipt, including the merchant name, address, contact, transaction date, and amount and currency. Include a human readable summary of the receipt. Mention both invoice number and receipt number if both are present. Include some key details about the items on the receipt, this is a special featured summary so it should include some key details about the items on the receipt with some context."
            ),
        currency: z.string(),
        items: z.array(
            z.object({
                name: z.string(),
                quantity: z.number(),
                unitPrice: z.number(),
                totalPrice: z.number(),
            })
            .describe(
                "An array of items on the receipt, including the name, quantity, unit price, and total price."
            )
        )
            
    }),
    handler: async (params, context) => {
        const {
            fileDisplayName,
            receiptId,
            merchantName,
            merchantAddress,
            merchantContact,
            transactionDate,
            transactionAmount,
            receiptSummary,
            currency,
            items
        } = params;

        const result = await context.step?.run("save-receipt-to-database", async () => {
            try {
                const { userId } = await convex.mutation(api.receipts.updateReceiptWithExtractedData, {
                    id: receiptId as Id<"receipts">,
                    fileDisplayName,
                    merchantName,
                    merchantAddress,
                    merchantContact,
                    transactionDate,
                    transactionAmount,
                    receiptSummary,
                    currency,
                    items
                })

                await client.track({
                    event: "scan",
                    company: {
                        id: userId,
                    },
                    user: {
                        id: userId,
                    }
                });

                return {
                    addedToDb: "Success",
                    receiptId,
                    fileDisplayName,
                    merchantName,
                    merchantAddress,
                    merchantContact,
                    transactionDate,
                    transactionAmount,
                    receiptSummary,
                    currency,
                    items
                }
            } catch (error) {
                return {
                    addedToDb: "Failed",
                    error: `Failed to save receipt to database: ${error instanceof Error ? error.message : "Unknown error"}`
                }
            }
        });

        if (result?.addedToDb === "Success") {
            context.network?.state.kv.set("saved-to-database", true);
            context.network?.state.kv.set("receipt", receiptId);
        }

        return result;
    }
})

export const databaseAgent = createAgent({
    name: "Database Agent",
    description: "Responsible for taking key information regarding receipts and saving it to the convex database.",
    system: "You are a helpful assistant that takes key information regarding receipts and saves it to the convex database.",
    model: openai({
        model: "gpt-4o-mini",
        defaultParameters: {
            max_completion_tokens: 1000
        }
    }),
    tools: [saveToDatabaseTool]
})