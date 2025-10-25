import { COMPLETE_ISSUE_FRAGMENT } from "./common.js";

export const GET_CYCLES_QUERY = `
  query GetCycles($first: Int!, $teamKey: String, $isActive: Boolean) {
    cycles(first: $first, filter: { and: [
      { team: { key: { eq: $teamKey } } }
      { isActive: { eq: $isActive } }
    ] }) {
      nodes {
        id
        name
        number
        startsAt
        endsAt
        isActive
        progress
        issueCountHistory
        issues(first: 100) {
          nodes {
            ${COMPLETE_ISSUE_FRAGMENT}
          }
        }
      }
    }
  }
`;

export const GET_CYCLE_BY_ID_QUERY = `
  query GetCycle($id: String!, $issuesFirst: Int) {
    cycle(id: $id) {
      id
      name
      number
      startsAt
      endsAt
      isActive
      progress
      issueCountHistory
      issues(first: $issuesFirst) {
        nodes {
          ${COMPLETE_ISSUE_FRAGMENT}
        }
      }
    }
  }
`;

export const FIND_CYCLE_BY_NAME_SCOPED = `
  query FindCycleByNameScoped($name: String!, $teamKey: String) {
    cycles(filter: { and: [ { name: { eq: $name } }, { team: { key: { eq: $teamKey } } } ] }, first: 10) {
      nodes { id name number startsAt isActive isNext isPrevious team { id key name } }
    }
  }
`;

export const FIND_CYCLE_BY_NAME_GLOBAL = `
  query FindCycleByNameGlobal($name: String!) {
    cycles(filter: { name: { eq: $name } }, first: 10) {
      nodes { id name number startsAt isActive isNext isPrevious team { id key name } }
    }
  }
`;
