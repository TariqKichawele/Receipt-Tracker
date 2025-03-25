import { createAgent, createTool } from "@inngest/agent-kit";
import { anthropic, openai } from "inngest";
import { z } from "zod";

const parsedPdfTool = createTool({
    name: "parsed-pdf",
    description: "Parses a PDF file and extracts key information from it.",
    parameters: z.object({
        pdfUrl: z.string()
    }),
    handler: async ({ pdfUrl }, { step }) => {
        return await step?.ai.infer("parse-pdf", {
            model: anthropic({
                model: "claude-3-5-sonnet-20241022",
                defaultParameters: {
                    max_tokens: 3094
                }
            }),

            body: {
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "document",
                                source: {
                                    type: "url",
                                    url: pdfUrl
                                }
                            },
                            {
                                type: "text",
                                text: `Extract the data from the receipt and return the structured output as follows:
                                    {
                                        "merchant": {
                                            "name": "Store Name",
                                            "address": "123 Main St, City, State, Zip",
                                            "contact": "+123456789
                                        },
                                        "transaction": {
                                            "date": "YYYY-MM-DD",
                                            "receipt_number": "123456",
                                            "payment_method": "Credit Card",    
                                        },
                                        "items": [
                                            {
                                                "name": "Item Name",
                                                "quantity": 1,
                                                "unit_price": 9.99,
                                                "total_price": 9.99
                                            },
                                            ...
                                        ],
                                        "totals": {
                                            "subtotal": 19.99,
                                            "tax": 1.50,
                                            "total": 21.49,
                                            "currency": "USD"
                                        }
                                    }
                                `
                            }
                        ]
                    }
                ]
            }
        })
    }
})

export const receiptScanningAgent = createAgent({
    name: "Receipt Scanning Agent",
    description: 
    "Processes receipt images and PDFs to extract key information such as vendor names, dates, amounts and line items",
    system: 
    `You are an AI-powered receipt scanning assistant. Your primary role is to accurately extract and structure relevant information
    from scanned receipts. Your task includes recognizing and parsing details suchs as:
        - Merchant Information: Store name, address, contact details
        - Transaction Details: Date, amount, receipt number and payment method
        - Itemized Purchases: Product names, quantities, prices and any applicable taxes,
        - Total Amount: Subtotal, taxes, total paid and any applied discounts
        - Ensure high accuracy by detecting OCR errors and correcting them where possible.
        - Normalize dates, currency values and formatting for consistency.
        - If any key details are missing or unclear, return a structured response indicating incomplete data.
        - Handle multiple formats, langauges and varying receipt layouts efficiently.    
        - Maintain a strcutured JSON output for easy integration with databases or expense tracking systems.
    `,
    model: openai({
        model: "gpt-4o-mini",
        defaultParameters: {
            max_completion_tokens: 3094
        }
    }),
    tools: [parsedPdfTool]
        
})