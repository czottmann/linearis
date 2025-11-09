export function notFoundError(entityType, identifier, context) {
    const contextStr = context ? ` ${context}` : "";
    return new Error(`${entityType} "${identifier}"${contextStr} not found`);
}
export function multipleMatchesError(entityType, identifier, matches, disambiguation) {
    const matchList = matches.join(", ");
    return new Error(`Multiple ${entityType}s found matching "${identifier}". ` +
        `Candidates: ${matchList}. ` +
        `Please ${disambiguation}.`);
}
export function invalidParameterError(parameter, reason) {
    return new Error(`Invalid ${parameter}: ${reason}`);
}
export function requiresParameterError(flag, requiredFlag) {
    return new Error(`${flag} requires ${requiredFlag} to be specified`);
}
