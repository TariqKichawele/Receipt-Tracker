'use server';

import { api } from "@/convex/_generated/api";
import convex from "@/lib/convexClient";
import { currentUser } from "@clerk/nextjs/server";
import { getFileDownloadUrl } from "./getFileDownloadUrl";


export async function uploadPDF(formData: FormData) {
    const user = await currentUser();

    if (!user) {
        return {
            success: false,
            error: "User not found"
        }
    }

    try {
        const file = formData.get("file") as File;
        if (!file) {
            return {
                success: false,
                error: "No file selected"
            }
        }

        if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
            return {
                success: false,
                error: "File must be a PDF"
            }
        }

        const uploadUrl = await convex.mutation(api.receipts.generateUploadUrl, {});

        const arrayBuffer = await file.arrayBuffer();

        const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                "Content-Type": file.type
            },
            body: new Uint8Array(arrayBuffer)
        });

        const { storageId } = await uploadResponse.json();

        const receiptId = await convex.mutation(api.receipts.storeReceipt, {
            userId: user.id,
            fileId: storageId,
            fileName: file.name,
            size: file.size,
            mimeType: file.type
        });

        const fileUrl = await getFileDownloadUrl(storageId);

        //TODO: Inngest  agent flow

        return {
            success: true,
            data: {
                receiptId,
                fileName: file.name,
            }
        }
    } catch (error) {
        console.error("Error uploading PDF:", error);
        return {
            success: false,
            error: "Error uploading PDF"
        }
    }
};