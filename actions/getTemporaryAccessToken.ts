'use server'

import { currentUser } from "@clerk/nextjs/server"
import { SchematicClient } from "@schematichq/schematic-typescript-node";

const apiKey = process.env.SCHEMATIC_API_KEY;

const client = new SchematicClient({ apiKey });

export async function getTemporaryAccessToken() {
    const user = await currentUser();

    if (!user) {
        console.log("No user found");
        return null;
    }

    const res = await client.accesstokens.issueTemporaryAccessToken({
        resourceType: "company",
        lookup: { id: user.id },
    });

    return res.data.token;
}
