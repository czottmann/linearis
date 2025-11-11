export function parseIssueIdentifier(identifier) {
    const parts = identifier.split("-");
    if (parts.length !== 2) {
        throw new Error(`Invalid issue identifier format: "${identifier}". Expected format: TEAM-123`);
    }
    const teamKey = parts[0];
    const issueNumber = parseInt(parts[1]);
    if (isNaN(issueNumber)) {
        throw new Error(`Invalid issue number in identifier: "${identifier}"`);
    }
    return { teamKey, issueNumber };
}
export function tryParseIssueIdentifier(identifier) {
    try {
        return parseIssueIdentifier(identifier);
    }
    catch {
        return null;
    }
}
