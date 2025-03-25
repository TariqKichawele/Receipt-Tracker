import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    }
});

export const storeReceipt = mutation({
    args: {
        userId: v.string(),
        fileId: v.id("_storage"),
        fileName: v.string(),
        size: v.number(),
        mimeType: v.string(),
    },
    handler: async (ctx, args) => {
        const receiptId = await ctx.db.insert("receipts", {
            userId: args.userId,
            fileId: args.fileId,
            fileName: args.fileName,
            size: args.size,
            mimeType: args.mimeType,
            uploadedAt: Date.now(),
            status: "pending",

            // Fields for extracted data
            merchantName: undefined,
            merchantAddress: undefined,
            merchantContact: undefined,
            transactionDate: undefined,
            transactionAmount: undefined,
            currency: undefined,
            items: [],
        })

        return receiptId;
    }
})

export const getReceipts = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("receipts")
            .filter(q => q.eq(q.field("userId"), args.userId))
            .order("desc")
            .collect();
    }
})

export const getReceiptById = query({
    args: { id: v.id("receipts") },
    handler: async (ctx, args) => {
        const receipt = await ctx.db.get(args.id);

        if(receipt) {
            const identity = await ctx.auth.getUserIdentity();
            if (!identity) {
                throw new Error("Unauthorized");
            }

            const userId = identity.subject;
            if (receipt.userId !== userId) {
                throw new Error("Unauthorized, receipt does not belong to user");
            }
        };

        return receipt;
    }
})

export const getReceiptDownloadUrl = query({
    args: { fileId: v.id("_storage") },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.fileId);
    }
})

export const updateReceiptStatus = mutation({
    args: {
        id: v.id("receipts"),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        const receipt = await ctx.db.get(args.id);
        if (!receipt) {
            throw new Error("Receipt not found");
        }

        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthorized");
        }

        const userId = identity.subject;
        if (receipt.userId !== userId) {
            throw new Error("Unauthorized, receipt does not belong to user");
        }

        await ctx.db.patch(args.id, {
            status: args.status
        })

        return true;
    }
});

export const deleteReceipt = mutation({
    args: { id: v.id("receipts") },
    handler: async (ctx, args) => {
        const receipt = await ctx.db.get(args.id);
        if (!receipt) {
            throw new Error("Receipt not found");
        }

        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthorized");
        }

        const userId = identity.subject;
        if (receipt.userId !== userId) {
            throw new Error("Unauthorized, receipt does not belong to user");
        }

        await ctx.storage.delete(receipt.fileId);

        await ctx.db.delete(args.id);

        return true;
    }
});

export const updateReceiptWithExtractedData = mutation({
    args: {
        id: v.id("receipts"),
        fileDisplayName: v.string(),
        merchantName: v.string(),
        merchantAddress: v.string(),
        merchantContact: v.string(),
        transactionDate: v.string(),
        transactionAmount: v.number(),
        currency: v.string(),
        receiptSummary: v.string(),
        items: v.array(
            v.object({
                name: v.string(),
                quantity: v.number(),
                unitPrice: v.number(),
                totalPrice: v.number(),
            })
        )
    },
    handler: async (ctx, args) => {
        const receipt = await ctx.db.get(args.id);
        if (!receipt) {
            throw new Error("Receipt not found");
        }

        await ctx.db.patch(args.id, {
            fileDisplayName: args.fileDisplayName,
            merchantName: args.merchantName,
            merchantAddress: args.merchantAddress,
            merchantContact: args.merchantContact,
            transactionDate: args.transactionDate,
            transactionAmount: args.transactionAmount,
            currency: args.currency,
            receiptSummary: args.receiptSummary,
            items: args.items,
            status: "processed"
        });

        return {
            userId: receipt.userId,
        }
    }
})