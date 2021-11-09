export default {
    type: "object",
    properties: {
        task: {
            type: "object",
            properties: {
                S: {
                    type: "string"
                }
            },
            additionalProperties: false,
            required: ["S"]
        },
        dueDate: {
            type: "object",
            properties: {
                S: {
                    type: "string"
                }
            },
            additionalProperties: false,
            required: ["S"]
        }
    },
    required: ["task", "dueDate"],
    additionalProperties: false
} as const;