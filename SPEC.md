I want to create a CLI tool for the ticketing and project management system Linear.app. Its purpose is to allow working with Linear via command-line while returning everything (except its usage example) as JSON.


## Communication with Linear

Linear offers a GraphQL API (see file `./Linear-API@current.graphql`). Read the following developer docs for examples:

- https://linear.app/developers/graphql
- https://linear.app/developers/pagination
- https://linear.app/developers/filtering
- https://linear.app/developers/rate-limiting
- https://linear.app/developers/deprecations
- https://linear.app/developers/webhooks
- https://linear.app/developers/attachments
- https://linear.app/developers/managing-customers


## Implementation scope

- Authentication via API token
  - passed in via ENV var "LINEAR_API_TOKEN", or `--api-token` flag value, or read from a plain-text token file at `$HOME/.linear_api_token`
- Working with projects
  - list existing projects
- Working with issues (tickets)
  - list
  - search
  - create

The CLI tool should be named `linear`, should use [Commander](https://github.com/tj/commander.js), and offer this structure:

- `linear` w/o arguments: shows usage info, lists tools
- `linear issues`: shows issues usage info, lists sub-tools
  - `linear issues list`: lists issues
  - `linear issues search`: searches issues
  - `linear issues create`: creates issue

The data returned by the methods should be returned to the user as-is.

I want the CLI tool to intelligently turn raw data into information and vice versa. For example, when the user enters a user-facing ticket/issue ID, like "ZCO-123" but the API requires an internal UUID, the lookup from the former to the latter should happen automatically. When the user creates a ticket with a label, the label should be the label title ("Refactoring", "Bug", "Enhancement" etc.) and not the label's internal ID. They might refer to a project by its name, etc.

Every action should be made as the user that is authenticated by the API token. When a team ID is required but not passed as an argument, figure out the most likely team ID by both the teams the user belongs to and the project the object (issue or comment etc.) belongs to.


## Example usage: `linear issues create`

Required flags:

- project OR project-id
- title
- project

Optional flags:

- description
- milestone OR milestone-id
- status
- labels OR label-ids
- parent-ticket (i.e., the user-facing ticket ID)

(`*-id` refers to the internal object ID.)
