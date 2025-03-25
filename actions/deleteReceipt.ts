'use server'

import convex from "@/lib/convexClient"
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export async function deleteReceipt(receiptId: string) {
    try {
        await convex.mutation(api.receipts.deleteReceipt, {
            id: receiptId as Id<'receipts'>
        })

        return {
            success: true
        }
    } catch (error) {
        console.error("Error deleting receipt:", error);
        return {
            success: false,
            error: "Failed to delete receipt"
        }
    }
}