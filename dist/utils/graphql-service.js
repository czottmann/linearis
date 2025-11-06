import { LinearClient } from "@linear/sdk";
import { getApiToken } from "./auth.js";
export class GraphQLService {
    graphQLClient;
    client;
    constructor(apiToken) {
        this.client = new LinearClient({
            apiKey: apiToken,
            headers: {
                "public-file-urls-expire-in": "3600",
            },
        });
        this.graphQLClient = this.client.client;
    }
    async rawRequest(query, variables) {
        try {
            const response = await this.graphQLClient.rawRequest(query, variables);
            return response.data;
        }
        catch (error) {
            if (error.response?.errors) {
                const graphQLError = error.response.errors[0];
                throw new Error(graphQLError.message || "GraphQL query failed");
            }
            throw new Error(`GraphQL request failed: ${error.message}`);
        }
    }
    async batchRequest(queries) {
        const promises = queries.map(({ name, query, variables }) => this.rawRequest(query, variables));
        return Promise.all(promises);
    }
    getLinearClient() {
        return this.client;
    }
}
export async function createGraphQLService(options) {
    const apiToken = await getApiToken(options);
    return new GraphQLService(apiToken);
}
